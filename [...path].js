/* import { handleCORS } from '../lib/response.js'; // A lógica de CORS será tratada diretamente para Vercel */
import { authenticateUser } from '../lib/auth.js';

let pdfPolyfillsReady = false;
const ensurePdfJsPolyfills = async () => { // Moved to api/ai-analysis/[...path].js
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
    // optional: segue sem polyfill, com fallback heurístico
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

const USER_ALLOWED_ROLES = new Set(['ADMIN', 'DIRECTOR', 'MANAGER', 'SELLER', 'MASTER', 'USER', 'PRE_SALES']);
const MAX_TEXT_CHARS = 25000; // Reduzido para análise mais rápida

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-company-id, x-user-id, x-user-role',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
};

const applyCors = (res) => {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
};

const getRouteSegmentsFromUrl = (url = '', functionName = 'ai-analysis') => {
  const path = new URL(url, 'http://localhost').pathname;
  const apiPrefix = `/api/${functionName}`;
  if (path.startsWith(apiPrefix)) {
    return path.slice(apiPrefix.length).split('/').filter(Boolean);
  }
  return [];
};

const normalizeLine = (line) => String(line || '').replace(/[ \t]+/g, ' ').trim();

const cleanText = (value, max = MAX_TEXT_CHARS) => {
  if (typeof value !== 'string') return '';
  const normalized = value
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

const extractPdfTextDetailed = async (buffer) => {
  if (!buffer || buffer.length === 0) {
    return { text: '', totalPages: 0, pages: [] };
  }

  const mod = await getPdfParseModule();
  if (!mod) return { text: '', totalPages: 0, pages: [] };

  const ParserCtor = typeof mod?.PDFParse === 'function' ? mod.PDFParse : null;
  if (ParserCtor) {
    const parser = new ParserCtor({ data: buffer });
    try {
      const parsed = await parser.getText();
      const rawPages = Array.isArray(parsed?.pages) ? parsed.pages : [];
      const pages = rawPages
        .map((page, index) => {
          const num = Number(page?.num || page?.pageNumber || index + 1);
          const text = cleanText(page?.text || '', 50000);
          return {
            num: Number.isFinite(num) ? num : index + 1,
            text
          };
        })
        .filter((page) => page.text);

      const text = cleanText(parsed?.text || '', MAX_TEXT_CHARS);
      return {
        text,
        totalPages: Number(parsed?.total || pages.length || 0),
        pages
      };
    } catch {
      return { text: '', totalPages: 0, pages: [] };
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  const legacyParseFn = typeof mod?.default === 'function' ? mod.default : null;
  if (!legacyParseFn) return { text: '', totalPages: 0, pages: [] };

  try {
    const parsed = await legacyParseFn(buffer);
    const text = cleanText(parsed?.text || '', MAX_TEXT_CHARS);
    return {
      text,
      totalPages: Number(parsed?.numpages || 0),
      pages: []
    };
  } catch {
    return { text: '', totalPages: 0, pages: [] };
  }
};

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

const extractTimeFromValue = (value) => {
  const text = String(value || '');
  const hhmm = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmm) return `${pad2(hhmm[1])}:${hhmm[2]}`;

  const hh = text.match(/\b([01]?\d|2[0-3])h(?:\s*([0-5]\d))?\b/i);
  if (hh) return `${pad2(hh[1])}:${hh[2] || '00'}`;

  return '';
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
    /(?:[óo]rg[aã]o\s+licitante|entidade\s+demandante|unidade\s+demandante|secretaria|órgão gerenciador)\s*[:\-]\s*([^\n]{3,220})/i
  );
  if (direct) return direct;

  const heuristic = findCapture(
    text,
    /(prefeitura(?:\s+municipal)?\s+de\s+[^\n,;]{3,140}|governo\s+do\s+estado\s+de\s+[^\n,;]{3,140}|tribunal\s+[^\n,;]{3,140}|minist[eé]rio\s+[^\n,;]{3,140})/i
  );

  return heuristic || 'Não identificado';
};

const detectObjectSummary = (text) => {
  const objectLine = findCapture(text, /(?:objeto(?:\s+da\s+licita[cç][aã]o)?)\s*[:\-]\s*([\s\S]{10,1200})/i);
  if (objectLine) return objectLine.slice(0, 550);

  const lines = splitLines(text);
  const candidate = lines.find((line) => /contrata[cç][aã]o|aquisi[cç][aã]o|fornecimento|servi[cç]o|loca[cç][aã]o|software/i.test(line));
  return (candidate || 'Não identificado').slice(0, 550);
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

const ensureArray = (value, limit = 20) =>
  (Array.isArray(value) ? value : [])
    .map((item) => normalizeLine(String(item || '')))
    .filter(Boolean)
    .slice(0, limit);

const tokenize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .filter(
      (token) =>
        ![
          'para',
          'com',
          'pela',
          'pelo',
          'uma',
          'como',
          'deve',
          'devera',
          'sobre',
          'entre',
          'este',
          'esta',
          'quando',
          'sera',
          'serao',
          'item',
          'lote',
          'modelo',
          'arquivo',
          'documento',
          'termo',
          'referencia',
          'nao',
          'identificado'
        ].includes(token)
    );

const normalizeItemName = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ITEM_STRONG_SIGNAL_REGEX =
  /\b(fornecimento|aquisi[cç][aã]o|loca[cç][aã]o|licen[cç]a|servi[cç]o|solu[cç][aã]o|equipamento|sistema|software|plataforma|assinatura|subscri[cç][aã]o|m[oó]dulo|ferramenta|aplica[cç][aã]o|implantac[aã]o|manuten[cç][aã]o|suporte|treinamento|consultoria|notebook|desktop|computador|servidor|storage|switch|roteador|impressora|scanner|monitor|tablet|c[âa]mera|link\s+de\s+internet)\b/i;
const ITEM_CONTEXT_BLOCKLIST_REGEX =
  /\b(prazo|vig[êe]ncia|per[ií]odo|abertura|sess[aã]o|impugna[cç][aã]o|esclarecimento|proposta|publica[cç][aã]o|habilita[cç][aã]o|qualifica[cç][aã]o|certid[aã]o|atestado|cl[aá]usula|penalidade|multa|entrega|execu[cç][aã]o|objeto|ata\s+de\s+registro\s+de\s+pre[cç]os|nota\s+de\s+empenho|ordem\s+de\s+servi[cç]o|federativos?)\b/i;
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
  'impressora',
  'scanner',
  'monitor',
  'tablet',
  'camera',
  'licenca',
  'plataforma',
  'assinatura',
  'subscricao'
]);
const ITEM_QUANTITY_PATTERN = /(\d+[\.,]?\d*)\s*(un|und|unidade|licen[cç]a|kit|meses?|anos?)/i;
const ITEM_QUANTITY_LINE_PATTERN = /^(.{8,220})\s+(\d+[\.,]?\d*)\s*(un|und|unidade|licen[cç]a|kit|meses?|anos?)\b/i;

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
  if (isWeakItemName(name)) return false;

  const signalCorpus = `${name || ''} ${context || ''}`;
  const hasSignal = hasStrongItemSignal(signalCorpus);
  const quantityNorm = normalizeItemName(quantity);
  const contextNorm = normalizeItemName(context);

  if (/\b(mes|meses|ano|anos)\b/.test(quantityNorm) && !hasSignal) return false;
  if (looksLikeAdministrativeContext(contextNorm) && !hasSignal) return false;

  return true;
};

const findFirstAcrossPages = (pages, callback) => {
  for (const page of pages) {
    const found = callback(page.text, page.num);
    if (found) {
      return { value: found, page: page.num };
    }
  }
  return { value: '', page: null };
};

const extractPageAwareDate = (pages, patterns, keywordPatterns = [], lookahead = 2) => {
  const found = findFirstAcrossPages(pages, (text) => {
    for (const regex of patterns) {
      const m = text.match(regex);
      if (!m) continue;
      const date = extractDateFromValue(m[1] || m[0]);
      if (date) return date;
    }
    return '';
  });
  if (found.value || !keywordPatterns.length) return found;
  return findFirstAcrossPages(pages, (text) =>
    extractDateFromLineWindows(splitLines(text), keywordPatterns, lookahead)
  );
};

const extractPageAwareText = (pages, patterns, max = 240, keywordPatterns = [], lookahead = 2) => {
  const found = findFirstAcrossPages(pages, (text) => {
    for (const regex of patterns) {
      const m = text.match(regex);
      if (!m) continue;
      const value = normalizeLine(m[1] || m[0]);
      if (value) return value.slice(0, max);
    }
    return '';
  });
  if (found.value || !keywordPatterns.length) return found;
  return findFirstAcrossPages(pages, (text) =>
    extractTextFromLineWindows(splitLines(text), keywordPatterns, lookahead, max)
  );
};

const extractEditalItemsPageAware = (pages, fallbackLines = []) => {
  const items = [];
  const seen = new Set();

  const pushItem = (rawName, rawQuantity, rawSpecs = 'Conforme edital/TR', context = '') => {
    const name = normalizeLine(
      String(rawName || '')
        .replace(/^(?:item|lote)\s*\d{1,3}(?:\.\d+)*\s*[:\-–]?\s*/i, '')
        .replace(/^\d{1,3}(?:\.\d+){1,4}\s+/, '')
        .replace(/\s+\d+[\.,]?\d*\s*(un|und|unidade|licen[cç]a|kit|meses?|anos?)\s*$/i, '')
    );
    if (!name || !shouldAcceptItemCandidate(name, rawQuantity, `${rawSpecs} ${context}`)) return;

    const normalized = normalizeItemName(name);
    if (!normalized || seen.has(normalized)) return;

    const quantity = normalizeLine(rawQuantity || 'Não identificado');
    const specs = normalizeLine(rawSpecs || 'Conforme edital/TR');

    seen.add(normalized);
    items.push({ name, quantity: quantity || 'Não identificado', specs: specs || 'Conforme edital/TR' });
  };

  for (const page of pages) {
    const lines = splitLines(page.text);

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      const itemPattern = line.match(/^(?:item|lote)\s*(\d{1,3}(?:\.\d+)*)\s*[:\-–]?\s*(.{4,220})$/i);
      if (itemPattern) {
        const name = normalizeLine(itemPattern[2].replace(/^(?:descricao|descri[cç][aã]o)\s*[:\-]\s*/i, ''));
        const qtyFromCurrent = line.match(ITEM_QUANTITY_PATTERN);
        const nextLine = lines[i + 1] || '';
        const qtyFromNext = nextLine.match(ITEM_QUANTITY_PATTERN);
        const qty = qtyFromCurrent || qtyFromNext;
        pushItem(name, qty ? `${qty[1]} ${qty[2]}` : 'Não identificado', nextLine || 'Conforme edital/TR', line);
        continue;
      }

      const quantityPattern = line.match(ITEM_QUANTITY_LINE_PATTERN);
      if (quantityPattern) {
        const rawName = normalizeLine(
          quantityPattern[1].replace(/^(?:item|lote)\s*\d{1,3}(?:\.\d+)*\s*[:\-–]?\s*/i, '')
        );
        const qty = `${quantityPattern[2]} ${quantityPattern[3]}`;
        if (!/(prazo|per[ií]odo|vig[êe]ncia)\s+de/i.test(rawName) && (hasStrongItemSignal(line) || hasStrongItemSignal(rawName))) {
          pushItem(rawName, qty, 'Conforme edital/TR', line);
        }
      }

      const codedPattern = line.match(/^(\d{1,2}(?:\.\d+){1,3})\s+(.{10,240})$/);
      if (codedPattern) {
        const candidate = normalizeLine(codedPattern[2]);
        if (hasStrongItemSignal(candidate) && !looksLikeAdministrativeContext(candidate)) {
          pushItem(candidate, 'Não identificado', 'Conforme edital/TR', line);
        }
      }

      if (items.length >= 20) break;
    }

    if (items.length >= 20) break;
  }

  if (items.length === 0) {
    for (const line of fallbackLines) {
      const fallbackCandidate = normalizeLine(line.replace(/^(?:objeto|descri[cç][aã]o\s+do\s+objeto)\s*[:\-]\s*/i, ''));
      if (hasStrongItemSignal(fallbackCandidate) && !looksLikeAdministrativeContext(fallbackCandidate)) {
        pushItem(fallbackCandidate, 'Não identificado', 'Conforme edital/TR', line);
      }
      if (items.length >= 6) break;
    }
  }

  return items;
};

const buildPageSignals = (pages) => {
  const out = {
    openingDatePage: null,
    proposalDeadlinePage: null,
    publicationPage: null,
    impugnationPage: null,
    clarificationPage: null,
    agencyPage: null,
    modalityPage: null,
    objectPage: null,
    portalPage: null
  };

  return {
    out,
    set(key, page) {
      if (out[key] == null && page != null) out[key] = page;
    }
  };
};

const heuristicsEdital = (text, pages = []) => {
  const lines = splitLines(text);
  const pageSignals = buildPageSignals(pages);

  const legal = collectByKeywords(lines, ['habilitação jurídica', 'contrato social', 'procuração', 'representante legal'], 12);
  const technical = collectByKeywords(lines, ['atestado', 'qualificação técnica', 'capacidade técnica', 'especificação técnica', 'comprovação técnica', 'amostra'], 14);
  const economic = collectByKeywords(lines, ['balanço patrimonial', 'índice de liquidez', 'patrimônio líquido', 'garantia de proposta', 'garantia contratual'], 12);
  const fiscal = collectByKeywords(lines, ['certidão', 'fgts', 'receita federal', 'dívida ativa', 'trabalhista', 'fazenda estadual', 'fazenda municipal'], 14);

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

  const openingDateFound = extractPageAwareDate(pages, [
    /(?:abertura(?:\s+da\s+sess[aã]o)?|sess[aã]o\s+p[úu]blica|data\s+da\s+sess[aã]o)\s*[:\-]?\s*([^\n]{4,100})/i,
    /(?:data\s+de\s+abertura)\s*[:\-]?\s*([^\n]{4,100})/i
  ], openingKeywords, 2);
  pageSignals.set('openingDatePage', openingDateFound.page);

  const openingTimeFound = findFirstAcrossPages(pages, (pageText) => {
    const capture = findCapture(pageText, /(?:abertura(?:\s+da\s+sess[aã]o)?|sess[aã]o\s+p[úu]blica|hora(?:\s+da\s+sess[aã]o)?)\s*[:\-]?\s*([^\n]{2,90})/i);
    return extractTimeFromValue(capture) || extractTimeFromLineWindows(splitLines(pageText), openingKeywords, 2);
  });

  const publicationDateFound = extractPageAwareDate(pages, [
    /(?:publica[cç][aã]o|divulga[cç][aã]o|disponibiliza[cç][aã]o)\s*[:\-]?\s*([^\n]{4,120})/i
  ], publicationKeywords, 2);
  pageSignals.set('publicationPage', publicationDateFound.page);

  const impugnationFound = extractPageAwareDate(pages, [
    /(?:impugna[cç][aã]o|prazo\s+para\s+impugna[cç][aã]o)\s*[:\-]?\s*([^\n]{4,140})/i,
    /(?:ate|até)\s+([^\n]{4,120})\s+para\s+impugna[cç][aã]o/i
  ], impugnationKeywords, 2);
  pageSignals.set('impugnationPage', impugnationFound.page);

  const clarificationFound = extractPageAwareDate(pages, [
    /(?:esclarecimentos?|prazo\s+para\s+esclarecimentos?)\s*[:\-]?\s*([^\n]{4,140})/i,
    /(?:ate|até)\s+([^\n]{4,120})\s+para\s+esclarecimentos?/i
  ], clarificationKeywords, 2);
  pageSignals.set('clarificationPage', clarificationFound.page);

  const proposalFound = extractPageAwareDate(pages, [
    /(?:prazo(?:\s+final)?\s+para\s+(?:envio|apresenta[cç][aã]o|entrega)\s+de\s+propostas?|encerramento\s+de\s+propostas?|recebimento\s+das\s+propostas?)\s*[:\-]?\s*([^\n]{4,180})/i,
    /(?:propostas?|recebimento\s+das\s+propostas?)\s*(?:ate|até|:|-)?\s*([^\n]{4,120})/i
  ], proposalKeywords, 3);
  pageSignals.set('proposalDeadlinePage', proposalFound.page);

  const contractTermFound = extractPageAwareText(
    pages,
    [/(?:vig[êe]ncia|prazo\s+de\s+vig[êe]ncia|prazo\s+contratual|dura[cç][aã]o\s+do\s+contrato)\s*[:\-]?\s*([^\n]{3,180})/i],
    180,
    contractTermKeywords,
    2
  );

  const agencyFound = findFirstAcrossPages(pages, (pageText) => {
    const value = detectAgency(pageText);
    return value && value !== 'Não identificado' ? value : '';
  });
  pageSignals.set('agencyPage', agencyFound.page);

  const modalityFound = findFirstAcrossPages(pages, (pageText) => {
    const value = detectModality(pageText);
    return value || '';
  });
  pageSignals.set('modalityPage', modalityFound.page);

  const portalFound = findFirstAcrossPages(pages, (pageText) => {
    const value = detectPortal(pageText);
    return value && value !== 'Não identificado' ? value : '';
  });
  pageSignals.set('portalPage', portalFound.page);

  const objectFound = findFirstAcrossPages(pages, (pageText) => {
    const value = detectObjectSummary(pageText);
    return value && value !== 'Não identificado' ? value : '';
  });
  pageSignals.set('objectPage', objectFound.page);

  const items = extractEditalItemsPageAware(pages, lines);

  const openingDateFallback =
    extractDateFromValue(findCapture(text, /(?:abertura(?:\s+da\s+sess[aã]o)?|sess[aã]o\s+p[úu]blica|data\s+da\s+sess[aã]o)\s*[:\-]?\s*([^\n]{4,100})/i)) ||
    extractDateFromTextByKeywords(text, openingKeywords, 2);
  const openingTimeFallback =
    extractTimeFromValue(findCapture(text, /(?:abertura(?:\s+da\s+sess[aã]o)?|sess[aã]o\s+p[úu]blica|hora(?:\s+da\s+sess[aã]o)?)\s*[:\-]?\s*([^\n]{2,90})/i)) ||
    extractTimeFromTextByKeywords(text, openingKeywords, 2);
  const publicationFallback =
    extractDateFromValue(findCapture(text, /(?:publica[cç][aã]o|divulga[cç][aã]o|disponibiliza[cç][aã]o)\s*[:\-]?\s*([^\n]{4,120})/i)) ||
    extractDateFromTextByKeywords(text, publicationKeywords, 2);
  const impugnationFallback =
    extractDateFromValue(findCapture(text, /(?:impugna[cç][aã]o|prazo\s+para\s+impugna[cç][aã]o)\s*[:\-]?\s*([^\n]{4,140})/i)) ||
    extractDateFromTextByKeywords(text, impugnationKeywords, 2);
  const clarificationFallback =
    extractDateFromValue(findCapture(text, /(?:esclarecimentos?|prazo\s+para\s+esclarecimentos?)\s*[:\-]?\s*([^\n]{4,140})/i)) ||
    extractDateFromTextByKeywords(text, clarificationKeywords, 2);
  const proposalFallback =
    extractDateFromValue(findCapture(text, /(?:prazo(?:\s+final)?\s+para\s+(?:envio|apresenta[cç][aã]o|entrega)\s+de\s+propostas?|encerramento\s+de\s+propostas?|recebimento\s+das\s+propostas?)\s*[:\-]?\s*([^\n]{4,180})/i)) ||
    extractDateFromTextByKeywords(text, proposalKeywords, 3);
  const contractTermFallback =
    findCapture(text, /(?:vig[êe]ncia|prazo\s+de\s+vig[êe]ncia|prazo\s+contratual|dura[cç][aã]o\s+do\s+contrato)\s*[:\-]?\s*([^\n]{3,180})/i) ||
    extractTextFromTextByKeywords(text, contractTermKeywords, 2, 180);

  const general = {
    openingDate: pickDateValue(openingDateFound.value, openingDateFallback),
    openingTime: pickTimeValue(openingTimeFound.value, openingTimeFallback),
    portal: portalFound.value || detectPortal(text),
    agency: agencyFound.value || detectAgency(text),
    modality: modalityFound.value || detectModality(text) || 'Não identificado',
    objectSummary: objectFound.value || detectObjectSummary(text)
  };

  const deadlines = {
    publicationDate: pickDateValue(publicationDateFound.value, publicationFallback),
    impugnationDeadline: pickDateValue(impugnationFound.value, impugnationFallback),
    clarificationDeadline: pickDateValue(clarificationFound.value, clarificationFallback),
    proposalDeadline: pickDateValue(proposalFound.value, proposalFallback),
    contractTerm: pickContractTermValue(contractTermFound.value, contractTermFallback)
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
      items.length > 0
        ? items
        : [
            {
              name: general.objectSummary || 'Item principal não identificado',
              quantity: 'Não identificado',
              specs: 'Conforme edital/TR'
            }
          ],
    risks,
    sourceMeta: {
      extractionMode: 'page_by_page',
      analyzedPages: pages.length,
      pageSignals: pageSignals.out
    }
  };
};

const tryParseJsonObject = (rawContent) => {
  if (!rawContent || typeof rawContent !== 'string') return null;
  try {
    const parsed = JSON.parse(rawContent);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore
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
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '';

const getGeminiModelCandidates = () => {
  const fromList = String(process.env.GEMINI_MODELS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const ordered = [
    ...fromList,
    String(process.env.GEMINI_MODEL || process.env.GOOGLE_MODEL || '').trim(),
    'gemini-2.0-flash',      // Mais rápido e barato
    'gemini-1.5-flash',      // Fallback rápido
    'gemini-2.5-flash'       // Mais lento, último recurso
  ].filter(Boolean);

  return [...new Set(ordered)];
};

const shouldRetryByMessage = (message) => {
  const lower = String(message || '').toLowerCase();
  return (
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('429') ||
    lower.includes('high demand')
  );
};

const retryDelayMsFromMessage = (message, fallbackMs) => {
  const m = String(message || '').match(/retry in ([\d.]+)s/i);
  if (!m) return fallbackMs;
  const secs = Number.parseFloat(m[1]);
  if (!Number.isFinite(secs)) return fallbackMs;
  return Math.max(500, Math.ceil(secs * 1000) + 500);
};

const buildTemplatePrompt = ({ mode, payload, pageSnapshots }) => {
  if (mode === 'edital') {
    return [
      'Voce e especialista em licitacoes B2G no Brasil.',
      'Analise o edital e retorne JSON estritamente no schema de saida.',
      '',
      'Regras:',
      '1. Extraia datas reais de prazos quando houver.',
      '2. Se nao localizar dado, use "Nao identificado".',
      '3. Seja objetivo e sem texto fora do JSON.',
      '',
      'Conteudo do documento (primeiras paginas):',
      pageSnapshots
        .slice(0, 8)
        .map((page) => `Pagina ${page.page}: ${page.excerpt}`)
        .join('\n')
    ].join('\n');
  }

  return [
    'Voce e especialista em licitacoes B2G e engenharia de presales.',
    'Analise o TR e compare com o modelo informado. Retorne JSON no schema.',
    '',
    'Regras:',
    '1. Extraia requisitos tecnicos relevantes.',
    '2. meetsRequirement deve ser somente ATENDE ou NAO_ATENDE.',
    '3. analysisType deve ser tr.',
    '',
    'Modelo analisado:',
    `- Nome: ${normalizeLine(payload?.analyzedModelName || '') || 'Nao informado'}`,
    `- Especificacoes: ${normalizeLine(payload?.analyzedModelSpecs || '') || 'Nao informado'}`,
    '',
    'Conteudo do documento (primeiras paginas):',
    pageSnapshots
      .slice(0, 8)
      .map((page) => `Pagina ${page.page}: ${page.excerpt}`)
      .join('\n')
  ]
    .filter(Boolean)
    .join('\n');
};

const buildGeminiSchemaHint = (mode) =>
  mode === 'edital'
    ? {
        analysisType: 'edital',
        general: {
          openingDate: 'string',
          openingTime: 'string',
          portal: 'string',
          agency: 'string',
          modality: 'string',
          objectSummary: 'string'
        },
        deadlines: {
          publicationDate: 'string',
          impugnationDeadline: 'string',
          clarificationDeadline: 'string',
          proposalDeadline: 'string',
          contractTerm: 'string'
        },
        requirements: {
          legal: ['string'],
          technical: ['string'],
          economic: ['string'],
          fiscal: ['string']
        },
        items: [{ name: 'string', quantity: 'string', specs: 'string' }],
        risks: ['string']
      }
    : {
        analysisType: 'tr',
        trSummary: 'string',
        analyzedModel: { modelName: 'string', manufacturer: 'string', providedSpecs: 'string' },
        termRequirements: ['string'],
        technicalNotebook: [
          {
            termRequirement: 'string',
            meetsRequirement: 'ATENDE | NAO_ATENDE',
            datasheetEvidence: 'string',
            rationale: 'string'
          }
        ],
        compliantEquipment: [{ model: 'string', manufacturer: 'string', rationale: 'string' }],
        complianceOverview: { totalRequirements: 'number', metRequirements: 'number', fullCompliance: 'boolean' }
      };

const parseGeminiTextContent = (jsonPayload) => {
  const parts = Array.isArray(jsonPayload?.candidates?.[0]?.content?.parts)
    ? jsonPayload.candidates[0].content.parts
    : [];
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
};

const runGeminiStructured = async ({ mode, payload, pageSnapshots, maxRetries = 2, baseDelayMs = 1000 }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const models = getGeminiModelCandidates();
  const prompt = buildTemplatePrompt({ mode, payload, pageSnapshots });
  const expectedSchema = buildGeminiSchemaHint(mode);

  // NUNCA enviar o PDF inline — usar apenas texto extraído (muito mais rápido)
  const parts = [
    {
      text: [
        prompt,
        '',
        'Responda estritamente em JSON valido, sem markdown e sem texto adicional.',
        `Schema esperado (hint): ${JSON.stringify(expectedSchema)}`
      ].join('\n')
    }
  ];

  let lastError = null;
  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000); // Adiciona timeout de 18s

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0.15,
              responseMimeType: 'application/json'
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const payloadJson = await response.json().catch(() => null);
        if (!response.ok) {
          const errMessage = normalizeLine(payloadJson?.error?.message || '') || `Gemini HTTP ${response.status}`;
          throw new Error(errMessage);
        }

        const parsed = tryParseJsonObject(parseGeminiTextContent(payloadJson));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }

        throw new Error('Gemini não retornou JSON válido para a análise.');
      } catch (err) {
        if (err.name === 'AbortError') err.message = 'Gemini API call timed out.';
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        const isLastAttempt = attempt >= maxRetries - 1;
        if (!shouldRetryByMessage(message) || isLastAttempt) break;
        const waitMs = retryDelayMsFromMessage(message, baseDelayMs * Math.pow(2, attempt));
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  if (lastError) {
    console.warn('Falha no fluxo Gemini:', lastError instanceof Error ? lastError.message : String(lastError));
  }

  return null;
};

const runOpenAiStructured = async ({ mode, payload, text, pages, datasheetText = '' }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000); // Reduzido para 18s

  const schemaHint = buildGeminiSchemaHint(mode);

  const pagesCompact = (Array.isArray(pages) ? pages : [])
    .slice(0, 30)
    .map((page) => ({ page: page.num, excerpt: cleanText(page.text, 900) }));

  const systemPrompt = [
    'Você é especialista em licitações públicas B2G no Brasil.',
    'Analise o documento completo página por página.',
    'Responda estritamente com JSON válido sem markdown.'
  ].join(' ');

  const userPayload = {
    mode,
    payload,
    pages: pagesCompact,
    documentText: cleanText(text, 35000),
    datasheetText: cleanText(datasheetText, 22000),
    expectedSchema: schemaHint
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userPayload) }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) return null;

    const parsedResponse = await response.json().catch(() => null);
    const content = parsedResponse?.choices?.[0]?.message?.content;
    const parsed = tryParseJsonObject(content);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    // AbortError será capturado aqui
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeEditalResponse = (candidate, fallback) => {
  if (!candidate || typeof candidate !== 'object') return fallback;

  const generalCandidate = candidate.general && typeof candidate.general === 'object' ? candidate.general : {};
  const deadlineCandidate = candidate.deadlines && typeof candidate.deadlines === 'object' ? candidate.deadlines : {};
  const requirementsCandidate = candidate.requirements && typeof candidate.requirements === 'object' ? candidate.requirements : {};

  const items = Array.isArray(candidate.items)
    ? candidate.items
        .map((item) => ({
          name: normalizeLine(item?.name || ''),
          quantity: normalizeLine(item?.quantity || 'Não identificado'),
          specs: normalizeLine(item?.specs || 'Não identificado')
        }))
        .filter((item) => item.name && !isWeakItemName(item.name))
    : [];

  const normalizedItems = [];
  const seen = new Set();
  for (const item of items) {
    const key = normalizeItemName(item.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalizedItems.push(item);
    if (normalizedItems.length >= 20) break;
  }

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
      legal: ensureArray(requirementsCandidate.legal).length ? ensureArray(requirementsCandidate.legal) : fallback.requirements.legal,
      technical: ensureArray(requirementsCandidate.technical).length ? ensureArray(requirementsCandidate.technical) : fallback.requirements.technical,
      economic: ensureArray(requirementsCandidate.economic).length ? ensureArray(requirementsCandidate.economic) : fallback.requirements.economic,
      fiscal: ensureArray(requirementsCandidate.fiscal).length ? ensureArray(requirementsCandidate.fiscal) : fallback.requirements.fiscal
    },
    items: normalizedItems.length > 0 ? normalizedItems : fallback.items,
    risks: ensureArray(candidate.risks).length ? ensureArray(candidate.risks) : fallback.risks,
    sourceMeta: {
      ...(fallback.sourceMeta || {}),
      extractionMode: 'ai_page_by_page'
    }
  };

  return normalized;
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
  const compliantEquipment =
    complianceRate >= 0.6
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
      modelName: normalizeLine(payload.analyzedModelName || ''),
      manufacturer: normalizeLine(payload.analyzedModelManufacturer || 'Não informado'),
      providedSpecs: normalizeLine(payload.analyzedModelSpecs || '')
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
            rationale: normalizeLine(
              row?.rationale ||
                (meets === 'ATENDE'
                  ? 'Requisito atendido conforme análise automática.'
                  : 'Requisito não atendido conforme análise automática.')
            )
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

const createPageSnapshots = (pages) =>
  (Array.isArray(pages) ? pages : [])
    .slice(0, 8) // Apenas 8 páginas para análise rápida
    .map((page) => ({
      page: page.num,
      excerpt: cleanText(page.text, 550)
    }))
    .filter((row) => row.excerpt);

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    const user = await authenticateUser(req.headers || {});
    const role = String(user?.actualRole || user?.role || '').toUpperCase();
    if (!USER_ALLOWED_ROLES.has(role)) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const segments = getRouteSegmentsFromUrl(req.url, 'ai-analysis');
    const mode = segments[0];
    if (req.method !== 'POST' || (mode !== 'edital' && mode !== 'tr')) {
      return res.status(404).json({ message: 'Rota não encontrada.' });
    }

    const body = req.body; // Vercel já faz o parse do JSON
    if (!body.fileDataUri || typeof body.fileDataUri !== 'string') {
      return res.status(400).json({ message: 'fileDataUri obrigatorio.' });
    }

    const { mimeType, buffer } = parseDataUri(body.fileDataUri);
    if (!mimeType.includes('pdf')) {
      return res.status(400).json({ message: 'fileDataUri deve ser PDF (data:application/pdf;base64,...).' });
    }

    const extracted = await extractPdfTextDetailed(buffer);
    const pages = extracted.pages;
    const pageSnapshots = createPageSnapshots(pages);

    if (mode === 'edital') {
      const fallback = heuristicsEdital(extracted.text || '', pages);

      let aiResponse = null;
      let aiProvider = 'fallback';

      try {
        aiResponse = await runGeminiStructured({ mode: 'edital', payload: body, pageSnapshots });
        if (aiResponse) aiProvider = 'gemini';
      } catch (err) {
        console.error('[ai-analysis] Gemini falhou:', err?.message || err);
        aiResponse = null;
      }

      if (!aiResponse && extracted.text) {
        try {
          aiResponse = await runOpenAiStructured({
            mode: 'edital',
            payload: body,
            text: extracted.text,
            pages
          });
          if (aiResponse) aiProvider = 'openai';
        } catch (err) {
          console.error('[ai-analysis] OpenAI falhou:', err?.message || err);
          aiResponse = null;
        }
      }

      console.log(`[ai-analysis] edital provider=${aiProvider} pages=${pages.length} textLen=${extracted.text?.length || 0}`);

      const normalized = normalizeEditalResponse(aiResponse, fallback);
      normalized._debug = { provider: aiProvider, pages: pages.length };

      if (!extracted.text) {
        normalized.risks = unique([
          ...(normalized.risks || []),
          'PDF sem texto pesquisável. Revisar arquivo original ou utilizar versão OCR para maior precisão.'
        ]);
      }

      normalized.sourceMeta = {
        ...(normalized.sourceMeta || {}),
        totalPages: extracted.totalPages,
        extractedPages: pages.length
      };

      return res.status(200).json(normalized);
    }

    if (!body.analyzedModelName || typeof body.analyzedModelName !== 'string') {
      return res.status(400).json({ message: 'analyzedModelName obrigatorio.' });
    }

    if (!body.analyzedModelSpecs || typeof body.analyzedModelSpecs !== 'string') {
      return res.status(400).json({ message: 'analyzedModelSpecs obrigatorio.' });
    }

    let datasheetText = '';
    if (body.datasheetFileDataUri && typeof body.datasheetFileDataUri === 'string') {
      try {
        const datasheet = parseDataUri(body.datasheetFileDataUri);
        if (datasheet.mimeType.includes('pdf')) {
          const parsed = await extractPdfTextDetailed(datasheet.buffer);
          datasheetText = parsed.text;
        } else {
          datasheetText = cleanText(datasheet.buffer.toString('utf8'), 30000);
        }
      } catch {
        datasheetText = '';
      }
    }

    const fallback = heuristicsTr(body, extracted.text || '', datasheetText);

    let aiResponse = null;
    try {
      aiResponse = await runGeminiStructured({ mode: 'tr', payload: body, pageSnapshots });
    } catch {
      aiResponse = null;
    }

    if (!aiResponse && extracted.text) {
      aiResponse = await runOpenAiStructured({
        mode: 'tr',
        payload: body,
        text: extracted.text,
        pages,
        datasheetText
      });
    }

    const normalized = normalizeTrResponse(aiResponse, fallback, body);
    normalized.termRequirements = ensureArray(normalized.termRequirements, 20);
    normalized.technicalNotebook = Array.isArray(normalized.technicalNotebook)
      ? normalized.technicalNotebook.slice(0, 20)
      : [];
    normalized.sourceMeta = {
      totalPages: extracted.totalPages,
      extractedPages: pages.length,
      extractionMode: aiResponse ? 'ai_page_by_page' : 'heuristic_page_by_page'
    };

    return res.status(200).json(normalized);
  } catch (err) {
    const requestId = req.headers['x-vercel-id'] || 'local';
    console.error(`[ai-analysis][error][${requestId}]`, {
      message: err.message,
      stack: err.stack,
      url: req.url
    });

    const message = err instanceof Error ? err.message : 'Falha ao processar edital/TR.';
    const statusCode = /token/i.test(String(message)) ? 401 : 500;
    return res.status(statusCode).json({ message });
  }
}
