const express = require('express');
const { prisma } = require('../lib/prisma.cjs');
const { authenticateToken } = require('../lib/auth.cjs');
const { canAccessModule } = require('../lib/permissions.cjs');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

const ACTIVITY_FLOW_MARKER = '[CRM_ACTIVITY_FLOW]';
const PROPOSAL_SENT_STAGE = 'PROPOSTA_ENVIADA';

const generateBudgetNumber = async () => {
  const year = new Date().getFullYear();
  const suffix = `-${year}`;
  const currentYearRequests = await prisma.preSalesRequest.findMany({
    where: {
      numero: {
        startsWith: 'ORC-',
        endsWith: suffix
      }
    },
    select: { numero: true }
  });

  const current = currentYearRequests.reduce((max, request) => {
    const match = String(request?.numero || '').match(/^ORC-(\d{4})-\d{4}$/);
    const parsed = match ? parseInt(match[1], 10) : 0;
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);
  return `ORC-${String(current + 1).padStart(4, '0')}-${year}`;
};

const extractSourceActivityId = (observacoes = '') => {
  const match = String(observacoes || '').match(/\[FLOW_ACTIVITY_ID:([^\]]+)\]/);
  return match?.[1] || null;
};

const parseFlowFromDescription = (description) => {
  const value = String(description || '');
  const markerIdx = value.indexOf(ACTIVITY_FLOW_MARKER);
  if (markerIdx < 0) {
    return {
      cleanDescription: value.trim(),
      flow: {
        sourceArea: 'COMERCIAL',
        targetArea: 'COMERCIAL',
        createdFrom: 'LEGACY'
      }
    };
  }

  const cleanDescription = value.slice(0, markerIdx).trim();
  const raw = value.slice(markerIdx + ACTIVITY_FLOW_MARKER.length).trim();
  let flow = {};
  try {
    flow = JSON.parse(raw);
  } catch {
    flow = {};
  }

  return {
    cleanDescription,
    flow: {
      ...(flow && typeof flow === 'object' ? flow : {}),
      sourceArea: flow?.sourceArea || 'COMERCIAL',
      targetArea: flow?.targetArea || 'COMERCIAL',
      createdFrom: flow?.createdFrom || 'ATIVIDADES',
      createdByName: flow?.createdByName || ''
    }
  };
};

const buildDescriptionWithFlow = (cleanDescription, flow = {}) => (
  `${String(cleanDescription || '').trim()}\n\n${ACTIVITY_FLOW_MARKER}${JSON.stringify({
    ...(flow && typeof flow === 'object' ? flow : {}),
    updatedAt: new Date().toISOString()
  })}`
);

const preSalesRequestInclude = {
  solicitante: {
    select: { id: true, name: true, email: true }
  },
  lead: {
    select: { id: true, name: true }
  },
  opportunity: {
    select: { id: true, title: true, value: true, stage: true }
  },
  items: {
    include: {
      product: {
        select: { id: true, name: true, price: true, category: true }
      }
    }
  }
};

const syncPreSalesReturnToCommercial = async (tx, solicitacao = {}, status = 'ENVIADA') => {
  const activityId = extractSourceActivityId(solicitacao?.observacoes);
  if (!activityId) return null;

  const activity = await tx.activity.findUnique({
    where: { id: activityId },
    select: { id: true, description: true }
  });
  if (!activity) return null;

  const parsed = parseFlowFromDescription(activity.description);
  const sourceArea = parsed.flow?.sourceArea && parsed.flow.sourceArea !== 'PRE_VENDAS'
    ? parsed.flow.sourceArea
    : 'COMERCIAL';

  return tx.activity.update({
    where: { id: activityId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      description: buildDescriptionWithFlow(parsed.cleanDescription, {
        ...parsed.flow,
        targetArea: sourceArea,
        returnedFromPreSales: true,
        activityStage: PROPOSAL_SENT_STAGE,
        preSalesStatus: status,
        preSalesRequestId: solicitacao.id,
        preSalesNumber: solicitacao.numero,
        preSalesReturnedAt: new Date().toISOString()
      })
    },
    select: { id: true }
  });
};

const sanitizePreSalesItems = (items = []) => (
  Array.isArray(items)
    ? items
        .filter((item) => String(item?.descricao || item?.description || '').trim())
        .map((item) => {
          const icmsCompra = item.icmsCompra === '' || item.icmsCompra === undefined || item.icmsCompra === null
            ? null
            : Number(item.icmsCompra) || 0;

          return {
            productId: item.productId || null,
            descricao: String(item.descricao || item.description || '').trim(),
            quantidade: Math.max(1, parseInt(item.quantidade ?? item.quantity ?? 1, 10) || 1),
            custoUnitario: Number(item.custoUnitario ?? item.unitCost ?? item.assetValueBRL ?? 0) || 0,
            precoSugerido: Number(item.precoSugerido ?? 0) || 0,
            margemLucro: Number(item.margemLucro ?? 0) || 0,
            observacoes: icmsCompra === null ? (item.observacoes || null) : JSON.stringify({
              ...(item.observacoes && typeof item.observacoes === 'object' ? item.observacoes : {}),
              icmsCompra
            })
          };
        })
    : []
);

// GET /api/pre-vendas - Listar todas as solicitações de precificação
router.get('/', async (req, res) => {
  try {
    const { status, prioridade, page = 1, limit = 10, search } = req.query;
    
    const where = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (prioridade) {
      where.prioridade = prioridade;
    }
    
    if (search) {
      where.OR = [
        { titulo: { contains: search, mode: 'insensitive' } },
        { numero: { contains: search, mode: 'insensitive' } },
        { descricao: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [solicitacoes, total] = await Promise.all([
      prisma.preSalesRequest.findMany({
        where,
        include: {
          solicitante: {
            select: { id: true, name: true, email: true }
          },
          lead: {
            select: { id: true, name: true }
          },
          opportunity: {
            select: { id: true, title: true }
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.preSalesRequest.count({ where })
    ]);

    res.json({
      success: true,
      solicitacoes,
      total,
      data: solicitacoes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/pre-vendas/stats - Estatísticas do dashboard
router.get('/stats', async (req, res) => {
  try {
    const [
      novas,
      emPrecificacao,
      aguardandoAprovacao,
      finalizadas,
      totalMes,
      valorTotalMes
    ] = await Promise.all([
      prisma.preSalesRequest.count({ where: { status: 'NOVA' } }),
      prisma.preSalesRequest.count({ where: { status: 'EM_PRECIFICACAO' } }),
      prisma.preSalesRequest.count({ where: { status: 'AGUARDANDO_APROVACAO' } }),
      prisma.preSalesRequest.count({ where: { status: 'FINALIZADA' } }),
      prisma.preSalesRequest.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.preSalesRequest.aggregate({
        where: {
          status: 'FINALIZADA',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { valorSugerido: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        novas,
        emPrecificacao,
        aguardandoAprovacao,
        finalizadas,
        totalMes,
        valorTotalMes: valorTotalMes._sum.valorSugerido || 0
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/pre-vendas/:id - Buscar solicitação por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const solicitacao = await prisma.preSalesRequest.findUnique({
      where: { id },
      include: {
        solicitante: {
          select: { id: true, name: true, email: true }
        },
        lead: {
          select: { id: true, name: true }
        },
        opportunity: {
          select: { id: true, title: true, value: true, stage: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, category: true }
            }
          }
        },
        aprovacoes: {
          include: {
            aprovador: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!solicitacao) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada'
      });
    }

    res.json({
      success: true,
      data: solicitacao
    });
  } catch (error) {
    console.error('Erro ao buscar solicitação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/pre-vendas - Criar nova solicitação
router.post('/', async (req, res) => {
  try {
    const {
      numero,
      titulo,
      descricao,
      nomeCliente,
      modalidade,
      prioridade = 'MEDIUM',
      leadId,
      opportunityId,
      tiposPrecificacao,
      regimeTributario,
      items = [],
      calculoDetalhes,
      observacoes
    } = req.body;

    // Validações
    if (!titulo || !descricao) {
      return res.status(400).json({
        success: false,
        message: 'Título e descrição são obrigatórios'
      });
    }

    if (!tiposPrecificacao || tiposPrecificacao.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pelo menos um tipo de precificação deve ser selecionado'
      });
    }

    const requestedNumber = String(numero || '').trim().toUpperCase();
    let numeroFormatado = /^ORC-\d{4}-\d{4}$/.test(requestedNumber)
      ? requestedNumber
      : await generateBudgetNumber();
    const existingNumber = await prisma.preSalesRequest.findUnique({
      where: { numero: numeroFormatado },
      select: { id: true }
    });
    if (existingNumber) {
      numeroFormatado = await generateBudgetNumber();
    }
    const requestItems = sanitizePreSalesItems(items);

    // Criar orçamento
    const solicitacao = await prisma.preSalesRequest.create({
      data: {
        numero: numeroFormatado,
        titulo,
        descricao,
        nomeCliente: nomeCliente || null,
        modalidade: modalidade || null,
        prioridade,
        status: 'NOVA',
        tiposPrecificacao,
        regimeTributario,
        calculoDetalhes: calculoDetalhes && typeof calculoDetalhes === 'object' ? calculoDetalhes : undefined,
        observacoes,
        solicitanteId: req.user.userId, // Usar req.user.userId em vez de req.user.id
        leadId: leadId || null,
        opportunityId: opportunityId || null,
        ...(requestItems.length > 0 ? { items: { create: requestItems } } : {})
      },
      include: {
        solicitante: {
          select: { id: true, name: true, email: true }
        },
        lead: {
          select: { id: true, name: true }
        },
        opportunity: {
          select: { id: true, title: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Orçamento criado com sucesso',
      data: solicitacao
    });
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/pre-vendas/:id - Atualizar solicitação
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descricao,
      nomeCliente,
      modalidade,
      prioridade,
      status,
      tiposPrecificacao,
      regimeTributario,
      leadId,
      opportunityId,
      valorSugerido,
      custoTotal,
      margemLucro,
      calculoDetalhes,
      observacoes,
      items = []
    } = req.body;

    // Verificar se a solicitação existe
    const solicitacaoExistente = await prisma.preSalesRequest.findUnique({
      where: { id }
    });

    if (!solicitacaoExistente) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada'
      });
    }

    // Verificar permissões (apenas o solicitante ou admin pode editar)
    const userCanOperatePreSales = canAccessModule(req.user, 'PRE_SALES');
    if (
      solicitacaoExistente.solicitanteId !== req.user.userId &&
      req.user.role !== 'ADMIN' &&
      !userCanOperatePreSales
    ) {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para editar esta solicitação'
      });
    }

    const updateData = {
      titulo,
      descricao,
      nomeCliente: nomeCliente === undefined ? undefined : nomeCliente || null,
      modalidade: modalidade === undefined ? undefined : modalidade || null,
      prioridade,
      status,
      tiposPrecificacao,
      regimeTributario,
      leadId: leadId === undefined ? undefined : leadId || null,
      opportunityId: opportunityId === undefined ? undefined : opportunityId || null,
      valorSugerido: valorSugerido === '' || valorSugerido === undefined || valorSugerido === null ? undefined : parseFloat(valorSugerido),
      custoTotal: custoTotal === '' || custoTotal === undefined || custoTotal === null ? undefined : parseFloat(custoTotal),
      margemLucro: margemLucro === '' || margemLucro === undefined || margemLucro === null ? undefined : parseFloat(margemLucro),
      calculoDetalhes: calculoDetalhes === undefined ? undefined : calculoDetalhes,
      observacoes,
      updatedAt: new Date()
    };

    if (Object.prototype.hasOwnProperty.call(req.body, 'items')) {
      updateData.items = {
        deleteMany: {},
        create: sanitizePreSalesItems(items)
      };
    }

    // Atualizar solicitação
    const solicitacao = await prisma.preSalesRequest.update({
      where: { id },
      data: updateData,
      include: {
        solicitante: {
          select: { id: true, name: true, email: true }
        },
        lead: {
          select: { id: true, name: true }
        },
        opportunity: {
          select: { id: true, title: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Solicitação atualizada com sucesso',
      data: solicitacao
    });
  } catch (error) {
    console.error('Erro ao atualizar solicitação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/pre-vendas/:id/devolver-comercial - Finalizar orçamento e devolver ao Comercial
router.post('/:id/devolver-comercial', async (req, res) => {
  try {
    const { id } = req.params;

    const solicitacaoExistente = await prisma.preSalesRequest.findUnique({
      where: { id },
      select: { id: true, solicitanteId: true }
    });

    if (!solicitacaoExistente) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada'
      });
    }

    const userCanOperatePreSales = canAccessModule(req.user, 'PRE_SALES');
    if (
      solicitacaoExistente.solicitanteId !== req.user.userId &&
      req.user.role !== 'ADMIN' &&
      !userCanOperatePreSales
    ) {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para devolver esta solicitação'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const solicitacao = await tx.preSalesRequest.update({
        where: { id },
        data: {
          status: 'ENVIADA',
          updatedAt: new Date()
        },
        include: preSalesRequestInclude
      });
      const returnedActivity = await syncPreSalesReturnToCommercial(tx, solicitacao, 'ENVIADA');
      return { solicitacao, returnedActivity };
    });

    res.json({
      success: true,
      message: result.returnedActivity
        ? 'Orçamento devolvido ao Comercial com sucesso'
        : 'Orçamento marcado como enviado; atividade original não encontrada',
      data: result.solicitacao,
      returnedActivityId: result.returnedActivity?.id || null
    });
  } catch (error) {
    console.error('Erro ao devolver orçamento ao Comercial:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/pre-vendas/:id/calcular - Calcular precificação
router.post('/:id/calcular', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      custoUnitario,
      quantidade = 1,
      frete = 0,
      outrasDesp = 0,
      margemDesejada = 30,
      regimeTributario = 'LUCRO_PRESUMIDO'
    } = req.body;

    if (!custoUnitario || custoUnitario <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Custo unitário é obrigatório e deve ser maior que zero'
      });
    }

    const custo = parseFloat(custoUnitario);
    const qtd = parseInt(quantidade);
    const freteTotal = parseFloat(frete);
    const despesas = parseFloat(outrasDesp);
    const margem = parseFloat(margemDesejada);

    const custoTotal = (custo * qtd) + freteTotal + despesas;
    
    // Cálculo de impostos baseado no regime tributário
    let aliquotaImpostos = 0;
    
    switch (regimeTributario) {
      case 'LUCRO_PRESUMIDO':
        aliquotaImpostos = 0.1133; // ~11.33%
        break;
      case 'LUCRO_REAL':
        aliquotaImpostos = 0.15; // ~15%
        break;
      case 'SIMPLES_NACIONAL':
        aliquotaImpostos = 0.08; // ~8%
        break;
      default:
        aliquotaImpostos = 0.1133;
    }

    const impostos = custoTotal * aliquotaImpostos;
    const precoVenda = custoTotal / (1 - (margem / 100) - aliquotaImpostos);
    const lucroLiquido = precoVenda - custoTotal - impostos;
    const margemReal = (lucroLiquido / precoVenda) * 100;
    const markup = ((precoVenda / custoTotal) * 100) - 100;

    const resultado = {
      custoTotal,
      impostos,
      precoVenda,
      lucroLiquido,
      margemReal,
      markup,
      composicao: {
        custo: (custoTotal / precoVenda) * 100,
        impostos: (impostos / precoVenda) * 100,
        lucro: margemReal
      },
      detalhes: {
        custoUnitario: custo,
        quantidade: qtd,
        frete: freteTotal,
        outrasDesp: despesas,
        margemDesejada: margem,
        regimeTributario,
        aliquotaImpostos: aliquotaImpostos * 100
      }
    };

    // Atualizar a solicitação com os valores calculados
    await prisma.preSalesRequest.update({
      where: { id },
      data: {
        valorSugerido: precoVenda,
        custoTotal: custoTotal,
        margemLucro: margemReal,
        status: 'EM_PRECIFICACAO',
        calculoDetalhes: resultado
      }
    });

    res.json({
      success: true,
      message: 'Precificação calculada com sucesso',
      data: resultado
    });
  } catch (error) {
    console.error('Erro ao calcular precificação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/pre-vendas/:id/aprovar - Aprovar solicitação
router.post('/:id/aprovar', async (req, res) => {
  try {
    const { id } = req.params;
    const { observacoes } = req.body;

    // Verificar se o usuário tem permissão para aprovar
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para aprovar solicitações'
      });
    }

    const solicitacao = await prisma.preSalesRequest.findUnique({
      where: { id }
    });

    if (!solicitacao) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada'
      });
    }

    // Atualizar status e criar registro de aprovação
    const [solicitacaoAtualizada] = await Promise.all([
      prisma.preSalesRequest.update({
        where: { id },
        data: {
          status: 'FINALIZADA',
          dataAprovacao: new Date(),
          aprovadoPorId: req.user.userId
        },
        include: {
          solicitante: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.preSalesApproval.create({
        data: {
          preSalesRequestId: id,
          aprovadorId: req.user.userId,
          status: 'APROVADA',
          observacoes
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Solicitação aprovada com sucesso',
      data: solicitacaoAtualizada
    });
  } catch (error) {
    console.error('Erro ao aprovar solicitação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/pre-vendas/:id/rejeitar - Rejeitar solicitação
router.post('/:id/rejeitar', async (req, res) => {
  try {
    const { id } = req.params;
    const { observacoes } = req.body;

    // Verificar se o usuário tem permissão para rejeitar
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para rejeitar solicitações'
      });
    }

    const solicitacao = await prisma.preSalesRequest.findUnique({
      where: { id }
    });

    if (!solicitacao) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada'
      });
    }

    // Atualizar status e criar registro de rejeição
    const [solicitacaoAtualizada] = await Promise.all([
      prisma.preSalesRequest.update({
        where: { id },
        data: {
          status: 'REJEITADA',
          dataRejeicao: new Date(),
          rejeitadoPorId: req.user.userId
        },
        include: {
          solicitante: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.preSalesApproval.create({
        data: {
          preSalesRequestId: id,
          aprovadorId: req.user.userId,
          status: 'REJEITADA',
          observacoes
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Solicitação rejeitada',
      data: solicitacaoAtualizada
    });
  } catch (error) {
    console.error('Erro ao rejeitar solicitação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// DELETE /api/pre-vendas/:id - Excluir solicitação
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const solicitacao = await prisma.preSalesRequest.findUnique({
      where: { id }
    });

    if (!solicitacao) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada'
      });
    }

    // Verificar permissões - apenas ADMIN ou o próprio solicitante
    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = solicitacao.solicitanteId === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para excluir esta solicitação'
      });
    }

    // TEMPORÁRIO: Permitir exclusão independente do status
    // TODO: Reativar validação após limpeza de orçamentos antigos
    // if (!isAdmin && solicitacao.status === 'FINALIZADA') {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Não é possível excluir solicitações finalizadas. Contate um administrador.'
    //   });
    // }

    await prisma.preSalesRequest.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Solicitação excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir solicitação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;
