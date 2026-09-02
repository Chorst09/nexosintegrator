const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../lib/prisma.cjs');
const { authenticateToken } = require('../lib/auth.cjs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/projects');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];
    const extname = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(extname)) {
      return cb(null, true);
    }
    cb(new Error('Tipo de arquivo não permitido'));
  }
});

const router = express.Router();

function generateProjectNumber() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `PRJ-${year}-${rand}`;
}

const PROJECT_STATUSES = ['PLANEJADO', 'EM_ANDAMENTO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO'];
const PROJECT_PHASES = ['SETUP', 'KICKOFF_INTERNO', 'KICKOFF_EXTERNO', 'EXECUCAO', 'MONITORAMENTO', 'ENCERRAMENTO'];

function normalizeProjectStatus(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'PLANEJAMENTO') return 'PLANEJADO';
  if (raw === 'EM EXECUCAO' || raw === 'EM EXECUÇÃO' || raw === 'EM PROGRESSO') return 'EM_ANDAMENTO';
  if (raw === 'EM RISCO') return 'PAUSADO';
  if (raw === 'CONCLUÍDO') return 'CONCLUIDO';
  return PROJECT_STATUSES.includes(raw) ? raw : 'PLANEJADO';
}

function normalizeProjectPhase(value) {
  const raw = String(value || '').trim().toUpperCase();
  return PROJECT_PHASES.includes(raw) ? raw : 'SETUP';
}

function normalizeProjectMetadata(metadata, fallback = {}) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return fallback;
  return Object.entries(metadata).reduce((acc, [key, value]) => {
    if (value === undefined) return acc;
    acc[key] = typeof value === 'string' ? value.trim() : value;
    return acc;
  }, { ...fallback });
}

function parseGeminiJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Gemini não retornou conteúdo para análise');

  try {
    return JSON.parse(raw);
  } catch (error) {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw error;
  }
}

function sanitizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function sanitizeTextArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeText(item)).filter(Boolean);
  }
  const text = sanitizeText(value);
  return text ? [text] : [];
}

function sanitizeAiPhases(phases) {
  if (!Array.isArray(phases)) return [];
  return phases
    .map((phase, index) => {
      const requirements = sanitizeTextArray(phase?.requirements);
      const materials = sanitizeTextArray(phase?.materials);
      const descriptionParts = [
        sanitizeText(phase?.description),
        sanitizeText(phase?.deliverable) ? `Entregável: ${sanitizeText(phase.deliverable)}` : '',
        requirements.length ? `Requisitos: ${requirements.join('; ')}` : '',
        materials.length ? `Materiais: ${materials.join('; ')}` : ''
      ].filter(Boolean);

      return {
        name: sanitizeText(phase?.name, `Fase ${index + 1}`),
        description: descriptionParts.join('\n'),
        order: Number.isFinite(Number(phase?.order)) ? Number(phase.order) : index + 1,
        plannedStartDay: Number.isFinite(Number(phase?.plannedStartDay)) ? Number(phase.plannedStartDay) : null,
        plannedEndDay: Number.isFinite(Number(phase?.plannedEndDay)) ? Number(phase.plannedEndDay) : null,
        deliverable: sanitizeText(phase?.deliverable),
        requirements,
        materials
      };
    })
    .filter((phase) => phase.name)
    .slice(0, 12);
}

function sanitizeAiProjectAnalysis(value) {
  const phases = sanitizeAiPhases(value?.phases);
  return {
    name: sanitizeText(value?.name),
    type: String(value?.type || '').toUpperCase() === 'B2G' ? 'B2G' : String(value?.type || '').toUpperCase() === 'B2B' ? 'B2B' : undefined,
    objective: sanitizeText(value?.objective),
    scope: sanitizeText(value?.scope),
    deliverables: sanitizeTextArray(value?.deliverables),
    successCriteria: sanitizeTextArray(value?.successCriteria),
    risks: sanitizeTextArray(value?.risks),
    notes: sanitizeText(value?.notes),
    phases
  };
}

function buildProjectPhaseCreates(phases, plannedStartDate) {
  const sanitized = sanitizeAiPhases(phases);
  if (sanitized.length === 0) {
    return [
      { name: 'Setup Inicial', order: 1 },
      { name: 'Kickoff Interno', order: 2 },
      { name: 'Kickoff Externo', order: 3 },
      { name: 'Execução', order: 4 },
      { name: 'Encerramento', order: 5 }
    ];
  }

  const start = plannedStartDate ? new Date(plannedStartDate) : null;
  const isValidStart = start && !Number.isNaN(start.getTime());

  return sanitized.map((phase, index) => {
    const data = {
      name: phase.name,
      description: phase.description || null,
      order: phase.order || index + 1
    };

    if (isValidStart && phase.plannedStartDay) {
      data.plannedStartDate = new Date(start.getTime() + (phase.plannedStartDay - 1) * 24 * 60 * 60 * 1000);
    }
    if (isValidStart && phase.plannedEndDay) {
      data.plannedEndDate = new Date(start.getTime() + (phase.plannedEndDay - 1) * 24 * 60 * 60 * 1000);
    }

    return data;
  });
}

// Analisar edital/escopo com Gemini e retornar campos prontos para o cadastro
router.post('/ai-analyze', authenticateToken, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GEMINI_API_KEY não configurada no backend' });
    }

    const sourceText = sanitizeText(req.body?.sourceText);
    if (sourceText.length < 80) {
      return res.status(400).json({ error: 'Informe um texto de edital ou análise com conteúdo suficiente para a IA.' });
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const prompt = `
Você é um gerente de projeto sênior especializado em implantação de tecnologia, licitações e contratos B2B/B2G.
Analise o conteúdo abaixo e retorne exclusivamente um JSON válido com os campos solicitados.

Contexto já informado:
- Nome atual do projeto: ${sanitizeText(req.body?.projectName, 'não informado')}
- Tipo atual: ${sanitizeText(req.body?.projectType, 'não informado')}
- Cliente atual: ${sanitizeText(req.body?.client, 'não informado')}

Regras:
- Gere objetivo, escopo, entregáveis, critérios de sucesso, riscos e observações.
- Gere fases sequenciais com nome, descrição, entregável, requisitos, materiais quando existirem, e prazo em dias relativos à assinatura/início.
- Use linguagem objetiva em português do Brasil.
- Não invente dados financeiros, nomes de pessoas ou datas absolutas se o texto não trouxer.
- Preserve requisitos críticos, SLAs, materiais obrigatórios, marcos e restrições logísticas.

Formato JSON obrigatório:
{
  "name": "nome sugerido do projeto",
  "type": "B2B ou B2G",
  "objective": "objetivo do projeto",
  "scope": "escopo consolidado",
  "deliverables": ["entregável 1"],
  "successCriteria": ["critério 1"],
  "risks": ["risco 1"],
  "notes": "observações executivas",
  "phases": [
    {
      "name": "nome da fase",
      "description": "descrição da fase",
      "order": 1,
      "plannedStartDay": 1,
      "plannedEndDay": 50,
      "deliverable": "produto/entregável da fase",
      "requirements": ["requisito de gestão, técnico, documental ou SLA"],
      "materials": ["material obrigatório quando existir"]
    }
  ]
}

Conteúdo para análise:
${sourceText}
`.trim();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    });

    clearTimeout(timeout);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `Erro ${response.status} ao consultar Gemini`;
      return res.status(response.status).json({ error: message });
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
    const parsed = parseGeminiJson(text);
    res.json({ analysis: sanitizeAiProjectAnalysis(parsed), model });
  } catch (error) {
    console.error('Erro ao analisar projeto com Gemini:', error);
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Tempo esgotado ao analisar com Gemini' });
    }
    res.status(500).json({ error: 'Erro ao analisar projeto com Gemini' });
  }
});

// Dashboard / KPIs
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'SELLER') where.projectManagerId = req.user.id;

    const [total, active, delayed, avgMargin] = await Promise.all([
      prisma.project.count({ where: { ...where, status: { not: 'CANCELADO' } } }),
      prisma.project.count({ where: { ...where, status: 'EM_ANDAMENTO' } }),
      prisma.project.count({ where: { ...where, healthScore: { lt: 60 }, status: 'EM_ANDAMENTO' } }),
      prisma.project.aggregate({ where: { ...where, status: 'EM_ANDAMENTO' }, _avg: { margin: true } })
    ]);

    const byPhase = await prisma.project.groupBy({
      by: ['phase'],
      where: { ...where, status: { not: 'CANCELADO' } },
      _count: true
    });

    const byType = await prisma.project.groupBy({
      by: ['type'],
      where: { ...where, status: { not: 'CANCELADO' } },
      _count: true
    });

    res.json({
      total,
      active,
      delayed,
      avgMargin: avgMargin._avg.margin || 0,
      byPhase,
      byType
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard de projetos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar projetos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, type, phase, companyId, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (req.user.role === 'SELLER') where.projectManagerId = req.user.id;
    if (status) where.status = status;
    if (type) where.type = type;
    if (phase) where.phase = phase;
    if (companyId) where.companyId = companyId;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, clientType: true } },
          projectManager: { select: { id: true, name: true, email: true } },
          phases: { orderBy: { order: 'asc' } },
          tasks: {
            include: { assignedTo: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' }
          },
          _count: { select: { tasks: true, milestones: true, team: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.project.count({ where })
    ]);

    res.json({ projects, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar projeto por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        company: { select: { id: true, name: true, document: true, clientType: true } },
        projectManager: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        opportunity: { select: { id: true, number: true, title: true, value: true } },
        contract: { select: { id: true, number: true, title: true, value: true, slaResponseTime: true, slaResolutionTime: true, slaAvailability: true } },
        phases: { orderBy: { order: 'asc' } },
        milestones: { orderBy: { plannedDate: 'asc' } },
        team: { include: { user: { select: { id: true, name: true, email: true } } } },
        risks: { orderBy: { identifiedDate: 'desc' } },
        issues: { orderBy: { reportedDate: 'desc' } },
        billings: { orderBy: { createdAt: 'desc' } },
        acceptances: { orderBy: { createdAt: 'desc' } },
        changeRequests: { orderBy: { createdAt: 'desc' } },
        b2gConfig: true,
        b2bConfig: true,
        _count: { select: { tasks: true, timelogs: true, attachments: true } }
      }
    });

    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json(project);
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar projeto manualmente
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, type, companyId, projectManagerId, status, phase, budget, plannedStartDate, plannedEndDate, opportunityId, contractId, metadata, phases } = req.body;

    if (!name || !type || !companyId || !projectManagerId) {
      return res.status(400).json({ error: 'Nome, tipo, empresa e gestor são obrigatórios' });
    }

    const projectNumber = generateProjectNumber();

    const project = await prisma.project.create({
      data: {
        number: projectNumber,
        name,
        description,
        type,
        status: normalizeProjectStatus(status),
        phase: normalizeProjectPhase(phase),
        budget: budget ? parseFloat(budget) : 0,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        companyId,
        projectManagerId,
        createdBy: req.user.id,
        opportunityId: opportunityId || null,
        contractId: contractId || null,
        metadata: normalizeProjectMetadata(metadata),
        phases: {
          create: buildProjectPhaseCreates(phases, plannedStartDate)
        }
      },
      include: {
        company: { select: { id: true, name: true } },
        projectManager: { select: { id: true, name: true } },
        phases: true
      }
    });

    if (type === 'B2G') {
      await prisma.projectB2GConfig.create({ data: { projectId: project.id } });
    } else {
      await prisma.projectB2BConfig.create({ data: { projectId: project.id } });
    }

    res.status(201).json(project);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar projeto a partir de oportunidade ganha
router.post('/from-opportunity/:opportunityId', authenticateToken, async (req, res) => {
  try {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: req.params.opportunityId },
      include: {
        company: { select: { id: true, name: true, clientType: true } },
        proposals: { where: { status: 'ACCEPTED' }, take: 1 },
        products: { include: { product: true } }
      }
    });

    if (!opportunity) return res.status(404).json({ error: 'Oportunidade não encontrada' });
    if (opportunity.stage !== 'WON') return res.status(400).json({ error: 'Oportunidade não está no estágio Ganha' });

    const existingProject = await prisma.project.findFirst({ where: { opportunityId: opportunity.id } });
    if (existingProject) return res.status(409).json({ error: 'Já existe um projeto para esta oportunidade' });

    const projectNumber = generateProjectNumber();
    const clientType = opportunity.company?.clientType || 'B2B';

    const project = await prisma.project.create({
      data: {
        number: projectNumber,
        name: opportunity.title,
        description: opportunity.description || '',
        type: clientType === 'B2G' ? 'B2G' : 'B2B',
        budget: opportunity.value,
        companyId: opportunity.companyId,
        projectManagerId: req.user.id,
        createdBy: req.user.id,
        opportunityId: opportunity.id,
        phases: {
          create: [
            { name: 'Setup Inicial', order: 1 },
            { name: 'Kickoff Interno', order: 2 },
            { name: 'Kickoff Externo', order: 3 },
            { name: 'Execução', order: 4 },
            { name: 'Encerramento', order: 5 }
          ]
        }
      },
      include: {
        company: { select: { id: true, name: true } },
        projectManager: { select: { id: true, name: true } },
        phases: true
      }
    });

    if (clientType === 'B2G') {
      await prisma.projectB2GConfig.create({ data: { projectId: project.id } });
    } else {
      await prisma.projectB2BConfig.create({ data: { projectId: project.id } });
    }

    res.status(201).json(project);
  } catch (error) {
    console.error('Erro ao criar projeto da oportunidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar projeto
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, status, phase, budget, healthScore, progressPercent, plannedStartDate, plannedEndDate, actualStartDate, actualEndDate, projectManagerId, metadata } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = normalizeProjectStatus(status);
    if (phase) updateData.phase = normalizeProjectPhase(phase);
    if (budget !== undefined) updateData.budget = parseFloat(budget);
    if (healthScore !== undefined) updateData.healthScore = parseInt(healthScore);
    if (progressPercent !== undefined) updateData.progressPercent = parseInt(progressPercent);
    if (plannedStartDate !== undefined) updateData.plannedStartDate = plannedStartDate ? new Date(plannedStartDate) : null;
    if (plannedEndDate !== undefined) updateData.plannedEndDate = plannedEndDate ? new Date(plannedEndDate) : null;
    if (actualStartDate !== undefined) updateData.actualStartDate = actualStartDate ? new Date(actualStartDate) : null;
    if (actualEndDate !== undefined) updateData.actualEndDate = actualEndDate ? new Date(actualEndDate) : null;
    if (projectManagerId) updateData.projectManagerId = projectManagerId;
    if (metadata !== undefined) updateData.metadata = normalizeProjectMetadata(metadata);

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true, clientType: true } },
        projectManager: { select: { id: true, name: true, email: true } },
        phases: { orderBy: { order: 'asc' } },
        tasks: {
          include: { assignedTo: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar projeto
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Projeto removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar projeto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === FASES ===
router.put('/:projectId/phases/:phaseId', authenticateToken, async (req, res) => {
  try {
    const { status, progressPercent, actualStartDate, actualEndDate } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (progressPercent !== undefined) updateData.progressPercent = parseInt(progressPercent);
    if (actualStartDate) updateData.actualStartDate = new Date(actualStartDate);
    if (actualEndDate) updateData.actualEndDate = new Date(actualEndDate);

    const phase = await prisma.projectPhase.update({
      where: { id: req.params.phaseId },
      data: updateData
    });
    res.json(phase);
  } catch (error) {
    console.error('Erro ao atualizar fase:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === TAREFAS ===
router.get('/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const { status, phaseId, assignedToId } = req.query;
    const where = { projectId: req.params.projectId };
    if (status) where.status = status;
    if (phaseId) where.phaseId = phaseId;
    if (assignedToId) where.assignedToId = assignedToId;

    const tasks = await prisma.projectTask.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        phase: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        _count: { select: { timelogs: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(tasks);
  } catch (error) {
    console.error('Erro ao listar tarefas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, assignedToId, phaseId, milestoneId, estimatedHours, dependencyId } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const task = await prisma.projectTask.create({
      data: {
        projectId: req.params.projectId,
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToId: assignedToId || null,
        phaseId: phaseId || null,
        milestoneId: milestoneId || null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : 0,
        dependencyId: dependencyId || null
      },
      include: {
        assignedTo: { select: { id: true, name: true } }
      }
    });
    res.status(201).json(task);
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:projectId/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, assignedToId, phaseId, milestoneId, estimatedHours, actualHours, dependencyId } = req.body;
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status) {
      updateData.status = status;
      if (status === 'DONE') updateData.completedAt = new Date();
    }
    if (priority) updateData.priority = priority;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (phaseId !== undefined) updateData.phaseId = phaseId || null;
    if (milestoneId !== undefined) updateData.milestoneId = milestoneId || null;
    if (estimatedHours !== undefined) updateData.estimatedHours = parseFloat(estimatedHours);
    if (actualHours !== undefined) updateData.actualHours = parseFloat(actualHours);
    if (dependencyId !== undefined) updateData.dependencyId = dependencyId || null;

    const task = await prisma.projectTask.update({
      where: { id: req.params.taskId },
      data: updateData,
      include: { assignedTo: { select: { id: true, name: true } } }
    });
    res.json(task);
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:projectId/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    await prisma.projectTask.delete({ where: { id: req.params.taskId } });
    res.json({ message: 'Tarefa removida' });
  } catch (error) {
    console.error('Erro ao deletar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === TIMESHEET ===
router.get('/:projectId/timelogs', authenticateToken, async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const where = { projectId: req.params.projectId };
    if (userId) where.userId = userId;
    if (startDate && endDate) {
      where.logDate = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const timelogs = await prisma.projectTimelog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } }
      },
      orderBy: { logDate: 'desc' }
    });
    res.json(timelogs);
  } catch (error) {
    console.error('Erro ao listar timelogs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/:projectId/timelogs', authenticateToken, async (req, res) => {
  try {
    const { taskId, userId, logDate, hours, description, billable } = req.body;
    if (!taskId || !logDate || !hours) {
      return res.status(400).json({ error: 'Tarefa, data e horas são obrigatórios' });
    }

    const timelog = await prisma.projectTimelog.create({
      data: {
        projectId: req.params.projectId,
        taskId,
        userId: userId || req.user.id,
        logDate: new Date(logDate),
        hours: parseFloat(hours),
        description,
        billable: billable !== false
      },
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } }
      }
    });
    res.status(201).json(timelog);
  } catch (error) {
    console.error('Erro ao criar timelog:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === EQUIPE ===
router.get('/:projectId/team', authenticateToken, async (req, res) => {
  try {
    const team = await prisma.projectTeam.findMany({
      where: { projectId: req.params.projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(team);
  } catch (error) {
    console.error('Erro ao listar equipe:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/:projectId/team', authenticateToken, async (req, res) => {
  try {
    const { userId, role, allocationPercent, hourlyCost, startDate, endDate } = req.body;
    if (!userId) return res.status(400).json({ error: 'Usuário é obrigatório' });

    const member = await prisma.projectTeam.create({
      data: {
        projectId: req.params.projectId,
        userId,
        role: role || 'DEVELOPER',
        allocationPercent: allocationPercent ? parseFloat(allocationPercent) : 100,
        hourlyCost: hourlyCost ? parseFloat(hourlyCost) : 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.status(201).json(member);
  } catch (error) {
    console.error('Erro ao adicionar membro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:projectId/team/:memberId', authenticateToken, async (req, res) => {
  try {
    const { role, allocationPercent, hourlyCost, isActive } = req.body;
    const updateData = {};
    if (role) updateData.role = role;
    if (allocationPercent !== undefined) updateData.allocationPercent = parseFloat(allocationPercent);
    if (hourlyCost !== undefined) updateData.hourlyCost = parseFloat(hourlyCost);
    if (isActive !== undefined) updateData.isActive = isActive;

    const member = await prisma.projectTeam.update({
      where: { id: req.params.memberId },
      data: updateData,
      include: { user: { select: { id: true, name: true } } }
    });
    res.json(member);
  } catch (error) {
    console.error('Erro ao atualizar membro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:projectId/team/:memberId', authenticateToken, async (req, res) => {
  try {
    await prisma.projectTeam.delete({ where: { id: req.params.memberId } });
    res.json({ message: 'Membro removido' });
  } catch (error) {
    console.error('Erro ao remover membro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === RISCOS ===
router.get('/:projectId/risks', authenticateToken, async (req, res) => {
  try {
    const risks = await prisma.projectRisk.findMany({
      where: { projectId: req.params.projectId },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { identifiedDate: 'desc' }
    });
    res.json(risks);
  } catch (error) {
    console.error('Erro ao listar riscos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/:projectId/risks', authenticateToken, async (req, res) => {
  try {
    const { title, description, level, impact, mitigationPlan, ownerId } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const risk = await prisma.projectRisk.create({
      data: {
        projectId: req.params.projectId,
        title,
        description,
        level: level || 'MEDIUM',
        impact,
        mitigationPlan,
        ownerId: ownerId || req.user.id
      },
      include: { owner: { select: { id: true, name: true } } }
    });
    res.status(201).json(risk);
  } catch (error) {
    console.error('Erro ao criar risco:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:projectId/risks/:riskId', authenticateToken, async (req, res) => {
  try {
    const { title, description, level, status, impact, mitigationPlan, ownerId, resolvedDate } = req.body;
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (level) updateData.level = level;
    if (status) updateData.status = status;
    if (impact !== undefined) updateData.impact = impact;
    if (mitigationPlan !== undefined) updateData.mitigationPlan = mitigationPlan;
    if (ownerId) updateData.ownerId = ownerId;
    if (resolvedDate) updateData.resolvedDate = new Date(resolvedDate);

    const risk = await prisma.projectRisk.update({
      where: { id: req.params.riskId },
      data: updateData
    });
    res.json(risk);
  } catch (error) {
    console.error('Erro ao atualizar risco:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === PENDÊNCIAS / ISSUES ===
router.get('/:projectId/issues', authenticateToken, async (req, res) => {
  try {
    const issues = await prisma.projectIssue.findMany({
      where: { projectId: req.params.projectId },
      include: {
        reportedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } }
      },
      orderBy: { reportedDate: 'desc' }
    });
    res.json(issues);
  } catch (error) {
    console.error('Erro ao listar issues:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/:projectId/issues', authenticateToken, async (req, res) => {
  try {
    const { title, description, status, priority, assignedToId, taskId } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const issue = await prisma.projectIssue.create({
      data: {
        projectId: req.params.projectId,
        title,
        description,
        status: status || 'OPEN',
        priority: priority || 'MEDIUM',
        reportedById: req.user.id,
        assignedToId: assignedToId || null,
        taskId: taskId || null
      },
      include: {
        reportedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } }
      }
    });
    res.status(201).json(issue);
  } catch (error) {
    console.error('Erro ao criar issue:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:projectId/issues/:issueId', authenticateToken, async (req, res) => {
  try {
    const { title, description, status, priority, assignedToId, resolvedDate } = req.body;
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status) {
      updateData.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') updateData.resolvedDate = new Date();
    }
    if (priority) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;

    const issue = await prisma.projectIssue.update({
      where: { id: req.params.issueId },
      data: updateData
    });
    res.json(issue);
  } catch (error) {
    console.error('Erro ao atualizar issue:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === MUDANÇAS (CHANGE REQUESTS) ===
router.get('/:projectId/change-requests', authenticateToken, async (req, res) => {
  try {
    const crs = await prisma.projectChangeRequest.findMany({
      where: { projectId: req.params.projectId },
      include: {
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(crs);
  } catch (error) {
    console.error('Erro ao listar change requests:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/:projectId/change-requests', authenticateToken, async (req, res) => {
  try {
    const { title, description, type, impactCost, impactDays, justification } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const cr = await prisma.projectChangeRequest.create({
      data: {
        projectId: req.params.projectId,
        title,
        description,
        type: type || 'SCOPE',
        impactCost: impactCost ? parseFloat(impactCost) : 0,
        impactDays: impactDays ? parseInt(impactDays) : 0,
        requestedById: req.user.id,
        justification: justification || {}
      },
      include: { requestedBy: { select: { id: true, name: true } } }
    });
    res.status(201).json(cr);
  } catch (error) {
    console.error('Erro ao criar change request:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:projectId/change-requests/:crId', authenticateToken, async (req, res) => {
  try {
    const { status, approvedById } = req.body;
    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === 'APPROVED' || status === 'REJECTED') updateData.decidedAt = new Date();
    }
    if (approvedById) updateData.approvedById = approvedById;

    const cr = await prisma.projectChangeRequest.update({
      where: { id: req.params.crId },
      data: updateData
    });
    res.json(cr);
  } catch (error) {
    console.error('Erro ao atualizar change request:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === FATURAMENTO ===
router.get('/:projectId/billings', authenticateToken, async (req, res) => {
  try {
    const billings = await prisma.projectBilling.findMany({
      where: { projectId: req.params.projectId },
      include: { milestone: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(billings);
  } catch (error) {
    console.error('Erro ao listar faturamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/:projectId/billings', authenticateToken, async (req, res) => {
  try {
    const { milestoneId, amount, tax, dueDate, invoiceNumber } = req.body;
    if (!amount) return res.status(400).json({ error: 'Valor é obrigatório' });

    const billing = await prisma.projectBilling.create({
      data: {
        projectId: req.params.projectId,
        milestoneId: milestoneId || null,
        amount: parseFloat(amount),
        tax: tax ? parseFloat(tax) : 0,
        totalAmount: parseFloat(amount) + (tax ? parseFloat(tax) : 0),
        dueDate: dueDate ? new Date(dueDate) : null,
        invoiceNumber: invoiceNumber || null
      }
    });
    res.status(201).json(billing);
  } catch (error) {
    console.error('Erro ao criar faturamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:projectId/billings/:billingId', authenticateToken, async (req, res) => {
  try {
    const { status, invoiceNumber, paidAt } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (invoiceNumber) updateData.invoiceNumber = invoiceNumber;
    if (paidAt) updateData.paidAt = new Date(paidAt);

    const billing = await prisma.projectBilling.update({
      where: { id: req.params.billingId },
      data: updateData
    });
    res.json(billing);
  } catch (error) {
    console.error('Erro ao atualizar faturamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === ACEITE ===
router.get('/:projectId/acceptances', authenticateToken, async (req, res) => {
  try {
    const acceptances = await prisma.projectAcceptance.findMany({
      where: { projectId: req.params.projectId },
      include: { approvedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(acceptances);
  } catch (error) {
    console.error('Erro ao listar aceites:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/:projectId/acceptances', authenticateToken, async (req, res) => {
  try {
    const { type, documentNumber, checklist, notes } = req.body;

    const acceptance = await prisma.projectAcceptance.create({
      data: {
        projectId: req.params.projectId,
        type: type || 'PROVISIONAL',
        documentNumber,
        checklist: checklist || [],
        notes,
        approvedById: req.user.id
      }
    });
    res.status(201).json(acceptance);
  } catch (error) {
    console.error('Erro ao criar aceite:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:projectId/acceptances/:acceptanceId', authenticateToken, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === 'APPROVED') updateData.approvedAt = new Date();
    }
    if (notes !== undefined) updateData.notes = notes;

    const acceptance = await prisma.projectAcceptance.update({
      where: { id: req.params.acceptanceId },
      data: updateData
    });
    res.json(acceptance);
  } catch (error) {
    console.error('Erro ao atualizar aceite:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === CONFIGURAÇÃO B2G ===
router.get('/:projectId/b2g-config', authenticateToken, async (req, res) => {
  try {
    const config = await prisma.projectB2GConfig.findUnique({ where: { projectId: req.params.projectId } });
    res.json(config || {});
  } catch (error) {
    console.error('Erro ao buscar config B2G:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:projectId/b2g-config', authenticateToken, async (req, res) => {
  try {
    const { empenhoNumber, empenhoValue, ordemServicoNumber, editalNumber, orgaoCNPJ, fiscalContrato, gestorContrato, medicoes, aditivos, conformidade } = req.body;
    const updateData = {};
    if (empenhoNumber !== undefined) updateData.empenhoNumber = empenhoNumber;
    if (empenhoValue !== undefined) updateData.empenhoValue = parseFloat(empenhoValue);
    if (ordemServicoNumber !== undefined) updateData.ordemServicoNumber = ordemServicoNumber;
    if (editalNumber !== undefined) updateData.editalNumber = editalNumber;
    if (orgaoCNPJ !== undefined) updateData.orgaoCNPJ = orgaoCNPJ;
    if (fiscalContrato !== undefined) updateData.fiscalContrato = fiscalContrato;
    if (gestorContrato !== undefined) updateData.gestorContrato = gestorContrato;
    if (medicoes !== undefined) updateData.medicoes = medicoes;
    if (aditivos !== undefined) updateData.aditivos = aditivos;
    if (conformidade !== undefined) updateData.conformidade = conformidade;

    const config = await prisma.projectB2GConfig.upsert({
      where: { projectId: req.params.projectId },
      update: updateData,
      create: { projectId: req.params.projectId, ...updateData }
    });
    res.json(config);
  } catch (error) {
    console.error('Erro ao atualizar config B2G:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === CONFIGURAÇÃO B2B ===
router.get('/:projectId/b2b-config', authenticateToken, async (req, res) => {
  try {
    const config = await prisma.projectB2BConfig.findUnique({ where: { projectId: req.params.projectId } });
    res.json(config || {});
  } catch (error) {
    console.error('Erro ao buscar config B2B:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/:projectId/b2b-config', authenticateToken, async (req, res) => {
  try {
    const { slaConfig, slaHistory, billingSchedule, timesheetConfig, contractMargin, realizedMargin } = req.body;
    const updateData = {};
    if (slaConfig !== undefined) updateData.slaConfig = slaConfig;
    if (slaHistory !== undefined) updateData.slaHistory = slaHistory;
    if (billingSchedule !== undefined) updateData.billingSchedule = billingSchedule;
    if (timesheetConfig !== undefined) updateData.timesheetConfig = timesheetConfig;
    if (contractMargin !== undefined) updateData.contractMargin = parseFloat(contractMargin);
    if (realizedMargin !== undefined) updateData.realizedMargin = parseFloat(realizedMargin);

    const config = await prisma.projectB2BConfig.upsert({
      where: { projectId: req.params.projectId },
      update: updateData,
      create: { projectId: req.params.projectId, ...updateData }
    });
    res.json(config);
  } catch (error) {
    console.error('Erro ao atualizar config B2B:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === ANEXOS ===
router.post('/:projectId/attachments', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const { category } = req.body;

    const attachment = await prisma.projectAttachment.create({
      data: {
        projectId: req.params.projectId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        category: category || 'OTHER'
      }
    });
    res.status(201).json(attachment);
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/:projectId/attachments/:attachmentId', authenticateToken, async (req, res) => {
  try {
    const attachment = await prisma.projectAttachment.findUnique({ where: { id: req.params.attachmentId } });
    if (!attachment) return res.status(404).json({ error: 'Arquivo não encontrado' });

    if (fs.existsSync(attachment.path)) fs.unlinkSync(attachment.path);
    await prisma.projectAttachment.delete({ where: { id: req.params.attachmentId } });
    res.json({ message: 'Arquivo removido' });
  } catch (error) {
    console.error('Erro ao deletar anexo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
