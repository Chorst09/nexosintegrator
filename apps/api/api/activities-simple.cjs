const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/activities-simple
router.get('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Token não fornecido' });

    const where = {};
    if (req.user?.role === 'SELLER') {
      where.assignedToId = req.user.userId;
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        company: true,
        opportunity: true,
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    res.json(activities);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/activities-simple
router.post('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Token não fornecido' });

    console.log('🟢 POST /api/activities-simple recebido');
    console.log('📦 Body completo:', JSON.stringify(req.body, null, 2));

    const requestedAssignedToId = String(req.body.assignedToId || '').trim();
    let assignedToId = req.user.userId;

    if (req.user.role === 'SELLER') {
      assignedToId = req.user.userId;
    } else if (requestedAssignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: requestedAssignedToId },
        select: { id: true }
      });

      if (assignedUser?.id) {
        assignedToId = assignedUser.id;
      } else {
        console.warn('⚠️ assignedToId inválido recebido em /activities-simple, usando usuário autenticado.', {
          requestedAssignedToId,
          fallbackUserId: req.user.userId
        });
      }
    }
    
    const activityData = {
      type: req.body.type || 'TASK',
      subject: req.body.subject || 'Sem título',
      description: req.body.description || '',
      status: 'PENDING',
      priority: req.body.priority || 'MEDIUM',
      assignedToId
    };
    
    // Adicionar campos opcionais se fornecidos
    if (req.body.companyId && req.body.companyId.trim() !== '') {
      console.log('📎 Adicionando companyId:', req.body.companyId);
      activityData.companyId = req.body.companyId;
    }
    
    if (req.body.opportunityId && req.body.opportunityId.trim() !== '') {
      console.log('📎 Adicionando opportunityId:', req.body.opportunityId);
      activityData.opportunityId = req.body.opportunityId;
    }
    
    if (req.body.dueDate) {
      console.log('📅 Adicionando dueDate:', req.body.dueDate);
      activityData.dueDate = new Date(req.body.dueDate);
    }
    
    console.log('💾 Dados finais da atividade:', JSON.stringify(activityData, null, 2));
    
    const activity = await prisma.activity.create({
      data: activityData
    });
    
    console.log('✅ Atividade criada com sucesso:', activity.id);
    
    // Log especial para solicitações de orçamento
    if (req.body.type === 'SOLICITACAO_ORCAMENTO') {
      console.log('💰 Nova solicitação de orçamento criada:', activity.id);
    }
    
    res.json({ success: true, activity });
  } catch (error) {
    console.error('🔴 ERRO DETALHADO ao criar atividade:');
    console.error('❌ Mensagem:', error.message);
    console.error('📚 Stack:', error.stack);
    console.error('🔢 Código:', error.code);
    console.error('📦 Body que causou erro:', JSON.stringify(req.body, null, 2));
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// PUT /api/activities-simple
router.put('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Token não fornecido' });

    const { id, status } = req.body;

    if (req.user?.role === 'SELLER') {
      const existing = await prisma.activity.findUnique({
        where: { id },
        select: { assignedToId: true }
      });
      if (!existing) return res.status(404).json({ error: 'Not found' });
      if (existing.assignedToId !== req.user.userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }
    
    const activity = await prisma.activity.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null
      }
    });
    
    res.json({ success: true, activity });
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

module.exports = router;
