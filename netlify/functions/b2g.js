import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

let pdfPolyfillsReady = false;
const ensurePdfJsPolyfills = async () => {
  if (pdfPolyfillsReady) return;
  pdfPolyfillsReady = true;

  try {
    const canvasMod = await import('@napi-rs/canvas');
    const DOMMatrixCtor = canvasMod?.DOMMatrix || canvasMod?.default?.DOMMatrix;
    const ImageDataCtor = canvasMod?.ImageData || canvasMod?.default?.ImageData;
    const Path2DCtor = canvasMod?.Path2D || canvasMod?.default?.Path2D;

    if (typeof globalThis.DOMMatrix === 'undefined' && typeof DOMMatrixCtor === 'function') {
      globalThis.DOMMatrix = DOMMatrixCtor;
    }
    if (typeof globalThis.ImageData === 'undefined' && typeof ImageDataCtor === 'function') {
      globalThis.ImageData = ImageDataCtor;
    }
    if (typeof globalThis.Path2D === 'undefined' && typeof Path2DCtor === 'function') {
      globalThis.Path2D = Path2DCtor;
    }
  } catch {
    // optional: segue sem polyfill, com fallback local
  }
};

// pdf-parse é importado dinamicamente para evitar falha no carregamento.
// Suporta tanto a API nova (classe PDFParse) quanto a antiga (função default).
let pdfParseModule = undefined;
const getPdfParseModule = async () => {
  if (pdfParseModule !== undefined) return pdfParseModule;
  try {
    await ensurePdfJsPolyfills();
    pdfParseModule = await import('pdf-parse');
  } catch {
    pdfParseModule = null;
  }
  return pdfParseModule;
};

import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';

const ALLOWED_TYPES = new Set(['EDITAL', 'TERMO_REFERENCIA', 'ATA_REGISTRO_PRECOS', 'DOCUMENTACAO']);
const ALLOWED_STATUSES = new Set([
  'MONITORANDO',
  'ANALISE_EM_ANDAMENTO',
  'ANALISE_CONCLUIDA',
  'PROPOSTA_EM_PREPARACAO',
  'ENVIADA',
  'SUSPENSA',
  'ENCERRADA'
]);
const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const REPOSITORY_EXPIRING_THRESHOLD_DAYS = 30;

const REPOSITORY_DIR = path.join(os.tmpdir(), 'nexoscrm-b2g-repository');
const REPOSITORY_METADATA_FILE = path.join(REPOSITORY_DIR, 'documents.json');

const TYPE_LABELS = {
  EDITAL: 'Edital',
  TERMO_REFERENCIA: 'Termo de Referência',
  ATA_REGISTRO_PRECOS: 'Ata de Registro de Preços',
  DOCUMENTACAO: 'Documentação'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-company-id, x-user-id, x-user-role',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
};

const normalizeHeaderName = (name) => String(name || '').toLowerCase();

const getHeader = (headers = {}, targetName) => {
  const wanted = normalizeHeaderName(targetName);
  const entry = Object.entries(headers).find(([key]) => normalizeHeaderName(key) === wanted);
  return entry ? entry[1] : '';
};

const decodeBodyBuffer = (event) => {
  const rawBody = event.body || '';
  if (!rawBody) return Buffer.alloc(0);
  if (event.isBase64Encoded) {
    return Buffer.from(rawBody, 'base64');
  }
  return Buffer.from(rawBody, 'utf8');
};

const parseJsonBody = (event) => {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
};

const getRouteSegments = (eventPath = '', functionName = 'b2g') => {
  const candidates = [`/.netlify/functions/${functionName}`, `/api/${functionName}`];
  let normalized = String(eventPath || '');

  for (const prefix of candidates) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
      break;
    }
  }

  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized.split('/').filter(Boolean);
};

const cleanText = (value, max = 5000) => {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\u0000/g, ' ').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return text.slice(0, max);
};

const normalizeStateCode = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return null;
  return normalized.slice(0, 2);
};

const toFiniteNumber = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const MONTH_INDEX = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  abril: 4,
  abr: 4,
  maio: 5,
  mai: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12
};

const normalizePlainText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const isUnknownText = (value) => /^(nao identificado|nao informad[oa]|n\/a|na|nd|-|--)?$/.test(normalizePlainText(value));

const parseNormalizedDateParts = (dayRaw, monthRaw, yearRaw) => {
  const day = Number.parseInt(String(dayRaw || ''), 10);
  const month = Number.parseInt(String(monthRaw || ''), 10);
  let year = Number.parseInt(String(yearRaw || ''), 10);

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (year < 100) year += 2000;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2100) return null;

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const extractDateString = (value) => {
  const text = String(value || '');
  if (!text) return '';

  const br = text.match(/\b([0-3]?\d)[\/\-.]([0-1]?\d)[\/\-.](\d{2,4})\b/);
  if (br) {
    const parsed = parseNormalizedDateParts(br[1], br[2], br[3]);
    if (parsed) return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
  }

  const iso = text.match(/\b(20\d{2})[\/\-.]([0-1]?\d)[\/\-.]([0-3]?\d)\b/);
  if (iso) {
    const parsed = parseNormalizedDateParts(iso[3], iso[2], iso[1]);
    if (parsed) return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
  }

  const extenso = text.match(
    /\b([0-3]?\d)\s*(?:de\s+)?(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan\.?|fev\.?|mar\.?|abr\.?|mai\.?|jun\.?|jul\.?|ago\.?|set\.?|out\.?|nov\.?|dez\.?)\s*(?:de\s+)?(\d{2,4})\b/i
  );
  if (extenso) {
    const monthKey = normalizePlainText(extenso[2]).replace(/\.$/, '');
    const month = MONTH_INDEX[monthKey] || 0;
    const parsed = month ? parseNormalizedDateParts(extenso[1], month, extenso[3]) : null;
    if (parsed) return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
  }

  return '';
};

const extractTimeString = (value) => {
  const text = String(value || '');
  const hhmm = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmm) return `${String(hhmm[1]).padStart(2, '0')}:${hhmm[2]}`;

  const hh = text.match(/\b([01]?\d|2[0-3])h(?:\s*([0-5]\d))?\b/i);
  if (hh) return `${String(hh[1]).padStart(2, '0')}:${hh[2] || '00'}`;

  return '';
};

const splitNoticeLines = (text) =>
  String(text || '')
    .split(/\n+/)
    .map((line) => cleanText(line, 320))
    .filter((line) => line.length >= 4);

const extractDateByKeywords = (text, keywordPatterns = [], lookahead = 2) => {
  const lines = splitNoticeLines(text);
  if (!lines.length || !keywordPatterns.length) return '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!keywordPatterns.some((pattern) => pattern.test(line))) continue;
    const from = Math.max(0, i - 1);
    const to = Math.min(lines.length, i + lookahead + 1);
    const windowText = lines.slice(from, to).join(' ');
    const date = extractDateString(windowText);
    if (date) return date;
  }

  return '';
};

const extractTimeByKeywords = (text, keywordPatterns = [], lookahead = 2) => {
  const lines = splitNoticeLines(text);
  if (!lines.length || !keywordPatterns.length) return '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!keywordPatterns.some((pattern) => pattern.test(line))) continue;
    const from = Math.max(0, i - 1);
    const to = Math.min(lines.length, i + lookahead + 1);
    const windowText = lines.slice(from, to).join(' ');
    const hour = extractTimeString(windowText);
    if (hour) return hour;
  }

  return '';
};

const extractTextByKeywords = (text, keywordPatterns = [], lookahead = 2, max = 180) => {
  const lines = splitNoticeLines(text);
  if (!lines.length || !keywordPatterns.length) return '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!keywordPatterns.some((pattern) => pattern.test(line))) continue;
    const from = Math.max(0, i - 1);
    const to = Math.min(lines.length, i + lookahead + 1);
    const snippet = cleanText(lines.slice(from, to).join(' '), max);
    if (snippet) return snippet;
  }

  return '';
};

const sanitizeContractTerm = (primary, fallback = '') => {
  const first = cleanText(String(primary || ''), 180);
  const second = cleanText(String(fallback || ''), 180);

  let value = first || second || '';
  if (!value || isUnknownText(value)) return 'Não identificado';

  value = value.replace(
    /^(?:vig[êe]ncia(?:\s+contratual)?|prazo\s+de\s+vig[êe]ncia|prazo\s+contratual|dura[cç][aã]o\s+do\s+contrato)\s*[:\-]?\s*/i,
    ''
  );
  value = cleanText(value, 180);

  if (!value || value.length < 4 || /^[,.;:\-)\]]/.test(value)) return 'Não identificado';
  if (!/\d/.test(value) && !/\b(vig[êe]ncia|prazo|dura[cç][aã]o|mes(?:es)?|ano(?:s)?|dia(?:s)?|semanas?)\b/i.test(value)) {
    return 'Não identificado';
  }

  return value;
};

const parseDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  const text = String(value || '').trim();
  if (!text) return null;

  const normalizedDate = extractDateString(text);
  if (normalizedDate) {
    const [day, month, year] = normalizedDate.split('/');
    return parseNormalizedDateParts(day, month, year);
  }

  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const text = cleanText(String(value || ''), 5000);
    if (text) return text;
  }
  return '';
};

const safeFileSlug = (value, max = 80) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max) || 'arquivo';

const removeExtension = (filename) => String(filename || '').replace(/\.[^.]+$/, '');

const inferTypeFromMode = (mode) => (String(mode || '').toUpperCase() === 'TR' ? 'TERMO_REFERENCIA' : 'EDITAL');

const clampScore = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const scoreToRecommendation = (score) => {
  if (score >= 75) return 'GO';
  if (score >= 55) return 'GO_COM_RESSALVAS';
  return 'NO_GO';
};

const ensureArray = (value, max = 30) =>
  (Array.isArray(value) ? value : [])
    .map((item) => cleanText(String(item || ''), 400))
    .filter(Boolean)
    .slice(0, max);

const serializeChecklist = (items = [], max = 25) =>
  (Array.isArray(items) ? items : [])
    .map((item) => {
      if (typeof item === 'string') {
        return { item: cleanText(item, 280), status: 'PENDENTE', details: '' };
      }
      if (!item || typeof item !== 'object') return null;

      const title = cleanText(item.item || item.name || item.termRequirement || '', 280);
      if (!title) return null;

      const rawStatus = String(item.status || item.meetsRequirement || '').toUpperCase();
      const status =
        rawStatus === 'ATENDE' || rawStatus === 'OK' || rawStatus === 'CONCLUIDO'
          ? 'CONCLUIDO'
          : rawStatus === 'EM_ANDAMENTO' || rawStatus === 'IN_PROGRESS'
            ? 'EM_ANDAMENTO'
            : 'PENDENTE';

      return {
        item: title,
        status,
        details: cleanText(item.details || item.datasheetEvidence || item.rationale || '', 400)
      };
    })
    .filter(Boolean)
    .slice(0, max);

const textLines = (value, max = 30) =>
  cleanText(String(value || ''), 12000)
    .split(/\n+/)
    .map((line) => cleanText(line, 320))
    .filter((line) => line.length >= 8)
    .slice(0, max);

const summarizeNotice = (notice) => {
  const typeLabel = TYPE_LABELS[notice?.type] || 'Documento';
  const org = cleanText(notice?.organization || '', 220) || 'Órgão não identificado';
  const title = cleanText(notice?.title || '', 220) || 'Sem título';
  const objectDescription = cleanText(notice?.objectDescription || '', 450);
  const text = cleanText(notice?.documentText || '', 1500);

  const excerpt = objectDescription || text.slice(0, 280) || 'Resumo automático indisponível.';
  return `${typeLabel} "${title}" do órgão ${org}. ${excerpt}`.slice(0, 1200);
};

const isAdminLike = (user) => {
  const role = String(user?.actualRole || user?.role || '').toUpperCase();
  return role === 'MASTER' || role === 'ADMIN' || role === 'DIRECTOR';
};

const parseMultipartFormData = (event) => {
  const contentType = String(getHeader(event.headers, 'content-type') || '');
  const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
  if (!boundaryMatch) {
    throw new Error('Multipart inválido: boundary não encontrado.');
  }

  const boundary = boundaryMatch[1].trim().replace(/^"|"$/g, '');
  const delimiter = Buffer.from(`--${boundary}`);
  const body = decodeBodyBuffer(event);

  const fields = {};
  const files = {};

  let cursor = body.indexOf(delimiter);
  while (cursor !== -1) {
    cursor += delimiter.length;

    const marker = body.slice(cursor, cursor + 2).toString('utf8');
    if (marker === '--') break;
    if (marker === '\r\n') cursor += 2;

    const nextDelimiter = body.indexOf(delimiter, cursor);
    if (nextDelimiter === -1) break;

    let part = body.slice(cursor, nextDelimiter);
    if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
      part = part.slice(0, -2);
    }

    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) {
      cursor = nextDelimiter;
      continue;
    }

    const headerText = part.slice(0, headerEnd).toString('utf8');
    const content = part.slice(headerEnd + 4);

    const disposition = headerText.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || '';
    const name = disposition.match(/name="([^"]+)"/i)?.[1] || '';
    const filename = disposition.match(/filename="([^"]*)"/i)?.[1] || '';
    const contentTypePart = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1] || 'application/octet-stream';

    if (!name) {
      cursor = nextDelimiter;
      continue;
    }

    if (filename) {
      files[name] = {
        filename,
        contentType: cleanText(contentTypePart, 120) || 'application/octet-stream',
        size: content.length,
        buffer: content
      };
    } else {
      fields[name] = content.toString('utf8');
    }

    cursor = nextDelimiter;
  }

  return { fields, files };
};

const tryParseJsonObject = (raw) => {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    return null;
  }
  return null;
};

const extractPdfText = async (buffer) => {
  if (!buffer || buffer.length === 0) {
    return { text: '', numPages: 0 };
  }

  try {
    const mod = await getPdfParseModule();
    if (!mod) return { text: '', numPages: 0 };

    const ParserCtor = typeof mod?.PDFParse === 'function' ? mod.PDFParse : null;
    if (ParserCtor) {
      const parser = new ParserCtor({ data: buffer });
      try {
        const parsed = await parser.getText();
        const text = cleanText(parsed?.text || '', 120000);
        const pagesByArray = Array.isArray(parsed?.pages) ? parsed.pages.length : 0;
        const numPages = Number(parsed?.total || pagesByArray || 0);
        return { text, numPages: Number.isFinite(numPages) ? numPages : 0 };
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    }

    const legacyParseFn = typeof mod?.default === 'function' ? mod.default : null;
    if (!legacyParseFn) return { text: '', numPages: 0 };

    const parsed = await legacyParseFn(buffer);
    const text = cleanText(parsed?.text || '', 120000);
    const numPages = Number(parsed?.numpages || 0);
    return { text, numPages: Number.isFinite(numPages) ? numPages : 0 };
  } catch {
    return { text: '', numPages: 0 };
  }
};

const inferAgencyStateCode = (agency = '') => {
  const m = String(agency || '')
    .toUpperCase()
    .match(/(?:^|\s|\/|-)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)(?:$|\s|\/|-)/);
  return m?.[1] || null;
};

const extractEditalTemplateFromText = (text) => {
  const sourceText = cleanText(String(text || ''), 120000);
  if (!sourceText) return null;

  const openingKeywords = [/\babertura\b/i, /sess[aã]o\s+p[úu]blica/i, /data\s+da\s+sess[aã]o/i];
  const publicationKeywords = [/publica[cç][aã]o/i, /divulga[cç][aã]o/i, /disponibiliza[cç][aã]o/i, /\baviso\b/i];
  const impugnationKeywords = [/impugna[cç][aã]o/i, /prazo\s+.*impugna[cç][aã]o/i];
  const clarificationKeywords = [/esclarecimentos?/i, /pedido\s+.*esclarecimento/i];
  const proposalKeywords = [/prazo\s+.*propost/i, /(?:recebimento|envio|apresenta[cç][aã]o|entrega)\s+.*propost/i, /\bpropostas?\b/i];
  const contractTermKeywords = [/vig[êe]ncia/i, /prazo\s+contratual/i, /dura[cç][aã]o\s+do\s+contrato/i];

  const openingDate =
    extractDateString(sourceText.match(/(?:abertura(?:\s+da\s+sess[aã]o)?|sess[aã]o\s+p[úu]blica|data\s+da\s+sess[aã]o)\s*[:\-]?\s*([^\n]{4,100})/i)?.[1] || '') ||
    extractDateByKeywords(sourceText, openingKeywords, 2) ||
    '';
  const openingTime =
    extractTimeString(sourceText.match(/(?:abertura(?:\s+da\s+sess[aã]o)?|sess[aã]o\s+p[úu]blica|hora(?:\s+da\s+sess[aã]o)?)\s*[:\-]?\s*([^\n]{2,80})/i)?.[1] || '') ||
    extractTimeByKeywords(sourceText, openingKeywords, 2) ||
    '';
  const publicationDate =
    extractDateString(sourceText.match(/(?:publica[cç][aã]o|divulga[cç][aã]o|disponibiliza[cç][aã]o)\s*[:\-]?\s*([^\n]{4,120})/i)?.[1] || '') ||
    extractDateByKeywords(sourceText, publicationKeywords, 2) ||
    '';
  const impugnationDeadline =
    extractDateString(sourceText.match(/(?:impugna[cç][aã]o|prazo\s+para\s+impugna[cç][aã]o)\s*[:\-]?\s*([^\n]{4,140})/i)?.[1] || '') ||
    extractDateByKeywords(sourceText, impugnationKeywords, 2) ||
    '';
  const clarificationDeadline =
    extractDateString(sourceText.match(/(?:esclarecimentos?|prazo\s+para\s+esclarecimentos?)\s*[:\-]?\s*([^\n]{4,140})/i)?.[1] || '') ||
    extractDateByKeywords(sourceText, clarificationKeywords, 2) ||
    '';
  const proposalDeadline =
    extractDateString(sourceText.match(/(?:prazo(?:\s+final)?\s+para\s+(?:envio|apresenta[cç][aã]o|entrega)\s+de\s+propostas?|encerramento\s+de\s+propostas?|recebimento\s+das\s+propostas?)\s*[:\-]?\s*([^\n]{4,180})/i)?.[1] || '') ||
    extractDateByKeywords(sourceText, proposalKeywords, 3) ||
    '';

  const contractCapture =
    sourceText.match(/(?:vig[êe]ncia|prazo\s+de\s+vig[êe]ncia|prazo\s+contratual|dura[cç][aã]o\s+do\s+contrato)\s*[:\-]?\s*([^\n]{3,180})/i)?.[1] ||
    extractTextByKeywords(sourceText, contractTermKeywords, 2, 180) ||
    '';
  const contractTerm = sanitizeContractTerm(contractCapture);

  const hasAny =
    Boolean(openingDate) ||
    Boolean(openingTime) ||
    Boolean(publicationDate) ||
    Boolean(impugnationDeadline) ||
    Boolean(clarificationDeadline) ||
    Boolean(proposalDeadline) ||
    contractTerm !== 'Não identificado';

  if (!hasAny) return null;

  return {
    analysisType: 'edital',
    general: {
      openingDate: openingDate || 'Não identificado',
      openingTime: openingTime || 'Não identificado'
    },
    deadlines: {
      publicationDate: publicationDate || 'Não identificado',
      impugnationDeadline: impugnationDeadline || 'Não identificado',
      clarificationDeadline: clarificationDeadline || 'Não identificado',
      proposalDeadline: proposalDeadline || 'Não identificado',
      contractTerm
    }
  };
};

const normalizeDateField = (primary, fallback = '') => {
  const parsed = extractDateString(primary) || extractDateString(fallback);
  return parsed || 'Não identificado';
};

const normalizeTimeField = (primary, fallback = '') => {
  const parsed = extractTimeString(primary) || extractTimeString(fallback);
  return parsed || 'Não identificado';
};

const enrichTemplateAnalysisWithText = (templateData, text, mode) => {
  const modeUpper = String(mode || '').toUpperCase();
  if (modeUpper === 'TR') {
    return templateData && typeof templateData === 'object' ? templateData : null;
  }

  const extracted = extractEditalTemplateFromText(text);
  const hasTemplate = templateData && typeof templateData === 'object' && !Array.isArray(templateData);

  if (!hasTemplate && !extracted) return null;

  const base = hasTemplate ? { ...templateData } : { analysisType: 'edital' };
  const analysisType = String(base.analysisType || '').toLowerCase();
  if (analysisType === 'tr') return base;

  const baseGeneral = base.general && typeof base.general === 'object' ? { ...base.general } : {};
  const baseDeadlines = base.deadlines && typeof base.deadlines === 'object' ? { ...base.deadlines } : {};
  const extractedGeneral = extracted?.general || {};
  const extractedDeadlines = extracted?.deadlines || {};

  base.analysisType = 'edital';
  base.general = {
    ...baseGeneral,
    openingDate: normalizeDateField(baseGeneral.openingDate, extractedGeneral.openingDate),
    openingTime: normalizeTimeField(baseGeneral.openingTime, extractedGeneral.openingTime)
  };
  base.deadlines = {
    ...baseDeadlines,
    publicationDate: normalizeDateField(baseDeadlines.publicationDate, extractedDeadlines.publicationDate),
    impugnationDeadline: normalizeDateField(baseDeadlines.impugnationDeadline, extractedDeadlines.impugnationDeadline),
    clarificationDeadline: normalizeDateField(baseDeadlines.clarificationDeadline, extractedDeadlines.clarificationDeadline),
    proposalDeadline: normalizeDateField(baseDeadlines.proposalDeadline, extractedDeadlines.proposalDeadline),
    contractTerm: sanitizeContractTerm(baseDeadlines.contractTerm, extractedDeadlines.contractTerm)
  };

  return base;
};

const inferNoticeFromTemplateData = (templateData, mode, originalName) => {
  const baseTitle = cleanText(removeExtension(originalName), 220) || 'Documento B2G';
  const defaultType = inferTypeFromMode(mode);

  if (!templateData || typeof templateData !== 'object') {
    return {
      type: defaultType,
      title: baseTitle,
      organization: 'Órgão não identificado'
    };
  }

  const analysisType = String(templateData.analysisType || '').toLowerCase();

  if (analysisType === 'tr') {
    const summary = cleanText(templateData.trSummary || '', 1200);
    return {
      type: 'TERMO_REFERENCIA',
      title: baseTitle,
      organization: 'Órgão não identificado',
      objectDescription: summary,
      summary
    };
  }

  const general = templateData.general && typeof templateData.general === 'object' ? templateData.general : {};
  const deadlines = templateData.deadlines && typeof templateData.deadlines === 'object' ? templateData.deadlines : {};

  const agency = cleanText(general.agency || '', 220) || 'Órgão não identificado';
  const openingDate = parseDate(general.openingDate);
  const proposalDate = parseDate(deadlines.proposalDeadline);

  return {
    type: defaultType,
    title: baseTitle,
    organization: agency,
    stateCode: normalizeStateCode(inferAgencyStateCode(agency)),
    modality: cleanText(general.modality || '', 120) || null,
    objectDescription: cleanText(general.objectSummary || '', 1200) || null,
    openingDate,
    proposalDueDate: proposalDate,
    sourceUrl: cleanText(general.portal || '', 255) || null
  };
};

const buildAnalysisFromTemplateData = (normalizedData, notice, instruction = '') => {
  // Garantir que usamos templateExtractedData se existir
  const templateData = normalizedData?.templateExtractedData || normalizedData;
  const analysisType = String(templateData?.analysisType || '').toLowerCase();

  if (analysisType === 'tr') {
    const technicalNotebook = Array.isArray(templateData.technicalNotebook)
      ? templateData.technicalNotebook
          .map((row) => ({
            termRequirement: cleanText(row?.termRequirement || '', 260),
            meetsRequirement: String(row?.meetsRequirement || '').toUpperCase() === 'ATENDE' ? 'ATENDE' : 'NAO_ATENDE',
            datasheetEvidence: cleanText(row?.datasheetEvidence || '', 340),
            rationale: cleanText(row?.rationale || '', 340)
          }))
          .filter((row) => row.termRequirement)
          .slice(0, 20)
      : [];

    const termRequirements = ensureArray(templateData.termRequirements, 24);
    const requirementsPool = termRequirements.length ? termRequirements : technicalNotebook.map((item) => item.termRequirement);

    const metRequirements = technicalNotebook.filter((item) => item.meetsRequirement === 'ATENDE').length;
    const totalRequirements = technicalNotebook.length || requirementsPool.length || 1;
    const score = clampScore((metRequirements / totalRequirements) * 100);

    const risks = technicalNotebook
      .filter((item) => item.meetsRequirement !== 'ATENDE')
      .map((item) => item.termRequirement)
      .slice(0, 12);

    const checklist = serializeChecklist(
      technicalNotebook.length
        ? technicalNotebook.map((item) => ({
            item: item.termRequirement,
            status: item.meetsRequirement === 'ATENDE' ? 'CONCLUIDO' : 'PENDENTE',
            details: item.datasheetEvidence || item.rationale
          }))
        : requirementsPool
    );

    return {
      provider: 'template-ai-analysis',
      generatedAt: new Date().toISOString(),
      recomendacao: scoreToRecommendation(score),
      scoreAderencia: score,
      resumoExecutivo:
        cleanText(templateData.trSummary || '', 3500) ||
        summarizeNotice(notice) ||
        'Análise de TR concluída automaticamente.',
      pontosChave: requirementsPool.slice(0, 12),
      riscos: risks.length ? risks : ['Revisar requisitos com potencial não atendimento.'],
      oportunidades: [
        'Validar evidências técnicas com o fabricante.',
        'Consolidar matriz de aderência antes do envio da proposta.',
        'Mapear gaps técnicos e alternativas de atendimento.'
      ],
      proximasAcoes: [
        'Revisar caderno técnico com equipe de pré-vendas.',
        'Confirmar requisitos críticos com o órgão demandante.',
        'Planejar documentação de habilitação e compliance.'
      ],
      checklistDocumentacao: checklist,
      templateExtractedData: templateData,
      instruction: cleanText(instruction, 1200) || null
    };
  }

  const general = templateData?.general && typeof templateData.general === 'object' ? templateData.general : {};
  const requirements =
    templateData?.requirements && typeof templateData.requirements === 'object' ? templateData.requirements : {};
  const legal = ensureArray(requirements.legal, 12);
  const technical = ensureArray(requirements.technical, 12);
  const economic = ensureArray(requirements.economic, 12);
  const fiscal = ensureArray(requirements.fiscal, 12);

  const checklist = serializeChecklist([
    ...legal.map((item) => ({ item, details: 'Categoria: Jurídico' })),
    ...technical.map((item) => ({ item, details: 'Categoria: Técnico' })),
    ...economic.map((item) => ({ item, details: 'Categoria: Econômico' })),
    ...fiscal.map((item) => ({ item, details: 'Categoria: Fiscal' }))
  ]);

  const risks = ensureArray(templateData.risks, 12);
  const keyPoints = [
    cleanText(general.objectSummary || '', 360),
    ...technical.slice(0, 6),
    ...fiscal.slice(0, 4)
  ].filter(Boolean);

  const scoreBase = 55 + Math.min(25, technical.length * 2 + fiscal.length);
  const score = clampScore(scoreBase);

  return {
    provider: 'template-ai-analysis',
    generatedAt: new Date().toISOString(),
    recomendacao: scoreToRecommendation(score),
    scoreAderencia: score,
    resumoExecutivo:
      cleanText(general.objectSummary || '', 3500) ||
      cleanText(templateData?.summary || '', 3500) ||
      summarizeNotice(notice) ||
      'Análise de edital concluída automaticamente.',
    pontosChave: keyPoints.slice(0, 12),
    riscos: risks.length ? risks : ['Validar requisitos técnicos e fiscais críticos antes do envio da proposta.'],
    oportunidades: [
      'Estruturar plano de resposta com base nos requisitos extraídos.',
      'Revisar checklist de habilitação e certidões.',
      'Alinhar estratégia comercial para etapas da licitação.'
    ],
    proximasAcoes: [
      'Conferir prazos de proposta e impugnação.',
      'Consolidar documentação obrigatória.',
      'Validar aderência técnica com o time responsável.'
    ],
    checklistDocumentacao: checklist,
    templateExtractedData: templateData,
    instruction: cleanText(instruction, 1200) || null
  };
};

const buildHeuristicAnalysis = (notice, instruction = '', templateData = null) => {
  const baseText = firstNonEmpty(notice?.documentText, notice?.objectDescription, notice?.summary, 'Documento sem conteúdo textual.');
  const lines = textLines(baseText, 30);

  const score = clampScore(
    45 +
      (notice?.organization ? 8 : 0) +
      (notice?.modality ? 8 : 0) +
      (notice?.proposalDueDate ? 6 : 0) +
      (notice?.estimatedValue ? 6 : 0) +
      (lines.length >= 8 ? 10 : 0)
  );

  const risks = [];
  const lower = baseText.toLowerCase();
  if (lower.includes('multa')) risks.push('Cláusulas de multa e penalidade exigem revisão jurídica.');
  if (lower.includes('garantia')) risks.push('Garantias contratuais podem impactar custo e fluxo de caixa.');
  if (lower.includes('atestado') || lower.includes('qualificação técnica')) {
    risks.push('Exigências de qualificação técnica podem restringir participação.');
  }
  if (!notice?.proposalDueDate) risks.push('Prazo final de proposta não identificado automaticamente.');
  if (risks.length === 0) risks.push('Monitorar retificações e comunicados oficiais da licitação.');

  const keyPoints = lines.slice(0, 10);

  const checklist = serializeChecklist(
    Array.isArray(notice?.documentation) && notice.documentation.length > 0
      ? notice.documentation
      : [
          { item: 'Validar habilitação jurídica', details: 'Conferir documentos societários.' },
          { item: 'Validar regularidade fiscal', details: 'Conferir certidões federais, estaduais e municipais.' },
          { item: 'Validar qualificação técnica', details: 'Conferir atestados e comprovações técnicas.' }
        ]
  );

  return {
    provider: 'heuristic-ai-analysis',
    generatedAt: new Date().toISOString(),
    recomendacao: scoreToRecommendation(score),
    scoreAderencia: score,
    resumoExecutivo: summarizeNotice(notice),
    pontosChave: keyPoints,
    riscos: risks,
    oportunidades: [
      'Estruturar proposta com foco em critérios técnicos de maior peso.',
      'Antecipar conferência documental para reduzir risco de inabilitação.',
      'Alinhar time comercial e técnico para resposta completa.'
    ],
    proximasAcoes: [
      'Revisar edital/TR e anexos com checklist completo.',
      'Confirmar cronograma interno de entrega da proposta.',
      'Executar validação final de compliance antes do protocolo.'
    ],
    checklistDocumentacao: checklist,
    ...(templateData && typeof templateData === 'object' && !Array.isArray(templateData)
      ? { templateExtractedData: templateData }
      : {}),
    instruction: cleanText(instruction, 1200) || null
  };
};

const normalizeNoticePayload = (rawBody, { partial = false } = {}) => {
  const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
  const payload = {};

  const assignText = (key, max = 5000) => {
    if (!Object.prototype.hasOwnProperty.call(body, key)) return;
    const value = body[key];
    if (value === null || value === undefined || value === '') {
      payload[key] = null;
      return;
    }
    payload[key] = cleanText(String(value), max) || null;
  };

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'type')) {
    const type = cleanText(String(body.type || ''), 60).toUpperCase();
    payload.type = ALLOWED_TYPES.has(type) ? type : inferTypeFromMode(type);
  }

  assignText('title', 220);
  assignText('referenceCode', 120);
  assignText('organization', 220);

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'stateCode')) {
    payload.stateCode = normalizeStateCode(body.stateCode);
  }

  assignText('modality', 140);
  assignText('objectDescription', 8000);

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'estimatedValue')) {
    if (body.estimatedValue === null || body.estimatedValue === '' || body.estimatedValue === undefined) {
      payload.estimatedValue = null;
    } else {
      payload.estimatedValue = toFiniteNumber(body.estimatedValue, null);
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'openingDate')) {
    payload.openingDate = parseDate(body.openingDate);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'proposalDueDate')) {
    payload.proposalDueDate = parseDate(body.proposalDueDate);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'status')) {
    const status = cleanText(String(body.status || ''), 80).toUpperCase();
    payload.status = ALLOWED_STATUSES.has(status) ? status : 'MONITORANDO';
  }

  assignText('sourceUrl', 280);
  assignText('documentText', 120000);
  assignText('summary', 5000);

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'aiAnalysis')) {
    const aiAnalysis = body.aiAnalysis;
    payload.aiAnalysis = aiAnalysis && typeof aiAnalysis === 'object' && !Array.isArray(aiAnalysis) ? aiAnalysis : null;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'documentation')) {
    payload.documentation = Array.isArray(body.documentation) ? body.documentation : [];
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'tags')) {
    payload.tags = ensureArray(body.tags, 40);
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
};

const createHistory = async (prisma, { noticeId, eventType, title, details = null, payload = null, createdByName = null }) => {
  return prisma.bidNoticeHistory.create({
    data: {
      noticeId,
      eventType,
      title,
      details,
      payload,
      createdByName
    }
  });
};

const ensureRepositoryStorage = () => {
  if (!fs.existsSync(REPOSITORY_DIR)) {
    fs.mkdirSync(REPOSITORY_DIR, { recursive: true });
  }
};

const readRepositoryDocuments = () => {
  ensureRepositoryStorage();

  if (!fs.existsSync(REPOSITORY_METADATA_FILE)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(REPOSITORY_METADATA_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : [];
  } catch {
    return [];
  }
};

const writeRepositoryDocuments = (rows) => {
  ensureRepositoryStorage();
  fs.writeFileSync(REPOSITORY_METADATA_FILE, JSON.stringify(rows, null, 2), 'utf8');
};

const getDocumentValidity = (expirationDate) => {
  const date = parseDate(expirationDate);
  if (!date) {
    return { status: 'VALID', label: 'Válido', remainingDays: null };
  }

  const remainingDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (remainingDays < 0) {
    return { status: 'EXPIRED', label: 'Expirado', remainingDays };
  }

  if (remainingDays <= REPOSITORY_EXPIRING_THRESHOLD_DAYS) {
    return { status: 'EXPIRING', label: 'Expirando', remainingDays };
  }

  return { status: 'VALID', label: 'Válido', remainingDays };
};

const serializeRepositoryDocument = (item) => ({
  id: item.id,
  name: item.name,
  category: item.category || 'Geral',
  filename: item.filename,
  originalName: item.originalName,
  mimeType: item.mimeType,
  size: Number(item.size || 0),
  expirationDate: item.expirationDate || null,
  createdByName: item.createdByName || null,
  createdAt: item.createdAt || null,
  updatedAt: item.updatedAt || null,
  validity: getDocumentValidity(item.expirationDate)
});

const binaryResponse = (buffer, contentType, disposition, statusCode = 200) => ({
  statusCode,
  isBase64Encoded: true,
  headers: {
    ...CORS_HEADERS,
    'Content-Type': contentType,
    'Content-Disposition': disposition
  },
  body: buffer.toString('base64')
});

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    ...CORS_HEADERS,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const listNotices = async (prisma, qs = {}) => {
  const where = {};

  const status = cleanText(String(qs.status || ''), 60).toUpperCase();
  if (ALLOWED_STATUSES.has(status)) {
    where.status = status;
  }

  const type = cleanText(String(qs.type || ''), 60).toUpperCase();
  if (ALLOWED_TYPES.has(type)) {
    where.type = type;
  }

  const organization = cleanText(String(qs.organization || ''), 220);
  if (organization) {
    where.organization = { contains: organization, mode: 'insensitive' };
  }

  const stateCode = normalizeStateCode(qs.stateCode || qs.uf || '');
  if (stateCode) {
    where.stateCode = stateCode;
  }

  const modality = cleanText(String(qs.modality || ''), 120);
  if (modality) {
    where.modality = { contains: modality, mode: 'insensitive' };
  }

  const search = cleanText(String(qs.search || ''), 140);
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { organization: { contains: search, mode: 'insensitive' } },
      { stateCode: { contains: search, mode: 'insensitive' } },
      { modality: { contains: search, mode: 'insensitive' } },
      { referenceCode: { contains: search, mode: 'insensitive' } },
      { objectDescription: { contains: search, mode: 'insensitive' } }
    ];
  }

  return prisma.bidNotice.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }]
  });
};

const handleDocumentRoutes = async ({ event, user }) => {
  const method = event.httpMethod;
  const segments = getRouteSegments(event.path, 'b2g');
  const repoSegments = segments.slice(1);

  if (method === 'GET' && repoSegments.length === 0) {
    const qs = event.queryStringParameters || {};
    const search = cleanText(String(qs.search || ''), 140).toLowerCase();
    const statusFilter = cleanText(String(qs.status || ''), 60).toUpperCase();

    const rows = readRepositoryDocuments()
      .map((item) => serializeRepositoryDocument(item))
      .filter((item) => {
        if (search) {
          const haystack = [item.name, item.category, item.originalName, item.createdByName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(search)) return false;
        }

        if (statusFilter && item.validity?.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));

    return success(rows);
  }

  if (method === 'GET' && repoSegments.length === 1 && repoSegments[0] === 'export-kit') {
    const rows = readRepositoryDocuments()
      .map((item) => ({ ...serializeRepositoryDocument(item), validity: getDocumentValidity(item.expirationDate) }))
      .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));

    const escapeCsv = (value) => {
      const text = String(value ?? '');
      return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const headers = ['Nome', 'Categoria', 'Arquivo', 'Validade', 'Status', 'Criado em', 'Responsável'];
    const lines = [headers.join(';')];

    rows.forEach((doc) => {
      lines.push(
        [
          doc.name,
          doc.category || '-',
          doc.originalName,
          doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString('pt-BR') : '-',
          doc.validity?.label || '-',
          doc.createdAt ? new Date(doc.createdAt).toLocaleString('pt-BR') : '-',
          doc.createdByName || '-'
        ]
          .map(escapeCsv)
          .join(';')
      );
    });

    const csv = `\uFEFF${lines.join('\n')}`;
    const suffix = new Date().toISOString().slice(0, 10);
    return binaryResponse(
      Buffer.from(csv, 'utf8'),
      'text/csv; charset=utf-8',
      `attachment; filename="kit-documentacao-b2g-${suffix}.csv"`
    );
  }

  if (method === 'POST' && repoSegments.length === 1 && repoSegments[0] === 'upload') {
    const { fields, files } = parseMultipartFormData(event);
    const file = files.file;

    if (!file) {
      return error('Selecione um arquivo PDF, DOC ou DOCX.', 400);
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return error('Arquivo excede o limite de 20MB.', 400);
    }

    const ext = path.extname(file.filename || '').toLowerCase();
    const allowedExt = new Set(['.pdf', '.doc', '.docx']);
    const mime = String(file.contentType || '').toLowerCase();
    const allowedMime =
      mime.includes('pdf') ||
      mime.includes('msword') ||
      mime.includes('officedocument.wordprocessingml.document');

    if (!allowedExt.has(ext) && !allowedMime) {
      return error('Formato inválido. Use PDF, DOC ou DOCX.', 400);
    }

    const expirationDateRaw = cleanText(fields.expirationDate || '', 60);
    const expirationDate = expirationDateRaw ? parseDate(expirationDateRaw) : null;
    if (expirationDateRaw && !expirationDate) {
      return error('Data de validade inválida.', 400);
    }

    const id = randomUUID();
    ensureRepositoryStorage();

    const storedFilename = `${id}-${safeFileSlug(removeExtension(file.filename), 100)}${ext || ''}`;
    const storedPath = path.join(REPOSITORY_DIR, storedFilename);
    fs.writeFileSync(storedPath, file.buffer);

    const now = new Date().toISOString();
    const docs = readRepositoryDocuments();
    const row = {
      id,
      name: cleanText(fields.name || removeExtension(file.filename), 220) || `Documento ${id.slice(0, 8)}`,
      category: cleanText(fields.category || 'Geral', 120) || 'Geral',
      filename: storedFilename,
      originalName: cleanText(file.filename, 220) || storedFilename,
      mimeType: cleanText(file.contentType, 140) || 'application/octet-stream',
      size: Number(file.size || 0),
      path: storedPath,
      expirationDate: expirationDate ? expirationDate.toISOString() : null,
      createdByName: user?.name || null,
      createdAt: now,
      updatedAt: now
    };

    docs.push(row);
    writeRepositoryDocuments(docs);

    return success(serializeRepositoryDocument(row), 201);
  }

  if (method === 'GET' && repoSegments.length === 2 && (repoSegments[1] === 'view' || repoSegments[1] === 'download')) {
    const [id, action] = repoSegments;
    const doc = readRepositoryDocuments().find((item) => item.id === id);
    if (!doc) {
      return error('Documento não encontrado.', 404);
    }

    const filePath = doc.path || path.join(REPOSITORY_DIR, doc.filename || '');
    if (!filePath || !fs.existsSync(filePath)) {
      return error('Arquivo não encontrado no servidor.', 404);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const dispositionType = action === 'download' ? 'attachment' : 'inline';
    return binaryResponse(
      fileBuffer,
      doc.mimeType || 'application/octet-stream',
      `${dispositionType}; filename="${doc.originalName || doc.filename || `documento-${doc.id}`}"`
    );
  }

  if (method === 'DELETE' && repoSegments.length === 1) {
    const [id] = repoSegments;
    const docs = readRepositoryDocuments();
    const existing = docs.find((item) => item.id === id);
    if (!existing) {
      return error('Documento não encontrado.', 404);
    }

    const filePath = existing.path || path.join(REPOSITORY_DIR, existing.filename || '');
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const next = docs.filter((item) => item.id !== id);
    writeRepositoryDocuments(next);

    return success({ success: true, id });
  }

  return error('Rota de documentação B2G não encontrada.', 404);
};

const handleConvertToOpportunity = async ({ prisma, notice, user }) => {
  const ownerId = user?.id || user?.userId;
  if (!ownerId) {
    return error('Usuário inválido para conversão.', 400);
  }

  const getModelFields = (modelName) => {
    const runtimeFields = prisma?._runtimeDataModel?.models?.[modelName]?.fields;
    if (Array.isArray(runtimeFields)) return new Set(runtimeFields.map((field) => field.name));

    const dmmfFields = prisma?._dmmf?.modelMap?.[modelName]?.fields;
    if (Array.isArray(dmmfFields)) return new Set(dmmfFields.map((field) => field.name));

    return new Set();
  };

  const hasField = (modelName, fieldName) => {
    const fields = getModelFields(modelName);
    return fields.size === 0 || fields.has(fieldName);
  };

  const organizationName = cleanText(notice.organization, 220) || `Órgão B2G ${notice.id.slice(0, 8)}`;
  let company = await prisma.company.findFirst({
    where: { name: { equals: organizationName, mode: 'insensitive' } }
  });

  let createdCompany = false;
  if (!company) {
    const companyData = {
      name: organizationName,
      segment: 'B2G GOVERNO',
      status: 'PROSPECT',
      state: notice.stateCode || null
    };
    if (hasField('Company', 'clientType')) {
      companyData.clientType = 'B2G';
    }

    company = await prisma.company.create({
      data: companyData
    });
    createdCompany = true;
  }

  const ai = notice?.aiAnalysis || {};
  const templateData = ai?.templateExtractedData || {};
  const general = templateData?.general || {};
  const deadlines = templateData?.deadlines || {};
  const financial = templateData?.financial || {};

  const recommendation = String(ai.recomendacao || '').toUpperCase();
  const suggestedScore = Number(ai.scoreAderencia || 55);
  const probability = Math.max(15, Math.min(95, Math.round(Number.isFinite(suggestedScore) ? suggestedScore : 55)));
  const b2gStage = recommendation === 'NO_GO' ? 'NO_GO' : 'ANALISE';
  const stage = recommendation === 'NO_GO' ? 'LOST' : 'DIAGNOSIS';

  const title = cleanText([notice.referenceCode, notice.title].filter(Boolean).join(' - '), 220) ||
    `Oportunidade B2G ${notice.id.slice(0, 8)}`;

  // Montar descrição rica com todos os dados da análise
  const riscos = Array.isArray(ai.riscos) ? ai.riscos : [];
  const checklist = Array.isArray(ai.checklistDocumentacao) ? ai.checklistDocumentacao : [];
  const pontosChave = Array.isArray(ai.pontosChave) ? ai.pontosChave : [];
  const proximasAcoes = Array.isArray(ai.proximasAcoes) ? ai.proximasAcoes : [];

  // Estrutura completa salva em description como JSON para o frontend usar
  const b2gData = {
    // Identificação
    numeroEdital: notice.referenceCode || '',
    uasgId: general.uasgId || general.uasg || '',
    orgaoEntidade: organizationName,
    esfera: general.esfera || general.sphere || '',
    ufCidade: [notice.stateCode, general.city].filter(Boolean).join('/') || '',
    modalidade: notice.modality || general.modality || '',
    tipo: general.tipo || general.type || '',
    portal: general.portal || '',
    objetoResumido: cleanText(notice.objectDescription || general.objectSummary || '', 500),
    objetoDetalhado: cleanText(ai.resumoExecutivo || notice.summary || '', 3000),
    categoria: general.category || 'Geral',
    // Financeiro
    valorEstimadoMensal: Number(financial.monthlyValue || 0),
    valorEstimadoTotal: Number(notice.estimatedValue || financial.totalValue || 0),
    valorEstimadoPontual: Number(financial.punctualValue || 0),
    valorMaxAceitavel: Number(financial.maxAcceptableValue || 0),
    margemEstimada: Number(financial.margin || 0),
    ticketEsperado: Number(financial.expectedTicket || 0),
    tipoContrato: financial.contractType || 'Outro',
    prazoContratual: Number(financial.contractDuration || deadlines.contractDuration || 0),
    garantia: Number(financial.guarantee || 0),
    possuiReajuste: Boolean(financial.hasReadjustment),
    // Prazos
    dataPublicacao: notice.openingDate ? new Date(notice.openingDate).toISOString().split('T')[0] : '',
    dataAbertura: deadlines.openingDate || (notice.openingDate ? new Date(notice.openingDate).toISOString().split('T')[0] : ''),
    prazoImpugnacao: deadlines.impugnationDeadline || '',
    envioPropostas: deadlines.proposalDeadline || (notice.proposalDueDate ? new Date(notice.proposalDueDate).toISOString().split('T')[0] : ''),
    validadeEstimada: deadlines.validityDate || '',
    faseAtual: b2gStage === 'NO_GO' ? 'no_go' : 'analise',
    // Estratégia
    decisao: recommendation === 'NO_GO' ? 'NO_GO' : recommendation === 'GO' ? 'GO' : 'GO_COM_RESSALVAS',
    probabilidadeGanho: probability,
    nivelConcorrencia: ai.nivelConcorrencia || 'Médio',
    // Documentos
    checklistDocumentacao: checklist,
    linkBriefing: notice.sourceUrl || '',
    // Risco
    riscos: riscos,
    pontosChave: pontosChave,
    proximasAcoes: proximasAcoes,
    observacoesJuridicas: riscos.join('\n'),
    grauRisco: suggestedScore < 40 ? 'Alto' : suggestedScore < 65 ? 'Médio' : 'Baixo',
    tipoJulgamento: general.judgmentType || general.julgamento || 'Menor Preço',
    exigenciasRestritivas: riscos.length > 0,
    // Metadados
    noticeId: notice.id,
    noticeType: notice.type,
    convertedAt: new Date().toISOString()
  };

  const descriptionJson = JSON.stringify(b2gData);

  const opportunityData = {
    title,
    description: descriptionJson,
    value: Number.isFinite(Number(notice.estimatedValue)) ? Number(notice.estimatedValue) : 0,
    probability,
    stage,
    source: 'MANUAL',
    expectedCloseDate: notice.proposalDueDate || null,
    companyId: company.id,
    ownerId
  };
  if (hasField('Opportunity', 'projectName')) {
    opportunityData.projectName = title;
  }
  if (hasField('Opportunity', 'projectClientType')) {
    opportunityData.projectClientType = 'B2G';
  }
  if (hasField('Opportunity', 'b2gStage')) {
    opportunityData.b2gStage = b2gStage;
  }

  const opportunity = await prisma.opportunity.create({
    data: opportunityData,
    include: {
      company: {
        include: {
          contacts: {
            where: { isPrimary: true },
            take: 1
          }
        }
      },
      owner: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  await prisma.bidNotice.update({
    where: { id: notice.id },
    data: { status: 'PROPOSTA_EM_PREPARACAO' }
  });

  await createHistory(prisma, {
    noticeId: notice.id,
    eventType: 'CONVERTED_TO_OPPORTUNITY',
    title: 'Edital convertido em oportunidade',
    details: `Oportunidade ${opportunity.title} criada com sucesso.`,
    payload: {
      opportunityId: opportunity.id,
      companyId: company.id,
      createdCompany,
      recommendation,
      probability
    },
    createdByName: user?.name || null
  });

  return success({
    success: true,
    opportunity,
    company,
    createdCompany
  });
};

const handleAnalyzeUploadedFile = async ({ event, prisma, user }) => {
  const { fields, files } = parseMultipartFormData(event);
  const file = files.file;

  if (!file) {
    return error('Arquivo PDF é obrigatório.', 400);
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return error('Arquivo excede o limite de 20MB.', 400);
  }

  const mime = String(file.contentType || '').toLowerCase();
  const name = String(file.filename || '').toLowerCase();
  const isPdf = mime.includes('pdf') || name.endsWith('.pdf');
  if (!isPdf) {
    return error('Formato inválido. Envie um arquivo PDF.', 400);
  }

  const mode = String(fields.mode || 'EDITAL').toUpperCase() === 'TR' ? 'TR' : 'EDITAL';
  const instruction = cleanText(fields.instruction || '', 2000);
  const aiExtractedDataRaw = tryParseJsonObject(fields.aiExtractedData || '');

  let extractedText = '';
  let numPages = 0;
  try {
    const extracted = await extractPdfText(file.buffer);
    extractedText = extracted.text;
    numPages = extracted.numPages;
  } catch {
    extractedText = '';
    numPages = 0;
  }

  const aiExtractedDataText = cleanText(
    aiExtractedDataRaw && typeof aiExtractedDataRaw === 'object' ? JSON.stringify(aiExtractedDataRaw) : '',
    30000
  );

  const fallbackDocumentText =
    extractedText ||
    aiExtractedDataText ||
    cleanText(
      [
        `Arquivo enviado: ${file.filename}`,
        `Modo de análise: ${mode}`,
        instruction ? `Instrução do usuário: ${instruction}` : '',
        'Observação: PDF sem texto extraível automaticamente (possível documento escaneado).'
      ]
        .filter(Boolean)
        .join('\n'),
      30000
    ) ||
    '';
  const usedSyntheticDocumentText = !extractedText && !aiExtractedDataText;

  const aiExtractedData = enrichTemplateAnalysisWithText(aiExtractedDataRaw, fallbackDocumentText, mode);

  const inferredFromTemplate = inferNoticeFromTemplateData(aiExtractedData, mode, file.filename);

  const payload = normalizeNoticePayload(
    {
      ...inferredFromTemplate,
      type: inferredFromTemplate.type || inferTypeFromMode(mode),
      documentText: fallbackDocumentText,
      sourceUrl: inferredFromTemplate.sourceUrl || null,
      status: 'MONITORANDO'
    },
    { partial: false }
  );

  if (!payload.title) payload.title = cleanText(removeExtension(file.filename), 220) || 'Documento B2G';
  if (!payload.organization) payload.organization = 'Órgão não identificado';
  if (!payload.summary) payload.summary = summarizeNotice(payload);
  payload.createdByName = user?.name || null;

  const createdNotice = await prisma.bidNotice.create({ data: payload });

  await createHistory(prisma, {
    noticeId: createdNotice.id,
    eventType: 'CREATED_FROM_UPLOAD',
    title: 'Documento enviado para análise',
    details: `Arquivo ${file.filename} (${numPages || 0} página(s)) recebido para análise de ${mode}.`,
    payload: {
      originalName: file.filename,
      mimeType: file.contentType,
      size: file.size,
      numPages,
      mode,
      extractedTextAvailable: Boolean(extractedText)
    },
    createdByName: user?.name || null
  });

  // Garantir que aiExtractedData tenha templateExtractedData se vier do /ai-analysis
  const normalizedAiData = aiExtractedData && typeof aiExtractedData === 'object'
    ? {
        ...aiExtractedData,
        templateExtractedData: aiExtractedData.templateExtractedData || aiExtractedData
      }
    : null;

  const analysis =
    normalizedAiData
      ? buildAnalysisFromTemplateData(normalizedAiData, createdNotice, instruction)
      : buildHeuristicAnalysis(createdNotice, instruction, enrichTemplateAnalysisWithText(null, fallbackDocumentText, mode));

  const nextSummary = cleanText(analysis?.resumoExecutivo || '', 5000) || createdNotice.summary || summarizeNotice(createdNotice);

  const updatedNotice = await prisma.bidNotice.update({
    where: { id: createdNotice.id },
    data: {
      summary: nextSummary,
      aiAnalysis: analysis,
      status: 'ANALISE_CONCLUIDA'
    }
  });

  await createHistory(prisma, {
    noticeId: updatedNotice.id,
    eventType: 'AI_ANALYSIS',
    title: 'Análise de Edital/TR com IA executada',
    details: `Recomendação: ${analysis.recomendacao || 'GO_COM_RESSALVAS'} | Score: ${analysis.scoreAderencia ?? '-'}`,
    payload: {
      ...analysis,
      upload: {
        originalName: file.filename,
        numPages,
        extractedTextAvailable: Boolean(extractedText)
      }
    },
    createdByName: user?.name || null
  });

  return success({
    success: true,
    notice: updatedNotice,
    analysis,
    upload: {
      originalName: file.filename,
      numPages,
      extractedChars: fallbackDocumentText.length,
      extractedTextAvailable: Boolean(extractedText),
      usedSyntheticDocumentText
    },
    warnings:
      usedSyntheticDocumentText
        ? ['PDF sem texto extraível automaticamente. A análise foi concluída com fallback local.']
        : []
  });
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const prisma = getPrisma();
  const method = event.httpMethod;
  const segments = getRouteSegments(event.path, 'b2g');
  const qs = event.queryStringParameters || {};

  try {
    const user = await authenticateUser(event.headers || {});

    if (segments[0] === 'documentos') {
      return await handleDocumentRoutes({ event, user });
    }

    if (segments[0] === 'analisar-arquivo') {
      if (method !== 'POST') return error('Método não permitido', 405);
      return await handleAnalyzeUploadedFile({ event, prisma, user });
    }

    const editalSegments =
      segments.length === 0
        ? ['editais']
        : segments[0] === 'editais'
          ? segments
          : null;

    if (!editalSegments) {
      return error('Rota não encontrada', 404);
    }

    if (method === 'GET' && editalSegments.length === 1) {
      const notices = await listNotices(prisma, qs);
      return success(notices);
    }

    if (method === 'GET' && editalSegments.length === 2) {
      const noticeId = editalSegments[1];
      const notice = await prisma.bidNotice.findUnique({
        where: { id: noticeId },
        include: {
          history: {
            orderBy: [{ createdAt: 'desc' }]
          }
        }
      });
      if (!notice) return error('Edital não encontrado', 404);
      return success(notice);
    }

    if (method === 'GET' && editalSegments.length === 3 && editalSegments[2] === 'historico') {
      const noticeId = editalSegments[1];
      const history = await prisma.bidNoticeHistory.findMany({
        where: { noticeId },
        orderBy: [{ createdAt: 'desc' }]
      });
      return success(history);
    }

    if (method === 'POST' && editalSegments.length === 1) {
      const body = parseJsonBody(event);
      const payload = normalizeNoticePayload(body, { partial: false });

      if (!payload.title) {
        return error('Título é obrigatório', 400);
      }
      if (!payload.organization) {
        return error('Órgão é obrigatório', 400);
      }

      if (!payload.type) payload.type = 'EDITAL';
      if (!payload.status) payload.status = 'MONITORANDO';
      if (!payload.summary) payload.summary = summarizeNotice(payload);
      payload.createdByName = user?.name || null;

      const notice = await prisma.bidNotice.create({ data: payload });

      await createHistory(prisma, {
        noticeId: notice.id,
        eventType: 'CREATED',
        title: 'Edital cadastrado',
        details: `${TYPE_LABELS[notice.type] || 'Documento'} registrado para acompanhamento.`,
        payload: { status: notice.status, type: notice.type },
        createdByName: user?.name || null
      });

      return success(notice, 201);
    }

    if (method === 'PUT' && editalSegments.length === 2) {
      const noticeId = editalSegments[1];
      const existing = await prisma.bidNotice.findUnique({ where: { id: noticeId } });
      if (!existing) return error('Edital não encontrado', 404);

      const body = parseJsonBody(event);
      const data = normalizeNoticePayload(body, { partial: true });
      delete data.id;
      delete data.history;
      delete data.createdAt;
      delete data.updatedAt;

      if (Object.keys(data).length === 0) {
        return success(existing);
      }

      if ((data.documentText || data.objectDescription || data.organization || data.type) && !data.summary) {
        data.summary = summarizeNotice({ ...existing, ...data });
      }

      const updated = await prisma.bidNotice.update({
        where: { id: noticeId },
        data
      });

      await createHistory(prisma, {
        noticeId: updated.id,
        eventType: 'UPDATED',
        title: 'Edital atualizado',
        details:
          cleanText(body?.changeNote || '', 500) ||
          `Campos atualizados: ${Object.keys(data).join(', ')}`,
        payload: { updatedFields: Object.keys(data) },
        createdByName: user?.name || null
      });

      return success(updated);
    }

    if (method === 'DELETE' && editalSegments.length === 2) {
      if (!isAdminLike(user)) {
        return error('Acesso negado', 403);
      }

      const noticeId = editalSegments[1];
      const existing = await prisma.bidNotice.findUnique({ where: { id: noticeId } });
      if (!existing) return error('Análise não encontrada', 404);

      await prisma.bidNotice.delete({ where: { id: noticeId } });
      return success({ success: true, id: noticeId, message: 'Análise excluída com sucesso.' });
    }

    if (method === 'POST' && editalSegments.length === 3 && editalSegments[2] === 'analisar') {
      const noticeId = editalSegments[1];
      const body = parseJsonBody(event);
      const instruction = cleanText(body?.instruction || '', 2000);

      const notice = await prisma.bidNotice.findUnique({ where: { id: noticeId } });
      if (!notice) return error('Edital não encontrado', 404);

      const maybeTemplateData = notice?.aiAnalysis?.templateExtractedData;
      
      // Normalizar dados para garantir templateExtractedData
      const normalizedData = maybeTemplateData && typeof maybeTemplateData === 'object'
        ? {
            ...maybeTemplateData,
            templateExtractedData: maybeTemplateData.templateExtractedData || maybeTemplateData
          }
        : null;
      
      const analysis =
        normalizedData
          ? buildAnalysisFromTemplateData(normalizedData, notice, instruction)
          : buildHeuristicAnalysis(notice, instruction);

      const nextSummary = cleanText(analysis?.resumoExecutivo || '', 5000) || notice.summary || summarizeNotice(notice);

      const updated = await prisma.bidNotice.update({
        where: { id: noticeId },
        data: {
          summary: nextSummary,
          aiAnalysis: analysis,
          status:
            notice.status === 'MONITORANDO' || notice.status === 'ANALISE_EM_ANDAMENTO'
              ? 'ANALISE_CONCLUIDA'
              : notice.status
        }
      });

      await createHistory(prisma, {
        noticeId: updated.id,
        eventType: 'AI_ANALYSIS',
        title: 'Análise de Edital/TR com IA executada',
        details: `Recomendação: ${analysis.recomendacao || 'GO_COM_RESSALVAS'} | Score: ${analysis.scoreAderencia ?? '-'}`,
        payload: analysis,
        createdByName: user?.name || null
      });

      return success({ notice: updated, analysis });
    }

    if (method === 'POST' && editalSegments.length === 3 && editalSegments[2] === 'converter-oportunidade') {
      const noticeId = editalSegments[1];
      const notice = await prisma.bidNotice.findUnique({ where: { id: noticeId } });
      if (!notice) return error('Edital não encontrado', 404);

      return await handleConvertToOpportunity({ prisma, notice, user });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro em b2g:', err);

    if (err?.message && err.message.includes('Token')) {
      return error(err.message, 401);
    }

    if (err instanceof SyntaxError && /JSON/.test(String(err.message || ''))) {
      return jsonResponse(400, { error: 'JSON inválido.' });
    }

    if (err?.message && err.message.toLowerCase().includes('multipart inválido')) {
      return error(err.message, 400);
    }

    return error(err?.message || 'Erro interno', 500);
  }
}
