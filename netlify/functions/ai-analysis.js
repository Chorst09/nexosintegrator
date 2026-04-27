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
    // Opcional: segue sem polyfill
  }
};

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
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser, requireRole } from './lib/auth.js';

const USER_ALLOWED_ROLES = ['ADMIN', 'DIRECTOR', 'MANAGER', 'SELLER', 'PRE_SALES', 'USER'];

const parseJsonBody = (event) => {
  if (!event?.body) return {};
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
};

const getRouteSegments = (eventPath = '', functionName = 'ai-analysis') => {
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

const messageResponse = (statusCode, message) =>
  success({ message }, statusCode);

const forbiddenResponse = () =>
  error('Acesso negado', 403);

const unauthorizedResponse = (message = 'Não autenticado') =>
  error(message, 401);

const ANALYSIS_SCHEMAS = {
  request_edital: {
    type: 'object',
    properties: {
      fileDataUri: { type: 'string', minLength: 1 }
    },
    required: ['fileDataUri']
  },
  response_edital: {
    type: 'object',
    properties: {
      general: {
        type: 'object',
        properties: {
          openingDate: { type: 'string' },
          openingTime: { type: 'string' },
          portal: { type: 'string' },
          agency: { type: 'string' },
          modality: { type: 'string' },
          objectSummary: { type: 'string' }
        },
        required: ['openingDate', 'openingTime', 'portal', 'agency', 'modality', 'objectSummary']
      },
      deadlines: {
        type: 'object',
        properties: {
          publicationDate: { type: 'string' },
          impugnationDeadline: { type: 'string' },
          clarificationDeadline: { type: 'string' },
          proposalDeadline: { type: 'string' },
          contractTerm: { type: 'string' }
        },
        required: ['publicationDate', 'impugnationDeadline', 'clarificationDeadline', 'proposalDeadline', 'contractTerm']
      },
      requirements: {
        type: 'object',
        properties: {
          legal: { type: 'array', items: { type: 'string' } },
          technical: { type: 'array', items: { type: 'string' } },
          economic: { type: 'array', items: { type: 'string' } },
          fiscal: { type: 'array', items: { type: 'string' } }
        },
        required: ['legal', 'technical', 'economic', 'fiscal']
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            quantity: { type: 'string' },
            specs: { type: 'string' }
          },
          required: ['name', 'quantity', 'specs']
        }
      },
      risks: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['general', 'deadlines', 'requirements', 'items', 'risks']
  },
  request_tr: {
    type: 'object',
    properties: {
      fileDataUri: { type: 'string', minLength: 1 },
      analyzedModelName: { type: 'string', minLength: 1 },
      analyzedModelManufacturer: { type: 'string' },
      analyzedModelSpecs: { type: 'string', minLength: 1 },
      datasheetFileDataUri: { type: 'string' },
      datasheetFileName: { type: 'string' }
    },
    required: ['fileDataUri', 'analyzedModelName', 'analyzedModelSpecs']
  },
  response_tr: {
    type: 'object',
    properties: {
      analysisType: { type: 'string', enum: ['tr'] },
      trSummary: { type: 'string' },
      analyzedModel: {
        type: 'object',
        properties: {
          modelName: { type: 'string' },
          manufacturer: { type: 'string' },
          providedSpecs: { type: 'string' }
        },
        required: ['modelName', 'providedSpecs']
      },
      termRequirements: {
        type: 'array',
        items: { type: 'string' }
      },
      technicalNotebook: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            termRequirement: { type: 'string' },
            meetsRequirement: { type: 'string', enum: ['ATENDE', 'NAO_ATENDE'] },
            datasheetEvidence: { type: 'string' },
            rationale: { type: 'string' }
          },
          required: ['termRequirement', 'meetsRequirement', 'rationale']
        }
      },
      compliantEquipment: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            model: { type: 'string' },
            manufacturer: { type: 'string' },
            rationale: { type: 'string' }
          },
          required: ['model', 'manufacturer', 'rationale']
        }
      },
      complianceOverview: {
        type: 'object',
        properties: {
          totalRequirements: { type: 'number' },
          metRequirements: { type: 'number' },
          fullCompliance: { type: 'boolean' }
        },
        required: ['totalRequirements', 'metRequirements', 'fullCompliance']
      }
    },
    required: ['analysisType', 'trSummary', 'analyzedModel', 'termRequirements', 'technicalNotebook', 'compliantEquipment', 'complianceOverview']
  }
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const validateBySchema = (schema, data, path = '$') => {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  if (schema.type === 'object') {
    if (!isPlainObject(data)) {
      errors.push(`${path} deve ser objeto.`);
      return errors;
    }

    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) {
        errors.push(`${path}.${key} é obrigatório.`);
      }
    }

    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    for (const [key, propSchema] of Object.entries(properties)) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      errors.push(...validateBySchema(propSchema, data[key], `${path}.${key}`));
    }

    return errors;
  }

  if (schema.type === 'array') {
    if (!Array.isArray(data)) {
      errors.push(`${path} deve ser array.`);
      return errors;
    }

    if (schema.items && typeof schema.items === 'object') {
      data.forEach((item, index) => {
        errors.push(...validateBySchema(schema.items, item, `${path}[${index}]`));
      });
    }

    return errors;
  }

  if (schema.type === 'string') {
    if (typeof data !== 'string') {
      errors.push(`${path} deve ser string.`);
      return errors;
    }
    if (Number.isFinite(schema.minLength) && data.length < schema.minLength) {
      errors.push(`${path} deve ter no mínimo ${schema.minLength} caracteres.`);
    }
  } else if (schema.type === 'number') {
    if (typeof data !== 'number' || !Number.isFinite(data)) {
      errors.push(`${path} deve ser number.`);
      return errors;
    }
  } else if (schema.type === 'boolean') {
    if (typeof data !== 'boolean') {
      errors.push(`${path} deve ser boolean.`);
      return errors;
    }
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0 && !schema.enum.includes(data)) {
    errors.push(`${path} deve ser um de: ${schema.enum.join(', ')}.`);
  }

  return errors;
};

const schemaErrorsToMessage = (errors) =>
  (Array.isArray(errors) ? errors : [])
    .slice(0, 5)
    .join(' ');

const MAX_TEXT_CHARS = 80000; // Texto extraído para fallback OpenAI

const cleanText = (value, max = MAX_TEXT_CHARS) => {
  if (typeof value !== 'string') return '';
  const normalized = value
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!normalized) return '';
  return normalized.slice(0, max);
};

const parseDataUri = (dataUri) => {
  if (typeof dataUri !== 'string' || !dataUri.trim()) {
    throw new Error('fileDataUri obrigatorio.');
  }

  const match = dataUri.match(/^data:([^;,]+)?;base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new Error('fileDataUri invalido. Envie Data URI em base64.');
  }

  const mimeType = String(match[1] || 'application/octet-stream').toLowerCase();
  const base64Data = match[2].replace(/\s+/g, '');

  let buffer;
  try {
    buffer = Buffer.from(base64Data, 'base64');
  } catch {
    throw new Error('Base64 invalido no fileDataUri.');
  }

  if (!buffer || buffer.length === 0) {
    throw new Error('Arquivo vazio no fileDataUri.');
  }

  return { mimeType, buffer };
};

const extractPdfText = async (buffer) => {
  const mod = await getPdfParseModule();
  if (!mod) return { text: '', totalPages: 0 };

  const PdfParseClass =
    mod?.PDFParse ||
    mod?.default?.PDFParse ||
    (typeof mod?.default === 'function' && /class/i.test(String(mod.default)) ? mod.default : null);

  if (PdfParseClass) {
    const parser = new PdfParseClass({ data: buffer });
    try {
      if (typeof parser.getText === 'function') {
        const parsed = await parser.getText();
        return {
          text: cleanText(parsed?.text || ''),
          totalPages: Number(parsed?.total || parsed?.pages?.length || 0)
        };
      }
    } finally {
      await parser.destroy?.().catch(() => undefined);
    }
  }

  const legacyParseFn = typeof mod?.default === 'function' ? mod.default : null;
  if (!legacyParseFn) return { text: '', totalPages: 0 };

  const parsed = await legacyParseFn(buffer);
  return {
    text: cleanText(parsed?.text || ''),
    totalPages: Number(parsed?.numpages || 0)
  };
};

const normalizeLine = (line) => String(line || '').replace(/[ \t]+/g, ' ').trim();

const splitLines = (text) =>
  String(text || '')
    .split(/\n+/)
    .map(normalizeLine)
    .filter((line) => line.length >= 4);

const unique = (list) => [...new Set((Array.isArray(list) ? list : []).filter(Boolean))];

const findCapture = (text, regex) => {
  const match = String(text || '').match(regex);
  return match?.[1] ? normalizeLine(match[1]) : '';
};

const DATE_MONTH_INDEX = {
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

const toNumber = (value) => Number.parseInt(String(value || ''), 10);
const pad2 = (value) => String(value).padStart(2, '0');

const normalizePlainText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const isUnknownText = (value) =>
  /^(nao identificado|nao informad[oa]|n\/a|na|nd|-|--)?$/.test(normalizePlainText(value));

const formatBrDate = (dayValue, monthValue, yearValue) => {
  const day = toNumber(dayValue);
  const month = toNumber(monthValue);
  let year = toNumber(yearValue);

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return '';
  if (year < 100) year += 2000;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2100) return '';

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return '';
  }

  return `${pad2(day)}/${pad2(month)}/${String(year).padStart(4, '0')}`;
};

const extractDateFromValue = (value) => {
  const text = String(value || '');
  if (!text) return '';

  const br = text.match(/\b([0-3]?\d)[\/\-.]([0-1]?\d)[\/\-.](\d{2,4})\b/);
  if (br) {
    const normalized = formatBrDate(br[1], br[2], br[3]);
    if (normalized) return normalized;
  }

  const iso = text.match(/\b(20\d{2})[\/\-.]([0-1]?\d)[\/\-.]([0-3]?\d)\b/);
  if (iso) {
    const normalized = formatBrDate(iso[3], iso[2], iso[1]);
    if (normalized) return normalized;
  }

  const extenso = text.match(
    /\b([0-3]?\d)\s*(?:de\s+)?(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan\.?|fev\.?|mar\.?|abr\.?|mai\.?|jun\.?|jul\.?|ago\.?|set\.?|out\.?|nov\.?|dez\.?)\s*(?:de\s+)?(\d{2,4})\b/i
  );
  if (extenso) {
    const monthKey = normalizePlainText(extenso[2]).replace(/\.$/, '');
    const month = DATE_MONTH_INDEX[monthKey] || 0;
    const normalized = month ? formatBrDate(extenso[1], month, extenso[3]) : '';
    if (normalized) return normalized;
  }

  return '';
};

const findDateLike = (text, regex) => {
  return extractDateFromValue(findCapture(text, regex));
};

const extractTimeFromValue = (value) => {
  const text = String(value || '');
  const hhmm = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmm) return `${pad2(hhmm[1])}:${hhmm[2]}`;

  const hh = text.match(/\b([01]?\d|2[0-3])h(?:\s*([0-5]\d))?\b/i);
  if (hh) return `${pad2(hh[1])}:${hh[2] || '00'}`;

  return '';
};

const findTimeLike = (text, regex) => {
  return extractTimeFromValue(findCapture(text, regex));
};

const extractDateFromLineWindows = (lines, keywordPatterns = [], lookahead = 2) => {
  if (!Array.isArray(lines) || lines.length === 0 || !Array.isArray(keywordPatterns) || keywordPatterns.length === 0) {
    return '';
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!keywordPatterns.some((pattern) => pattern.test(line))) continue;

    const from = Math.max(0, index - 1);
    const to = Math.min(lines.length, index + lookahead + 1);
    const windowText = lines.slice(from, to).join(' ');
    const date = extractDateFromValue(windowText);
    if (date) return date;
  }

  return '';
};

const extractTimeFromLineWindows = (lines, keywordPatterns = [], lookahead = 2) => {
  if (!Array.isArray(lines) || lines.length === 0 || !Array.isArray(keywordPatterns) || keywordPatterns.length === 0) {
    return '';
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!keywordPatterns.some((pattern) => pattern.test(line))) continue;

    const from = Math.max(0, index - 1);
    const to = Math.min(lines.length, index + lookahead + 1);
    const windowText = lines.slice(from, to).join(' ');
    const hour = extractTimeFromValue(windowText);
    if (hour) return hour;
  }

  return '';
};

const extractTextFromLineWindows = (lines, keywordPatterns = [], lookahead = 2, max = 240) => {
  if (!Array.isArray(lines) || lines.length === 0 || !Array.isArray(keywordPatterns) || keywordPatterns.length === 0) {
    return '';
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!keywordPatterns.some((pattern) => pattern.test(line))) continue;

    const from = Math.max(0, index - 1);
    const to = Math.min(lines.length, index + lookahead + 1);
    const windowText = normalizeLine(lines.slice(from, to).join(' '));
    if (windowText) return windowText.slice(0, max);
  }

  return '';
};

const extractDateFromTextByKeywords = (text, keywordPatterns = [], lookahead = 2) =>
  extractDateFromLineWindows(splitLines(text), keywordPatterns, lookahead);

const extractTimeFromTextByKeywords = (text, keywordPatterns = [], lookahead = 2) =>
  extractTimeFromLineWindows(splitLines(text), keywordPatterns, lookahead);

const extractTextFromTextByKeywords = (text, keywordPatterns = [], lookahead = 2, max = 240) =>
  extractTextFromLineWindows(splitLines(text), keywordPatterns, lookahead, max);

const sanitizeContractTerm = (value, max = 160) => {
  let text = normalizeLine(value || '');
  if (!text || isUnknownText(text)) return '';

  text = text.replace(
    /^(?:vig[êe]ncia(?:\s+contratual)?|prazo\s+de\s+vig[êe]ncia|prazo\s+contratual|dura[cç][aã]o\s+do\s+contrato)\s*[:\-]?\s*/i,
    ''
  );
  text = normalizeLine(text);

  if (!text || text.length < 4 || /^[,.;:\-)\]]/.test(text)) return '';
  if (!/\d/.test(text) && !/\b(vig[êe]ncia|prazo|dura[cç][aã]o|mes(?:es)?|ano(?:s)?|dia(?:s)?|semanas?)\b/i.test(text)) {
    return '';
  }

  return text.slice(0, max);
};

const pickDateValue = (candidate, fallback) => extractDateFromValue(candidate) || extractDateFromValue(fallback) || 'Não identificado';

const pickTimeValue = (candidate, fallback) => extractTimeFromValue(candidate) || extractTimeFromValue(fallback) || 'Não identificado';

const pickContractTermValue = (candidate, fallback) => sanitizeContractTerm(candidate) || sanitizeContractTerm(fallback) || 'Não identificado';

const detectModality = (text) => {
  const m = String(text || '').match(
    /(preg[aã]o(?:\s+eletr[oô]nico)?|concorr[eê]ncia|dispensa(?:\s+eletr[oô]nica)?|inexigibilidade|tomada\s+de\s+pre[cç]os)/i
  );
  return normalizeLine(m?.[1] || '');
};

const detectPortal = (text) => {
  const direct = findCapture(text, /(?:portal|plataforma|sistema)\s*[:\-]\s*([^\n]{3,180})/i);
  if (direct) return direct;

  if (/comprasnet|gov\.br\/compras/i.test(text)) return 'Compras.gov.br';
  if (/licitacoes-e/i.test(text)) return 'Licitações-e';
  if (/bec\s*\/\s*sp|bolsa eletr[oô]nica de compras/i.test(text)) return 'BEC/SP';
  return 'Não identificado';
};

const detectAgency = (text) => {
  const direct = findCapture(
    text,
    /(?:[óo]rg[aã]o\s+licitante|entidade\s+demandante|unidade\s+demandante|secretaria)\s*[:\-]\s*([^\n]{3,220})/i
  );
  if (direct) return direct;

  const heuristic = findCapture(
    text,
    /(prefeitura(?:\s+municipal)?\s+de\s+[^\n,;]{3,140}|governo\s+do\s+estado\s+de\s+[^\n,;]{3,140}|tribunal\s+[^\n,;]{3,140}|minist[eé]rio\s+[^\n,;]{3,140})/i
  );
  return heuristic || 'Não identificado';
};

const detectObjectSummary = (text) => {
  const objectLine = findCapture(text, /(?:objeto(?:\s+da\s+licita[cç][aã]o)?)\s*[:\-]\s*([\s\S]{10,800})/i);
  if (objectLine) return objectLine.slice(0, 400);

  const lines = splitLines(text);
  const candidate = lines.find((line) => /contrata[cç][aã]o|aquisi[cç][aã]o|fornecimento|servi[cç]o/i.test(line));
  return (candidate || 'Não identificado').slice(0, 400);
};

const collectByKeywords = (lines, keywords, limit = 12) => {
  const result = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (keywords.some((keyword) => lower.includes(keyword))) {
      result.push(line);
      if (result.length >= limit) break;
    }
  }
  return unique(result);
};

const tokenize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .filter((token) => ![
      'para', 'com', 'pela', 'pelo', 'uma', 'como', 'deve', 'devera', 'sobre', 'entre', 'este', 'esta', 'quando',
      'sera', 'serao', 'item', 'lote', 'modelo', 'arquivo', 'documento', 'termo', 'referencia', 'nao', 'identificado'
    ].includes(token));

const tryParseJsonObject = (rawContent) => {
  if (!rawContent || typeof rawContent !== 'string') return null;
  try {
    const parsed = JSON.parse(rawContent);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore direct parse errors
  }

  const start = rawContent.indexOf('{');
  const end = rawContent.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(rawContent.slice(start, end + 1));
  } catch {
    return null;
  }
};

const getGeminiApiKey = () =>
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY ||
  '';

const shouldRetryByMessage = (message) => {
  const lower = String(message || '').toLowerCase();
  return lower.includes('resource_exhausted') || lower.includes('quota') || lower.includes('429');
};

const retryDelayMsFromMessage = (message, fallbackMs) => {
  const m = String(message || '').match(/retry in ([\d.]+)s/i);
  if (!m) return fallbackMs;
  const secs = Number.parseFloat(m[1]);
  if (!Number.isFinite(secs)) return fallbackMs;
  return Math.max(500, Math.ceil(secs * 1000) + 500);
};

const buildTemplatePrompt = ({ mode, payload, extractedText = '', totalPages = 0 }) => {
  if (mode === 'edital') {
    return [
      'Voce e um especialista sênior em licitações públicas B2G no Brasil.',
      'Sua tarefa é realizar uma ANÁLISE TÉCNICA COMPLETA E EXAUSTIVA do edital fornecido.',
      '',
      '== INSTRUÇÕES CRÍTICAS ==',
      '1. Leia e analise TODAS as páginas do documento, incluindo anexos, apêndices, tabelas e quadros.',
      '2. Para CADA informação extraída, cite a página de origem (campo "pagina") e um trecho literal de apoio (campo "trecho").',
      '3. Se uma informação NÃO for encontrada, retorne "Não identificado" — NUNCA invente ou infira sem marcar como hipótese.',
      '4. Informações inferidas (não explícitas) devem ser marcadas com prefixo "[HIPÓTESE]".',
      '5. Extraia TODOS os itens/lotes com quantitativos, especificações e unidades.',
      '6. Identifique TODOS os documentos obrigatórios para habilitação.',
      '7. Mapeie TODOS os riscos, penalidades e cláusulas restritivas.',
      '8. Ao final, gere um relatório de cobertura indicando páginas analisadas.',
      '',
      `== DOCUMENTO: ${totalPages} páginas ==`,
      '',
      '== SCHEMA DE SAÍDA (JSON estrito, sem markdown) ==',
      JSON.stringify({
        analysisType: 'edital',
        coverageReport: {
          totalPages: 'number',
          pagesAnalyzed: 'number',
          coveragePercent: 'number',
          missingFields: ['string'],
          lowConfidencePages: ['number'],
          hasUninterpretedImages: 'boolean'
        },
        general: {
          objeto: { valor: 'string', pagina: 'number', trecho: 'string' },
          orgao: { valor: 'string', pagina: 'number', trecho: 'string' },
          modalidade: { valor: 'string', pagina: 'number', trecho: 'string' },
          numeroEdital: { valor: 'string', pagina: 'number', trecho: 'string' },
          portal: { valor: 'string', pagina: 'number', trecho: 'string' },
          uasg: { valor: 'string', pagina: 'number', trecho: 'string' },
          criterioJulgamento: { valor: 'string', pagina: 'number', trecho: 'string' },
          tipoLicitacao: { valor: 'string', pagina: 'number', trecho: 'string' }
        },
        deadlines: {
          publicacao: { data: 'string', pagina: 'number' },
          abertura: { data: 'string', hora: 'string', pagina: 'number' },
          impugnacao: { data: 'string', pagina: 'number' },
          esclarecimentos: { data: 'string', pagina: 'number' },
          envioPropostas: { data: 'string', pagina: 'number' },
          vigenciaContrato: { valor: 'string', pagina: 'number' },
          prazoExecucao: { valor: 'string', pagina: 'number' }
        },
        habilitacao: {
          juridica: [{ requisito: 'string', pagina: 'number', trecho: 'string' }],
          tecnica: [{ requisito: 'string', pagina: 'number', trecho: 'string' }],
          economica: [{ requisito: 'string', pagina: 'number', trecho: 'string' }],
          fiscal: [{ requisito: 'string', pagina: 'number', trecho: 'string' }],
          atestados: [{ requisito: 'string', pagina: 'number', trecho: 'string' }]
        },
        documentosObrigatorios: [{ documento: 'string', categoria: 'string', pagina: 'number' }],
        items: [{
          lote: 'string',
          item: 'string',
          descricao: 'string',
          quantidade: 'string',
          unidade: 'string',
          especificacoes: 'string',
          valorEstimado: 'string',
          pagina: 'number'
        }],
        obrigacoesContratada: [{ obrigacao: 'string', pagina: 'number' }],
        slaExecucao: [{ prazo: 'string', descricao: 'string', pagina: 'number' }],
        pagamento: {
          condicoes: { valor: 'string', pagina: 'number', trecho: 'string' },
          prazo: { valor: 'string', pagina: 'number' },
          formaPagamento: { valor: 'string', pagina: 'number' }
        },
        penalidades: [{ tipo: 'string', percentual: 'string', descricao: 'string', pagina: 'number' }],
        riscos: [{ risco: 'string', severidade: 'ALTO|MEDIO|BAIXO', pagina: 'number', trecho: 'string' }],
        pontosAtencao: [{ ponto: 'string', pagina: 'number' }],
        anexos: [{ nome: 'string', descricao: 'string', pagina: 'number' }],
        resumoExecutivo: 'string',
        scoreAderencia: 'number (0-100)',
        recomendacao: 'GO|GO_COM_RESSALVAS|NO_GO',
        checklistCompleto: [{ item: 'string', status: 'ENCONTRADO|NAO_ENCONTRADO|PARCIAL', pagina: 'number' }]
      }, null, 2)
    ].join('\n');
  }

  // Modo TR
  return [
    'Voce e um especialista sênior em licitações B2G e engenharia de pré-vendas.',
    'Realize uma ANÁLISE TÉCNICA COMPLETA do Termo de Referência e compare com o modelo informado.',
    '',
    '== INSTRUÇÕES CRÍTICAS ==',
    '1. Extraia TODOS os requisitos técnicos e funcionais, incluindo tabelas e quadros.',
    '2. Para cada requisito, cite a página de origem.',
    '3. "meetsRequirement" deve ser somente "ATENDE" ou "NAO_ATENDE".',
    '4. "analysisType" deve ser "tr".',
    '5. Preencha "datasheetEvidence" com evidência literal quando possível.',
    '',
    'Modelo analisado:',
    `- Nome: ${normalizeLine(payload?.analyzedModelName || '') || 'Nao informado'}`,
    `- Fabricante: ${normalizeLine(payload?.analyzedModelManufacturer || '') || 'Nao informado'}`,
    `- Especificacoes: ${normalizeLine(payload?.analyzedModelSpecs || '') || 'Nao informado'}`,
    payload?.datasheetFileName ? `- Datasheet: ${normalizeLine(payload.datasheetFileName)}` : ''
  ].filter(Boolean).join('\n');
};

const buildGeminiSchemaHint = (mode) => mode === 'edital' ? 'Ver schema no prompt acima' : {
  analysisType: 'tr',
  trSummary: 'string',
  termRequirements: ['string'],
  technicalNotebook: [{
    termRequirement: 'string',
    meetsRequirement: 'ATENDE | NAO_ATENDE',
    datasheetEvidence: 'string',
    rationale: 'string',
    pagina: 'number'
  }],
  complianceOverview: { totalRequirements: 'number', metRequirements: 'number', fullCompliance: 'boolean' }
};

const parseGeminiTextContent = (json) => {
  const parts = Array.isArray(json?.candidates?.[0]?.content?.parts)
    ? json.candidates[0].content.parts
    : [];
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
};

const runGeminiStructured = async ({ mode, payload, extractedText = '', totalPages = 0, maxRetries = 2, baseDelayMs = 2000 }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || process.env.GOOGLE_MODEL || 'gemini-2.0-flash';
  const prompt = buildTemplatePrompt({ mode, payload, extractedText, totalPages });

  const mainFile = parseDataUri(payload?.fileDataUri);

  // Enviar PDF completo + texto extraído para máxima cobertura
  const parts = [
    {
      text: [
        prompt,
        '',
        'Responda APENAS com JSON válido, sem markdown, sem texto adicional.',
        totalPages > 0 ? `O documento tem ${totalPages} páginas. Analise TODAS.` : ''
      ].filter(Boolean).join('\n')
    },
    // PDF completo para análise visual (tabelas, imagens, formatação)
    {
      inline_data: {
        mime_type: mainFile.mimeType || 'application/pdf',
        data: mainFile.buffer.toString('base64')
      }
    }
  ];

  // Adicionar texto extraído como contexto adicional se disponível
  if (extractedText && extractedText.length > 100) {
    parts.push({
      text: `\n\n== TEXTO EXTRAÍDO DO PDF (use como referência adicional) ==\n${extractedText.slice(0, 30000)}`
    });
  }

  if (mode === 'tr' && typeof payload?.datasheetFileDataUri === 'string' && payload.datasheetFileDataUri.trim()) {
    try {
      const datasheet = parseDataUri(payload.datasheetFileDataUri);
      parts.push({ text: `Datasheet complementar: ${normalizeLine(payload.datasheetFileName || 'arquivo sem nome')}` });
      parts.push({
        inline_data: {
          mime_type: datasheet.mimeType || 'application/pdf',
          data: datasheet.buffer.toString('base64')
        }
      });
    } catch (err) {
      console.warn('Falha ao anexar datasheet.', err?.message);
    }
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            maxOutputTokens: 8192
          }
        })
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        const errMessage = normalizeLine(json?.error?.message || '') || `Gemini HTTP ${response.status}`;
        throw new Error(errMessage);
      }

      const parsed = tryParseJsonObject(parseGeminiTextContent(json));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }

      throw new Error('Gemini não retornou JSON válido.');
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const isLastAttempt = attempt >= maxRetries - 1;
      if (!shouldRetryByMessage(message) || isLastAttempt) break;
      const waitMs = retryDelayMsFromMessage(message, baseDelayMs * Math.pow(2, attempt));
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  if (lastError) console.warn(`Falha Gemini (${mode}):`, lastError?.message);
  return null;
};

const runOpenAiStructured = async ({ mode, payload, text, totalPages = 0, datasheetText = '' }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  const systemPrompt = mode === 'edital'
    ? `Você é um especialista sênior em licitações públicas B2G no Brasil. Analise o edital fornecido e retorne JSON completo com MÁXIMA extração de dados. O documento tem ${totalPages} páginas. Para cada campo, cite a página de origem. Responda APENAS com JSON válido sem markdown.`
    : 'Você é especialista em licitações B2G e pré-vendas. Compare o TR com o modelo informado. Responda APENAS com JSON válido sem markdown.';

  const prompt = buildTemplatePrompt({ mode, payload, extractedText: text, totalPages });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}\n\n== TEXTO DO DOCUMENTO ==\n${cleanText(text, 25000)}${datasheetText ? `\n\n== DATASHEET ==\n${cleanText(datasheetText, 10000)}` : ''}` }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) return null;

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    const parsed = tryParseJsonObject(content);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const ensureArray = (value, limit = 20) =>
  (Array.isArray(value) ? value : [])
    .map((item) => normalizeLine(String(item || '')))
    .filter(Boolean)
    .slice(0, limit);

const normalizeItemName = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Padrões melhorados para detectar itens válidos
const ITEM_STRONG_SIGNAL_REGEX =
  /\b(fornecimento|aquisi[cç][aã]o|loca[cç][aã]o|licen[cç]a|servi[cç]o|solu[cç][aã]o|equipamento|sistema|software|hardware|plataforma|assinatura|subscri[cç][aã]o|m[oó]dulo|ferramenta|aplica[cç][aã]o|implanta[cç][aã]o|manuten[cç][aã]o|suporte|treinamento|consultoria|notebook|desktop|computador|servidor|storage|switch|roteador|firewall|impressora|scanner|monitor|tablet|c[âa]mera|link|internet|rede|cabeamento|rack|nobreak|estabilizador|projetor|tela|quadro|mesa|cadeira|arm[aá]rio|estante|ve[ií]culo|carro|moto|bicicleta|material|produto|item|pe[cç]a|componente|acess[óo]rio|consumível|toner|cartucho|papel|caneta|l[aá]pis|borracha|grampeador|perfurador|pasta|arquivo|caixa|envelope|etiqueta|fita|cola|tesoura|estilete|r[ée]gua|compasso|transferidor|calculadora|telefone|celular|smartphone|tablet|rel[óo]gio|pulseira|colar|anel|brinco|corrente|pingente|medalhão|chaveiro|porta|janela|fechadura|dobradiça|parafuso|prego|bucha|arruela|porca|chave|martelo|alicate|chave de fenda|chave phillips|trena|n[ií]vel|prumo|esquadro|serrote|serra|furadeira|parafusadeira|lixadeira|esmerilhadeira|serra circular|serra tico-tico|plaina|tupia|compressor|pistola|pincel|rolo|bandeja|esp[aá]tula|desempenadeira|colher|enxada|p[aá]|picareta|machado|foice|ancinho|vassoura|rodo|balde|mangueira|regador|pulverizador|aspersor|bomba|motor|gerador|transformador|disjuntor|interruptor|tomada|plug|fio|cabo|condutor|eletroduto|caixa de passagem|quadro de distribui[cç][aã]o|painel|luminária|l[âa]mpada|reator|starter|soquete|bocal|lustre|arandela|spot|refletor|poste|bra[cç]o|haste|suporte|base|pedestal|trip[ée]|cavalete|escada|banqueta|banco|poltrona|sof[aá]|cama|beliche|ber[cç]o|colch[aã]o|travesseiro|len[cç]ol|cobertor|edredom|fronha|toalha|cortina|persiana|tapete|capacho|piso|revestimento|azulejo|cer[âa]mica|porcelanato|granito|m[aá]rmore|pedra|tijolo|bloco|telha|cumeeira|calha|rufo|pingadeira|ripa|caibro|viga|pilar|coluna|viga|laje|fundação|sapata|estaca|radier|contrapiso|argamassa|concreto|cimento|areia|brita|pedra|cal|gesso|massa|tinta|verniz|esmalte|primer|selador|impermeabilizante|aditivo|rejunte|silicone|espuma|isopor|l[aã]|fibra|vidro|espelho|cristal|acr[ií]lico|policarbonato|pvc|pl[aá]stico|borracha|couro|tecido|malha|tric[ôo]|croch[êe]|renda|bordado|aplique|bot[aã]o|z[ií]per|el[aá]stico|fita|cord[aã]o|barbante|linha|agulha|alfinete|dedal|tesoura|m[aá]quina de costura|overloque|galoneira|interlock|reta|zigue-zague|bordadeira|cortadeira|picotadeira|refiladeira|dobradeira|passadeira|ferro|t[aá]bua|varal|pregador|cesto|bacia|balde|tanque|m[aá]quina de lavar|secadora|centrífuga|tanquinho|lavadora|lava-lou[cç]a|fog[aã]o|forno|cooktop|coifa|depurador|exaustor|microondas|geladeira|freezer|frigobar|adega|bebedouro|purificador|filtro|refil|torneira|registro|v[aá]lvula|sif[aã]o|ralo|grelha|tampa|assento|vaso|bacia|mict[óo]rio|pia|lavatório|cuba|tanque|banheira|box|porta|cortina|chuveiro|ducha|misturador|monocomando|bica|arejador|flexível|engate|rosca|vedação|anel|arruela|parafuso|bucha|porca|chave|alicate|chave inglesa|chave de grifo|chave stillson|chave de fenda|chave phillips|chave allen|chave torx|chave soquete|catraca|extens[aã]o|adaptador|luva|joelho|t[êe]|cruz|cap|bucha de redu[cç][aã]o|niple|uni[aã]o|flange|curva|redu[cç][aã]o|amplia[cç][aã]o|deriva[cç][aã]o|inspe[cç][aã]o|limpeza|desentupimento|hidrojateamento|sondagem|teste|ensaio|an[aá]lise|laudo|relat[óo]rio|projeto|desenho|planta|croqui|esquema|diagrama|fluxograma|organograma|cronograma|planilha|tabela|gr[aá]fico|mapa|carta|atlas|guia|manual|apostila|livro|revista|jornal|peri[óo]dico|boletim|folder|panfleto|cartaz|banner|faixa|placa|letreiro|totem|display|expositor|vitrine|balc[aã]o|mesa|cadeira|poltrona|sof[aá]|banco|banqueta|puff|aparador|buffet|cristaleira|estante|prateleira|nicho|arm[aá]rio|guarda-roupa|c[ôo]moda|gaveteiro|criado-mudo|cabeceira|cama|beliche|ber[cç]o|trocador|c[ôo]moda|guarda-roupa|arm[aá]rio|estante|prateleira|nicho|mesa|cadeira|poltrona|sof[aá]|banco|banqueta|puff|aparador|buffet|cristaleira|rack|painel|home|estante|prateleira|nicho|arm[aá]rio|guarda-roupa|c[ôo]moda|gaveteiro|criado-mudo|cabeceira|cama|beliche|ber[cç]o|trocador|c[ôo]moda|guarda-roupa|arm[aá]rio|estante|prateleira|nicho)\b/i;

// Contextos administrativos que NÃO são itens
const ITEM_CONTEXT_BLOCKLIST_REGEX =
  /\b(prazo\s+de|vig[êe]ncia\s+de|per[ií]odo\s+de|data\s+de|hora\s+de|local\s+de|endere[cç]o\s+de|abertura\s+da|sess[aã]o\s+de|impugna[cç][aã]o\s+de|esclarecimento\s+de|proposta\s+de|publica[cç][aã]o\s+de|habilita[cç][aã]o\s+de|qualifica[cç][aã]o\s+de|certid[aã]o\s+de|atestado\s+de|cl[aá]usula\s+de|penalidade\s+de|multa\s+de|entrega\s+de|execu[cç][aã]o\s+de|ata\s+de\s+registro|nota\s+de\s+empenho|ordem\s+de\s+servi[cç]o|contrato\s+social|procura[cç][aã]o|representa[cç][aã]o|balanço\s+patrimonial|índice\s+de\s+liquidez|patrimônio\s+líquido|garantia\s+de\s+proposta|garantia\s+contratual|fgts|receita\s+federal|dívida\s+ativa|trabalhista|fazenda\s+estadual|fazenda\s+municipal)\b/i;

const ITEM_SINGLE_WORD_ALLOWLIST = new Set([
  'software',
  'sistema',
  'notebook',
  'desktop',
  'computador',
  'servidor',
  'storage',
  'switch',
  'roteador',
  'firewall',
  'impressora',
  'scanner',
  'monitor',
  'tablet',
  'camera',
  'licenca',
  'plataforma',
  'assinatura',
  'subscricao',
  'hardware',
  'equipamento',
  'solucao',
  'aplicacao',
  'modulo',
  'ferramenta'
]);

// Padrões melhorados para quantidade
const ITEM_QUANTITY_PATTERN = /(\d+[\.,]?\d*)\s*(un|und|unidade|licen[cç]a|kit|pe[cç]a|item|conjunto|meses?|anos?|hora|dia|semana|m[êe]s|ano|servi[cç]o)/i;
const ITEM_QUANTITY_LINE_PATTERN = /^(.{8,300})\s+(\d+[\.,]?\d*)\s*(un|und|unidade|licen[cç]a|kit|pe[cç]a|item|conjunto|meses?|anos?|hora|dia|semana|m[êe]s|ano|servi[cç]o)\b/i;

const hasStrongItemSignal = (value) => ITEM_STRONG_SIGNAL_REGEX.test(String(value || ''));

const looksLikeAdministrativeContext = (value) => ITEM_CONTEXT_BLOCKLIST_REGEX.test(normalizeItemName(value));

const looksLikeLocationOnly = (value) => {
  const normalized = normalizeItemName(value);
  if (!normalized) return false;
  if (/\b(municipio|cidade|estado|capital|regional|territorio|sede)\b/.test(normalized)) return true;

  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length === 1) {
    if (ITEM_SINGLE_WORD_ALLOWLIST.has(tokens[0])) return false;
    return !hasStrongItemSignal(tokens[0]);
  }

  if (tokens.length <= 2 && /\b(pr|sp|rj|mg|sc|rs|ba|go|mt|ms|df|ce|pe|pb|rn|al|se|pi|ma|pa|ap|am|rr|ro|ac|to|es)\b/.test(normalized)) {
    return !hasStrongItemSignal(normalized);
  }

  return false;
};

const isWeakItemName = (name) => {
  const n = normalizeItemName(name);
  if (!n || n.length < 6) return true;
  if (/^(periodo|prazo|vigencia|meses|anos|duracao|contrato)(\s|$)/.test(n)) return true;
  if (/^(de|da|do|dos|das|para|com|sem)$/.test(n)) return true;
  if (/^\d+(?:[\.,]\d+)?$/.test(n)) return true;
  if (looksLikeLocationOnly(n) && !hasStrongItemSignal(n)) return true;
  if (looksLikeAdministrativeContext(n) && !hasStrongItemSignal(n)) return true;

  const tokens = n
    .split(' ')
    .filter(Boolean)
    .filter((token) => !['de', 'da', 'do', 'dos', 'das', 'para', 'com', 'sem'].includes(token));
  if (tokens.length === 0) return true;
  if (tokens.length === 1 && !ITEM_SINGLE_WORD_ALLOWLIST.has(tokens[0]) && !hasStrongItemSignal(tokens[0])) {
    return true;
  }

  return false;
};

const shouldAcceptItemCandidate = (name, quantity = '', context = '') => {
  // Validação básica de nome
  if (!name || name.length < 3) return false;
  
  // Aceitar se tem sinal forte de item técnico
  const signalCorpus = `${name || ''} ${context || ''}`;
  if (hasStrongItemSignal(signalCorpus)) return true;
  
  // Aceitar se tem quantidade válida (não temporal)
  const quantityNorm = normalizeItemName(quantity);
  if (/\b(unidade|licenca|kit|peca|item|conjunto|servico)\b/.test(quantityNorm)) return true;
  
  // Rejeitar se é claramente contexto administrativo
  const contextNorm = normalizeItemName(context);
  if (looksLikeAdministrativeContext(contextNorm)) return false;
  
  // Rejeitar se é muito fraco (uma palavra sem sinal)
  if (isWeakItemName(name) && !hasStrongItemSignal(name)) return false;
  
  // Aceitar por padrão (menos restritivo)
  return true;
};

const extractEditalItemsFromLines = (lines) => {
  const items = [];
  const seen = new Set();

  const pushItem = (rawName, rawQuantity = 'Não identificado', rawSpecs = 'Conforme edital/TR', context = '') => {
    const name = normalizeLine(
      String(rawName || '')
        .replace(/^(?:item|lote)\s*\d{1,3}(?:\.\d+)*\s*[:\-–]?\s*/i, '')
        .replace(/^\d{1,3}(?:\.\d+){1,4}\s+/, '')
        .replace(/\s+\d+[\.,]?\d*\s*(un|und|unidade|licen[cç]a|kit|meses?|anos?)\s*$/i, '')
    );
    if (!name || !shouldAcceptItemCandidate(name, rawQuantity, `${rawSpecs} ${context}`)) return;

    const key = normalizeItemName(name);
    if (!key || seen.has(key)) return;

    seen.add(key);
    items.push({
      name,
      quantity: normalizeLine(rawQuantity || 'Não identificado') || 'Não identificado',
      specs: normalizeLine(rawSpecs || 'Conforme edital/TR') || 'Conforme edital/TR'
    });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // Padrão: Item 1, Item 01, Item 1.1
    const byItem = line.match(/^(?:item|lote)\s*(\d{1,3}(?:\.\d+)*)\s*[:\-–]?\s*(.{4,300})$/i);
    if (byItem) {
      const name = normalizeLine(byItem[2].replace(/^(?:descricao|descri[cç][aã]o)\s*[:\-]\s*/i, ''));
      const qtyFromCurrent = line.match(ITEM_QUANTITY_PATTERN);
      const nextLine = lines[i + 1] || '';
      const qtyFromNext = nextLine.match(ITEM_QUANTITY_PATTERN);
      const qty = qtyFromCurrent || qtyFromNext;
      
      // Extrair especificações das próximas linhas
      let specs = nextLine || 'Conforme edital/TR';
      for (let j = i + 2; j < Math.min(i + 5, lines.length); j++) {
        const specLine = lines[j];
        if (/^(?:item|lote)\s*\d+/i.test(specLine)) break;
        if (/(?:especifica[cç][aã]o|caracter[ií]stica|requisito|m[ií]nimo|m[áa]ximo)/i.test(specLine)) {
          specs += ' ' + specLine;
        }
      }
      
      pushItem(name, qty ? `${qty[1]} ${qty[2]}` : 'Não identificado', specs, line);
      continue;
    }

    // Padrão: Descrição + Quantidade na mesma linha
    const byQty = line.match(ITEM_QUANTITY_LINE_PATTERN);
    if (byQty) {
      const rawName = normalizeLine(
        byQty[1].replace(/^(?:item|lote)\s*\d{1,3}(?:\.\d+)*\s*[:\-–]?\s*/i, '')
      );
      const qty = `${byQty[2]} ${byQty[3]}`;
      if (!/(prazo|per[ií]odo|vig[êe]ncia)\s+de/i.test(rawName) && (hasStrongItemSignal(line) || hasStrongItemSignal(rawName))) {
        pushItem(rawName, qty, 'Conforme edital/TR', line);
      }
    }

    // Padrão: Código numérico + Descrição
    const coded = line.match(/^(\d{1,2}(?:\.\d+){1,3})\s+(.{10,300})$/);
    if (coded) {
      const candidate = normalizeLine(coded[2]);
      if (hasStrongItemSignal(candidate) && !looksLikeAdministrativeContext(candidate)) {
        pushItem(candidate, 'Não identificado', 'Conforme edital/TR', line);
      }
    }

    // Padrão: Tabela | Item | Descrição | Qtd |
    const tableMatch = line.match(/\|\s*(?:\d+)?\s*\|\s*(.{5,200})\s*\|\s*(\d+[\.,]?\d*)\s*(?:\||$)/i);
    if (tableMatch) {
      const name = normalizeLine(tableMatch[1]);
      const qty = tableMatch[2];
      if (hasStrongItemSignal(name)) {
        pushItem(name, `${qty} unidades`, 'Conforme edital/TR', line);
      }
    }

    // Limite aumentado para 50 itens
    if (items.length >= 50) break;
  }

  // Fallback: se não encontrou nenhum item, procurar por descrições de objeto
  if (items.length === 0) {
    for (const line of lines) {
      const candidate = normalizeLine(line.replace(/^(?:objeto|descri[cç][aã]o\s+do\s+objeto)\s*[:\-]\s*/i, ''));
      if (hasStrongItemSignal(candidate) && !looksLikeAdministrativeContext(candidate)) {
        pushItem(candidate, 'Não identificado', 'Conforme edital/TR', line);
      }
      if (items.length >= 10) break;
    }
  }

  return items;
};

const heuristicsEdital = (text) => {
  const lines = splitLines(text);

  const legal = collectByKeywords(lines, ['habilitação jurídica', 'contrato social', 'procuração', 'representante legal'], 10);
  const technical = collectByKeywords(lines, ['atestado', 'qualificação técnica', 'capacidade técnica', 'especificação técnica', 'comprovação técnica'], 12);
  const economic = collectByKeywords(lines, ['balanço patrimonial', 'índice de liquidez', 'patrimônio líquido', 'garantia de proposta', 'garantia contratual'], 10);
  const fiscal = collectByKeywords(lines, ['certidão', 'fgts', 'receita federal', 'dívida ativa', 'trabalhista', 'fazenda estadual', 'fazenda municipal'], 12);

  const itemCandidates = extractEditalItemsFromLines(lines);

  const openingKeywords = [
    /\babertura\b/i,
    /sess[aã]o\s+p[úu]blica/i,
    /data\s+da\s+sess[aã]o/i
  ];
  const publicationKeywords = [
    /publica[cç][aã]o/i,
    /divulga[cç][aã]o/i,
    /disponibiliza[cç][aã]o/i,
    /\baviso\b/i
  ];
  const impugnationKeywords = [
    /impugna[cç][aã]o/i,
    /prazo\s+.*impugna[cç][aã]o/i
  ];
  const clarificationKeywords = [
    /esclarecimentos?/i,
    /pedido\s+.*esclarecimento/i
  ];
  const proposalKeywords = [
    /prazo\s+.*propost/i,
    /(?:recebimento|envio|apresenta[cç][aã]o|entrega|abertura)\s+.*propost/i,
    /\bpropostas?\b/i
  ];
  const contractTermKeywords = [
    /vig[êe]ncia/i,
    /prazo\s+contratual/i,
    /dura[cç][aã]o\s+do\s+contrato/i
  ];

  const openingDateFallback =
    findDateLike(text, /(?:abertura(?:\s+da\s+sess[aã]o)?|sess[aã]o\s+p[úu]blica|data\s+da\s+sess[aã]o)\s*[:\-]?\s*([^\n]{4,90})/i) ||
    extractDateFromTextByKeywords(text, openingKeywords, 2);
  const openingTimeFallback =
    findTimeLike(text, /(?:abertura(?:\s+da\s+sess[aã]o)?|sess[aã]o\s+p[úu]blica|hora(?:\s+da\s+sess[aã]o)?)\s*[:\-]?\s*([^\n]{2,90})/i) ||
    extractTimeFromTextByKeywords(text, openingKeywords, 2);
  const publicationFallback =
    findDateLike(text, /(?:publica[cç][aã]o|divulga[cç][aã]o|disponibiliza[cç][aã]o)\s*[:\-]?\s*([^\n]{4,120})/i) ||
    extractDateFromTextByKeywords(text, publicationKeywords, 2);
  const impugnationFallback =
    findDateLike(text, /(?:impugna[cç][aã]o|prazo\s+para\s+impugna[cç][aã]o)\s*[:\-]?\s*([^\n]{4,140})/i) ||
    extractDateFromTextByKeywords(text, impugnationKeywords, 2);
  const clarificationFallback =
    findDateLike(text, /(?:esclarecimentos?|prazo\s+para\s+esclarecimentos?)\s*[:\-]?\s*([^\n]{4,140})/i) ||
    extractDateFromTextByKeywords(text, clarificationKeywords, 2);
  const proposalFallback =
    findDateLike(text, /(?:prazo(?:\s+final)?\s+para\s+(?:envio|apresenta[cç][aã]o|entrega)\s+de\s+propostas?|encerramento\s+de\s+propostas?|recebimento\s+das\s+propostas?)\s*[:\-]?\s*([^\n]{4,180})/i) ||
    extractDateFromTextByKeywords(text, proposalKeywords, 3);
  const contractTermFallback =
    findCapture(text, /(?:vig[êe]ncia|prazo\s+de\s+vig[êe]ncia|prazo\s+contratual|dura[cç][aã]o\s+do\s+contrato)\s*[:\-]?\s*([^\n]{3,180})/i) ||
    extractTextFromTextByKeywords(text, contractTermKeywords, 2, 180);

  const general = {
    openingDate: pickDateValue('', openingDateFallback),
    openingTime: pickTimeValue('', openingTimeFallback),
    portal: detectPortal(text),
    agency: detectAgency(text),
    modality: detectModality(text) || 'Não identificado',
    objectSummary: detectObjectSummary(text)
  };

  const deadlines = {
    publicationDate: pickDateValue('', publicationFallback),
    impugnationDeadline: pickDateValue('', impugnationFallback),
    clarificationDeadline: pickDateValue('', clarificationFallback),
    proposalDeadline: pickDateValue('', proposalFallback),
    contractTerm: pickContractTermValue('', contractTermFallback)
  };

  const risks = [];
  const lower = text.toLowerCase();
  if (lower.includes('multa')) risks.push('Verificar cláusulas de multa e penalidades para mitigar risco financeiro.');
  if (lower.includes('atestado') || lower.includes('qualificação técnica')) {
    risks.push('Exigências de qualificação técnica podem restringir participação sem acervo aderente.');
  }
  if (lower.includes('garantia')) risks.push('Necessidade de garantia contratual pode impactar fluxo de caixa.');
  if (deadlines.proposalDeadline === 'Não identificado') {
    risks.push('Prazo de envio da proposta não identificado automaticamente; revisar cronograma manualmente.');
  }
  if (risks.length === 0) risks.push('Monitorar retificações do edital e respostas de esclarecimentos.');

  const priceRegistry = /ata\s+de\s+registro\s+de\s+pre[cç]os|registro\s+de\s+pre[cç]os/i.test(text)
    ? {
        ataNumber: findCapture(text, /(?:ata(?:\s+de\s+registro\s+de\s+pre[cç]os)?)\s*(?:n[º°.]?|n[oº]|no)?\s*[:\-]?\s*([0-9]{1,8}[\/\-.][0-9]{2,4})/i) || undefined,
        year: findCapture(text, /(?:exerc[ií]cio|ano)\s*[:\-]?\s*(20\d{2})/i) || undefined,
        managingAgency: general.agency !== 'Não identificado' ? general.agency : undefined,
        status: 'vigente',
        portal: general.portal !== 'Não identificado' ? general.portal : undefined,
        modality: general.modality !== 'Não identificado' ? general.modality : undefined,
        alerts: ['Confirmar saldo e vigência da ata antes da adesão.']
      }
    : undefined;

  return {
    analysisType: 'edital',
    general,
    deadlines,
    requirements: {
      legal,
      technical,
      economic,
      fiscal
    },
    items:
      itemCandidates.length > 0
        ? itemCandidates
        : [
            {
              name: general.objectSummary || 'Item principal não identificado',
              quantity: 'Não identificado',
              specs: 'Conforme edital/TR'
            }
          ],
    risks,
    ...(priceRegistry ? { priceRegistry } : {})
  };
};

const normalizeEditalResponse = (candidate, fallback) => {
  if (!candidate || typeof candidate !== 'object') return fallback;

  const generalCandidate = candidate.general && typeof candidate.general === 'object' ? candidate.general : {};
  const deadlineCandidate = candidate.deadlines && typeof candidate.deadlines === 'object' ? candidate.deadlines : {};
  const requirementsCandidate =
    candidate.requirements && typeof candidate.requirements === 'object' ? candidate.requirements : {};

  const normalized = {
    analysisType: 'edital',
    general: {
      openingDate: pickDateValue(generalCandidate.openingDate, fallback.general.openingDate),
      openingTime: pickTimeValue(generalCandidate.openingTime, fallback.general.openingTime),
      portal: normalizeLine(generalCandidate.portal || fallback.general.portal || 'Não identificado'),
      agency: normalizeLine(generalCandidate.agency || fallback.general.agency || 'Não identificado'),
      modality: normalizeLine(generalCandidate.modality || fallback.general.modality || 'Não identificado'),
      objectSummary: normalizeLine(generalCandidate.objectSummary || fallback.general.objectSummary || 'Não identificado')
    },
    deadlines: {
      publicationDate: pickDateValue(deadlineCandidate.publicationDate, fallback.deadlines.publicationDate),
      impugnationDeadline: pickDateValue(deadlineCandidate.impugnationDeadline, fallback.deadlines.impugnationDeadline),
      clarificationDeadline: pickDateValue(deadlineCandidate.clarificationDeadline, fallback.deadlines.clarificationDeadline),
      proposalDeadline: pickDateValue(deadlineCandidate.proposalDeadline, fallback.deadlines.proposalDeadline),
      contractTerm: pickContractTermValue(deadlineCandidate.contractTerm, fallback.deadlines.contractTerm)
    },
    requirements: {
      legal: ensureArray(requirementsCandidate.legal).length
        ? ensureArray(requirementsCandidate.legal)
        : fallback.requirements.legal,
      technical: ensureArray(requirementsCandidate.technical).length
        ? ensureArray(requirementsCandidate.technical)
        : fallback.requirements.technical,
      economic: ensureArray(requirementsCandidate.economic).length
        ? ensureArray(requirementsCandidate.economic)
        : fallback.requirements.economic,
      fiscal: ensureArray(requirementsCandidate.fiscal).length
        ? ensureArray(requirementsCandidate.fiscal)
        : fallback.requirements.fiscal
    },
    items: Array.isArray(candidate.items) && candidate.items.length > 0
      ? candidate.items
          .map((item) => ({
            name: normalizeLine(item?.name || ''),
            quantity: normalizeLine(item?.quantity || 'Não identificado'),
            specs: normalizeLine(item?.specs || 'Não identificado')
          }))
          .filter((item) => item.name && !isWeakItemName(item.name))
          .reduce((acc, item) => {
            const key = normalizeItemName(item.name);
            if (!key || acc.seen.has(key)) return acc;
            acc.seen.add(key);
            acc.list.push(item);
            return acc;
          }, { list: [], seen: new Set() }).list
          .slice(0, 20)
      : fallback.items,
    risks: ensureArray(candidate.risks).length ? ensureArray(candidate.risks) : fallback.risks
  };

  if (candidate.priceRegistry && typeof candidate.priceRegistry === 'object') {
    normalized.priceRegistry = candidate.priceRegistry;
  } else if (fallback.priceRegistry) {
    normalized.priceRegistry = fallback.priceRegistry;
  }

  return normalized;
};

const buildTrFallbackResponse = (payload, reason) => {
  const fallbackReason = normalizeLine(reason || 'Falha ao processar o TR nesta tentativa.');
  return {
    analysisType: 'tr',
    trSummary:
      'Análise de contingência gerada automaticamente. Revise o caderno técnico e execute novamente para obter estrutura completa.',
    analyzedModel: {
      modelName: payload.analyzedModelName,
      manufacturer: payload.analyzedModelManufacturer || 'Não informado',
      providedSpecs: payload.analyzedModelSpecs
    },
    termRequirements: ['Validação automática do TR indisponível nesta tentativa'],
    technicalNotebook: [
      {
        termRequirement: 'Validação automática do TR indisponível nesta tentativa',
        meetsRequirement: 'NAO_ATENDE',
        datasheetEvidence: 'Comparação TR x datasheet indisponível nesta tentativa.',
        rationale: fallbackReason
      }
    ],
    compliantEquipment: [],
    complianceOverview: {
      totalRequirements: 1,
      metRequirements: 0,
      fullCompliance: false
    }
  };
};

const extractTrRequirements = (text) => {
  const lines = splitLines(text);
  const requirements = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const looksLikeRequirement =
      /\b(deve|devera|deverá|obrigat[oó]rio|minim[oa]|suportar|compat[ií]vel|comprovar|atender)\b/.test(lower) ||
      /\brequisito\b/.test(lower);

    if (looksLikeRequirement && line.length >= 12 && line.length <= 320) {
      requirements.push(line);
    }

    if (requirements.length >= 20) break;
  }

  const uniqueRequirements = unique(requirements);
  if (uniqueRequirements.length >= 5) return uniqueRequirements.slice(0, 20);

  const fillers = [
    'Comprovação de aderência técnica aos requisitos funcionais do TR.',
    'Validação de capacidade de implantação e suporte conforme TR.',
    'Atendimento aos critérios de segurança, disponibilidade e desempenho.',
    'Compatibilidade com o ambiente e integrações exigidas no TR.',
    'Atendimento às condições de garantia e níveis de serviço definidos.'
  ];

  return unique([...uniqueRequirements, ...fillers]).slice(0, 20);
};

const heuristicsTr = (payload, trText, datasheetText = '') => {
  const termRequirements = extractTrRequirements(trText);
  const corpus = `${payload.analyzedModelSpecs || ''} ${datasheetText || ''}`.toLowerCase();

  const technicalNotebook = termRequirements.slice(0, 12).map((requirement) => {
    const tokens = tokenize(requirement).slice(0, 8);
    const matched = tokens.filter((token) => corpus.includes(token));
    const meetsRequirement = matched.length >= 2 ? 'ATENDE' : 'NAO_ATENDE';

    return {
      termRequirement: requirement,
      meetsRequirement,
      datasheetEvidence:
        meetsRequirement === 'ATENDE'
          ? `TR exige ${requirement}. Modelo possui evidências para: ${matched.join(', ') || 'itens relacionados'}.`
          : `TR exige ${requirement}. Evidência suficiente não identificada nas especificações informadas.`,
      rationale:
        meetsRequirement === 'ATENDE'
          ? 'Requisito considerado aderente com base nas especificações fornecidas.'
          : 'Requisito não comprovado integralmente com as informações fornecidas.'
    };
  });

  const metRequirements = technicalNotebook.filter((item) => item.meetsRequirement === 'ATENDE').length;
  const totalRequirements = technicalNotebook.length;
  const fullCompliance = totalRequirements > 0 && metRequirements === totalRequirements;

  const complianceRate = totalRequirements > 0 ? metRequirements / totalRequirements : 0;
  const compliantEquipment = complianceRate >= 0.6
    ? [
        {
          model: payload.analyzedModelName,
          manufacturer: payload.analyzedModelManufacturer || 'Não informado',
          rationale:
            fullCompliance
              ? 'Modelo atende integralmente aos requisitos analisados do TR.'
              : 'Modelo apresenta aderência majoritária aos requisitos analisados do TR.'
        }
      ]
    : [];

  const trSummary = [
    `TR analisado para o modelo ${payload.analyzedModelName}.`,
    `Aderência identificada em ${metRequirements} de ${totalRequirements} requisitos avaliados.`,
    complianceRate >= 0.6
      ? 'Recomendação: seguir para avaliação comercial detalhada.'
      : 'Recomendação: revisar lacunas técnicas antes de avançar.'
  ].join(' ');

  return {
    analysisType: 'tr',
    trSummary,
    analyzedModel: {
      modelName: payload.analyzedModelName,
      manufacturer: payload.analyzedModelManufacturer || 'Não informado',
      providedSpecs: payload.analyzedModelSpecs
    },
    termRequirements,
    technicalNotebook,
    compliantEquipment,
    complianceOverview: {
      totalRequirements,
      metRequirements,
      fullCompliance
    }
  };
};

const normalizeTrResponse = (candidate, fallback, payload) => {
  if (!candidate || typeof candidate !== 'object') return fallback;

  const notebook = Array.isArray(candidate.technicalNotebook)
    ? candidate.technicalNotebook
        .map((row) => {
          const meets = String(row?.meetsRequirement || '').toUpperCase() === 'ATENDE' ? 'ATENDE' : 'NAO_ATENDE';
          const requirement = normalizeLine(row?.termRequirement || 'Requisito não identificado');
          return {
            termRequirement: requirement,
            meetsRequirement: meets,
            datasheetEvidence: normalizeLine(row?.datasheetEvidence || ''),
            rationale: normalizeLine(row?.rationale || (meets === 'ATENDE'
              ? 'Requisito atendido conforme análise automática.'
              : 'Requisito não atendido conforme análise automática.'))
          };
        })
        .filter((row) => row.termRequirement)
        .slice(0, 20)
    : [];

  const termRequirements = ensureArray(candidate.termRequirements).length
    ? ensureArray(candidate.termRequirements)
    : fallback.termRequirements;

  const finalNotebook = notebook.length ? notebook : fallback.technicalNotebook;
  const met = finalNotebook.filter((item) => item.meetsRequirement === 'ATENDE').length;
  const total = finalNotebook.length;

  const compliantEquipment = Array.isArray(candidate.compliantEquipment)
    ? candidate.compliantEquipment
        .map((item) => ({
          model: normalizeLine(item?.model || ''),
          manufacturer: normalizeLine(item?.manufacturer || 'Não informado'),
          rationale: normalizeLine(item?.rationale || 'Aderência técnica identificada.')
        }))
        .filter((item) => item.model)
        .slice(0, 20)
    : fallback.compliantEquipment;

  return {
    analysisType: 'tr',
    trSummary: normalizeLine(candidate.trSummary || fallback.trSummary || 'Resumo de TR não identificado.'),
    analyzedModel: {
      modelName: normalizeLine(candidate?.analyzedModel?.modelName || payload.analyzedModelName),
      manufacturer: normalizeLine(candidate?.analyzedModel?.manufacturer || payload.analyzedModelManufacturer || 'Não informado'),
      providedSpecs: normalizeLine(candidate?.analyzedModel?.providedSpecs || payload.analyzedModelSpecs)
    },
    termRequirements,
    technicalNotebook: finalNotebook,
    compliantEquipment,
    complianceOverview: {
      totalRequirements: Number(candidate?.complianceOverview?.totalRequirements || total),
      metRequirements: Number(candidate?.complianceOverview?.metRequirements || met),
      fullCompliance:
        typeof candidate?.complianceOverview?.fullCompliance === 'boolean'
          ? candidate.complianceOverview.fullCompliance
          : total > 0 && met === total
    }
  };
};

const handleEditalRequest = async (payload = {}) => {
  const requestSchemaErrors = validateBySchema(ANALYSIS_SCHEMAS.request_edital, payload);
  if (requestSchemaErrors.length > 0) {
    return success({
      message: `Payload inválido para request_edital. ${schemaErrorsToMessage(requestSchemaErrors)}`,
      errors: requestSchemaErrors
    }, 400);
  }

  try {
    const { mimeType, buffer } = parseDataUri(payload.fileDataUri);
    if (!mimeType.includes('pdf')) {
      return messageResponse(400, 'fileDataUri deve ser PDF (data:application/pdf;base64,...).');
    }

    let extracted = { text: '', totalPages: 0 };
    try {
      extracted = await extractPdfText(buffer);
    } catch (extractError) {
      console.warn('Falha ao extrair texto do PDF de edital. Seguindo com fallback.', extractError?.message || extractError);
    }

    const fallback = heuristicsEdital(extracted.text || '');
    if (!extracted.text) {
      fallback.risks = unique([
        ...(fallback.risks || []),
        'PDF sem texto pesquisável. Revisar arquivo original ou utilizar versão OCR para maior precisão.'
      ]);
    }

    let aiResponse = null;
    try {
      aiResponse = await runGeminiStructured({ mode: 'edital', payload, extractedText: extracted.text, totalPages: extracted.totalPages });
    } catch (geminiError) {
      console.warn('Falha no fluxo Gemini de edital. Seguindo para fallback local.', geminiError?.message || geminiError);
    }

    if (!aiResponse && extracted.text) {
      aiResponse = await runOpenAiStructured({ mode: 'edital', payload, text: extracted.text, totalPages: extracted.totalPages });
    }

    const normalized = normalizeEditalResponse(aiResponse, fallback);
    const responseSchemaErrors = validateBySchema(ANALYSIS_SCHEMAS.response_edital, normalized);
    if (responseSchemaErrors.length > 0) {
      return success({
        message: `Response fora do schema response_edital. ${schemaErrorsToMessage(responseSchemaErrors)}`,
        errors: responseSchemaErrors
      }, 500);
    }

    return success(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao processar edital.';
    return messageResponse(500, message);
  }
};

const handleTrRequest = async (payload = {}) => {
  const requestSchemaErrors = validateBySchema(ANALYSIS_SCHEMAS.request_tr, payload);
  if (requestSchemaErrors.length > 0) {
    return success({
      message: `Payload inválido para request_tr. ${schemaErrorsToMessage(requestSchemaErrors)}`,
      errors: requestSchemaErrors
    }, 400);
  }

  try {
    const { mimeType, buffer } = parseDataUri(payload.fileDataUri);
    if (!mimeType.includes('pdf')) {
      return messageResponse(400, 'fileDataUri deve ser PDF (data:application/pdf;base64,...).');
    }

    let trTextResponse = { text: '', totalPages: 0 };
    try {
      trTextResponse = await extractPdfText(buffer);
    } catch (extractError) {
      console.warn('Falha ao extrair texto do PDF de TR. Seguindo com fallback.', extractError?.message || extractError);
    }

    let datasheetText = '';
    if (payload.datasheetFileDataUri && typeof payload.datasheetFileDataUri === 'string') {
      try {
        const datasheet = parseDataUri(payload.datasheetFileDataUri);
        if (datasheet.mimeType.includes('pdf')) {
          const parsed = await extractPdfText(datasheet.buffer);
          datasheetText = parsed.text;
        } else {
          datasheetText = cleanText(datasheet.buffer.toString('utf8'), 30000);
        }
      } catch {
        datasheetText = '';
      }
    }

    const fallback = heuristicsTr(payload, trTextResponse.text || '', datasheetText);

    try {
      let aiResponse = null;
      try {
        aiResponse = await runGeminiStructured({ mode: 'tr', payload, extractedText: trTextResponse.text, totalPages: trTextResponse.totalPages });
      } catch (geminiError) {
        console.warn('Falha no fluxo Gemini de TR. Seguindo para fallback local.', geminiError?.message || geminiError);
      }

      if (!aiResponse && trTextResponse.text) {
        aiResponse = await runOpenAiStructured({
          mode: 'tr',
          payload,
          text: trTextResponse.text,
          datasheetText
        });
      }

      const normalized = normalizeTrResponse(aiResponse, fallback, payload);
      const responseSchemaErrors = validateBySchema(ANALYSIS_SCHEMAS.response_tr, normalized);
      if (responseSchemaErrors.length > 0) {
        return success({
          message: `Response fora do schema response_tr. ${schemaErrorsToMessage(responseSchemaErrors)}`,
          errors: responseSchemaErrors
        }, 500);
      }
      return success(normalized);
    } catch (innerError) {
      const message = innerError instanceof Error ? innerError.message : 'Falha ao processar TR.';
      const fallbackResponse = buildTrFallbackResponse(payload, message);
      const responseSchemaErrors = validateBySchema(ANALYSIS_SCHEMAS.response_tr, fallbackResponse);
      if (responseSchemaErrors.length > 0) {
        return success({
          message: `Response fallback fora do schema response_tr. ${schemaErrorsToMessage(responseSchemaErrors)}`,
          errors: responseSchemaErrors
        }, 500);
      }
      return success(fallbackResponse);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao processar TR.';
    return messageResponse(500, message);
  }
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return handleCORS();
  }

  let user;
  try {
    user = await authenticateUser(event.headers || {});
  } catch (authError) {
    const msg = authError instanceof Error ? authError.message : 'Não autenticado';
    return unauthorizedResponse(msg || 'Não autenticado');
  }

  try {
    requireRole(user, USER_ALLOWED_ROLES);
  } catch {
    return forbiddenResponse();
  }

  const method = event.httpMethod;
  const segments = getRouteSegments(event.path, 'ai-analysis');
  const body = parseJsonBody(event);

  if (method === 'POST' && segments[0] === 'edital') {
    return await handleEditalRequest(body);
  }

  if (method === 'POST' && segments[0] === 'tr') {
    return await handleTrRequest(body);
  }

  return error('Rota não encontrada', 404);
}
