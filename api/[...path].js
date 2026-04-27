// Vercel API Route - Roteador central para todas as rotas /api/*

export const config = {
  runtime: 'nodejs',
  api: {
    // Necessário para preservar uploads multipart/binários sem corrupção.
    bodyParser: false
  }
};

// Cache de handlers carregados
const handlerCache = {};

async function loadHandler(name) {
  if (handlerCache[name]) return handlerCache[name];
  try {
    const mod = await import(`../netlify/functions/${name}.js`);
    handlerCache[name] = mod.handler;
    return handlerCache[name];
  } catch (e) {
    console.error(`Handler não encontrado: ${name}`, e.message);
    return null;
  }
}

function getRawBodyBuffer(req) {
  return new Promise((resolve) => {
    // Compatibilidade com ambientes que já injetam req.body.
    if (req.body !== undefined) {
      if (Buffer.isBuffer(req.body)) return resolve(req.body);
      if (typeof req.body === 'string') return resolve(Buffer.from(req.body, 'utf8'));
      if (typeof req.body === 'object') return resolve(Buffer.from(JSON.stringify(req.body), 'utf8'));
      return resolve(Buffer.from(String(req.body), 'utf8'));
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      return resolve(Buffer.alloc(0));
    }

    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(Buffer.alloc(0)));
  });
}

function shouldUseBase64Body(contentType = '') {
  const type = String(contentType || '').toLowerCase();
  if (!type) return false;

  return (
    type.includes('multipart/form-data') ||
    type.includes('application/pdf') ||
    type.includes('application/octet-stream') ||
    type.includes('application/zip') ||
    type.includes('application/x-zip') ||
    type.includes('application/vnd.openxmlformats') ||
    type.startsWith('image/')
  );
}

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extrair nome da function do path (sem query string)
  const fullPath = req.url || '';
  const pathOnly = fullPath.split('?')[0]; // remove query string
  const withoutApi = pathOnly.replace(/^\/api/, '');
  const parts = withoutApi.split('/').filter(Boolean);
  const functionName = parts[0] || 'health';

  const fn = await loadHandler(functionName);

  if (!fn) {
    return res.status(404).json({ error: `API não encontrada: /${functionName}` });
  }

  const rawBody = await getRawBodyBuffer(req);
  const contentType = req.headers?.['content-type'] || '';
  const isBase64Encoded = shouldUseBase64Body(contentType);
  const body =
    rawBody.length === 0
      ? null
      : isBase64Encoded
        ? rawBody.toString('base64')
        : rawBody.toString('utf8');

  // Montar query string parameters
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const queryStringParameters = {};
  urlObj.searchParams.forEach((value, key) => {
    queryStringParameters[key] = value;
  });

  // Evento no formato Netlify
  const event = {
    httpMethod: req.method,
    // Compatibilidade Netlify: path não deve incluir query string.
    path: pathOnly,
    headers: req.headers,
    queryStringParameters,
    body: body || null,
    isBase64Encoded,
    rawUrl: req.url
  };

  try {
    const result = await fn(event);

    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    res.status(result.statusCode || 200);

    if (result.body) {
      if (result.isBase64Encoded) {
        res.send(Buffer.from(result.body, 'base64'));
      } else {
        res.send(result.body);
      }
    } else {
      res.end();
    }
  } catch (err) {
    console.error(`Erro em /${functionName}:`, err);
    res.status(500).json({ error: err.message || 'Erro interno do servidor' });
  }
}
