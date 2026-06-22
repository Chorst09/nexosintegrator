const express = require('express');
const { prisma } = require('../lib/prisma.cjs');
const { authenticateToken } = require('../lib/auth');
const { canAccessModule, normalizeRole } = require('../lib/permissions');

const router = express.Router();

const VALID_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const VALID_STATUSES = new Set(['PLANEJAMENTO', 'EM_ANDAMENTO', 'VALIDACAO', 'BLOQUEADA', 'APROVADA', 'DESCARTADA']);
const FINAL_STATUSES = ['APROVADA', 'DESCARTADA'];

router.use(authenticateToken);
router.use((req, res, next) => {
  const role = normalizeRole(req.user?.actualRole || req.user?.role);
  if (['MASTER', 'ADMIN', 'MANAGER', 'PRE_SALES', 'USER'].includes(role) || canAccessModule(req.user, 'PRE_SALES')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Acesso negado' });
});

const cleanText = (value) => {
  const text = String(value ?? '').trim();
  return text || null;
};

const requiredText = (value) => String(value ?? '').trim();

const normalizePriority = (value) => {
  const priority = String(value || 'MEDIUM').trim().toUpperCase();
  return VALID_PRIORITIES.has(priority) ? priority : 'MEDIUM';
};

const normalizeStatus = (value) => {
  const status = String(value || 'PLANEJAMENTO')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
  return VALID_STATUSES.has(status) ? status : 'PLANEJAMENTO';
};

const normalizeProgress = (value) => {
  const progress = Number.parseInt(value, 10);
  if (Number.isNaN(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildPayload = (body = {}) => ({
  relatedOpportunityId: cleanText(body.relatedOpportunityId),
  relatedOpportunityNumber: cleanText(body.relatedOpportunityNumber),
  relatedOpportunityTitle: cleanText(body.relatedOpportunityTitle),
  title: requiredText(body.title),
  client: requiredText(body.client),
  solution: requiredText(body.solution),
  environment: cleanText(body.environment),
  objective: requiredText(body.objective),
  scope: cleanText(body.scope),
  successCriteria: requiredText(body.successCriteria),
  commercialOwner: requiredText(body.commercialOwner),
  technicalOwner: requiredText(body.technicalOwner),
  startDate: parseDate(body.startDate),
  dueDate: parseDate(body.dueDate),
  priority: normalizePriority(body.priority),
  status: normalizeStatus(body.status),
  progress: normalizeProgress(body.progress),
  nextStep: cleanText(body.nextStep),
  risks: cleanText(body.risks),
  resultSummary: cleanText(body.resultSummary),
  decisionReason: cleanText(body.decisionReason),
  notes: cleanText(body.notes)
});

const validatePayload = (payload) => {
  const missing = [];
  if (!payload.title) missing.push('Título da POC');
  if (!payload.client) missing.push('Cliente');
  if (!payload.solution) missing.push('Solução / Produto');
  if (!payload.objective) missing.push('Objetivo');
  if (!payload.successCriteria) missing.push('Critérios de sucesso');
  if (!payload.commercialOwner) missing.push('Responsável comercial');
  if (!payload.technicalOwner) missing.push('Responsável técnico');
  return missing;
};

const buildWhere = (query = {}) => {
  const where = {};
  const status = String(query.status || '').trim();
  const priority = String(query.priority || '').trim();
  const search = String(query.search || '').trim();

  if (status && status !== 'all') where.status = normalizeStatus(status);
  if (priority && priority !== 'all') where.priority = normalizePriority(priority);

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { client: { contains: search, mode: 'insensitive' } },
      { solution: { contains: search, mode: 'insensitive' } },
      { commercialOwner: { contains: search, mode: 'insensitive' } },
      { technicalOwner: { contains: search, mode: 'insensitive' } },
      { relatedOpportunityNumber: { contains: search, mode: 'insensitive' } }
    ];
  }

  return where;
};

const getStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, andamento, bloqueadas, aprovadas, atrasadas] = await Promise.all([
    prisma.preSalesPoc.count(),
    prisma.preSalesPoc.count({ where: { status: { in: ['PLANEJAMENTO', 'EM_ANDAMENTO', 'VALIDACAO'] } } }),
    prisma.preSalesPoc.count({ where: { status: 'BLOQUEADA' } }),
    prisma.preSalesPoc.count({ where: { status: 'APROVADA' } }),
    prisma.preSalesPoc.count({
      where: {
        dueDate: { lt: today },
        status: { notIn: FINAL_STATUSES }
      }
    })
  ]);

  return { total, andamento, bloqueadas, aprovadas, atrasadas };
};

router.get('/', async (req, res) => {
  try {
    const where = buildWhere(req.query);
    const [pocs, stats] = await Promise.all([
      prisma.preSalesPoc.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
      }),
      getStats()
    ]);

    res.json({ success: true, data: pocs, pocs, stats });
  } catch (error) {
    console.error('Erro ao buscar POCs:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    const missing = validatePayload(payload);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `${missing.join(', ')} são obrigatórios` });
    }

    const poc = await prisma.preSalesPoc.create({
      data: {
        ...payload,
        createdById: req.user?.userId || req.user?.id || null,
        createdByName: req.user?.name || req.user?.email || null
      }
    });

    res.status(201).json({ success: true, data: poc, poc });
  } catch (error) {
    console.error('Erro ao criar POC:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    const missing = validatePayload(payload);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `${missing.join(', ')} são obrigatórios` });
    }

    const poc = await prisma.preSalesPoc.update({
      where: { id: req.params.id },
      data: payload
    });

    res.json({ success: true, data: poc, poc });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'POC não encontrada' });
    }
    console.error('Erro ao atualizar POC:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const poc = await prisma.preSalesPoc.update({
      where: { id: req.params.id },
      data: { status: 'APROVADA', progress: 100, approvedAt: new Date(), discardedAt: null }
    });
    res.json({ success: true, data: poc, poc });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'POC não encontrada' });
    }
    console.error('Erro ao aprovar POC:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
});

router.post('/:id/discard', async (req, res) => {
  try {
    const poc = await prisma.preSalesPoc.update({
      where: { id: req.params.id },
      data: { status: 'DESCARTADA', discardedAt: new Date() }
    });
    res.json({ success: true, data: poc, poc });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'POC não encontrada' });
    }
    console.error('Erro ao descartar POC:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.preSalesPoc.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'POC não encontrada' });
    }
    console.error('Erro ao excluir POC:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor', error: error.message });
  }
});

module.exports = router;
