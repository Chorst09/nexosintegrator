const fs = require('fs');
const path = require('path');
const express = require('express');

const router = express.Router();

const DATA_DIR = process.env.PORTAL_BUSCA_DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'licitacoes-gerenciadas.json');

const ensureDataFile = () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
};

const readRows = () => {
  ensureDataFile();
  try {
    const rows = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

const writeRows = (rows) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2));
};

const cleanText = (value, max = 1200) => String(value || '').trim().slice(0, max);

const resolveId = (item = {}) =>
  cleanText(
    item.id ||
    item.numeroControlePNCP ||
    item.numero ||
    item.link ||
    [item.fonte, item.orgao, item.titulo, item.dataAbertura].filter(Boolean).join('|')
  );

router.get('/licitacoes-gerenciadas', (req, res) => {
  const rows = readRows().sort((a, b) => {
    const aTime = Date.parse(a.gerenciadaEm || a.createdAt || '') || 0;
    const bTime = Date.parse(b.gerenciadaEm || b.createdAt || '') || 0;
    return bTime - aTime;
  });
  res.json({ data: rows });
});

router.post('/licitacoes-gerenciadas', (req, res) => {
  const input = req.body?.item && typeof req.body.item === 'object' ? req.body.item : req.body;
  const id = resolveId(input);
  if (!id) return res.status(400).json({ error: 'Identificador da licitação é obrigatório.' });

  const rows = readRows();
  const now = new Date().toISOString();
  const nextItem = {
    ...input,
    id,
    createdAt: input.createdAt || now,
    gerenciadaEm: input.gerenciadaEm || now,
    updatedAt: now
  };

  const existingIndex = rows.findIndex((item) => resolveId(item) === id);
  if (existingIndex >= 0) rows[existingIndex] = { ...rows[existingIndex], ...nextItem };
  else rows.unshift(nextItem);

  writeRows(rows);
  res.status(existingIndex >= 0 ? 200 : 201).json({ data: nextItem });
});

router.delete('/licitacoes-gerenciadas/:id', (req, res) => {
  const id = cleanText(req.params.id);
  const rows = readRows();
  const next = rows.filter((item) => resolveId(item) !== id);
  writeRows(next);
  res.json({ success: true, removed: rows.length - next.length });
});

module.exports = router;
