/**
 * Service de Auditoria para Módulo Financeiro
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Registra log de criação
 * @param {string} entidade - 'ContaReceber' | 'ContaPagar'
 * @param {string} id - ID da entidade
 * @param {string} userId - ID do usuário
 * @param {Object} dados - Dados criados
 */
async function registrarCriacao(entidade, id, userId, dados) {
  try {
    await prisma.logAuditoria.create({
      data: {
        entidade,
        entidadeId: id,
        acao: 'CREATE',
        alteracoes: dados,
        userId,
        timestamp: new Date(),
        ...(entidade === 'ContaReceber' ? { contaReceberId: id } : {}),
        ...(entidade === 'ContaPagar' ? { contaPagarId: id } : {}),
      },
    });
  } catch (error) {
    console.error('Erro ao registrar auditoria de criação:', error);
    // Não falha a operação se auditoria falhar
  }
}

/**
 * Registra log de alteração
 * @param {string} entidade
 * @param {string} id
 * @param {string} userId
 * @param {Object} alteracoes - Objeto com campos alterados
 */
async function registrarAlteracao(entidade, id, userId, alteracoes) {
  try {
    await prisma.logAuditoria.create({
      data: {
        entidade,
        entidadeId: id,
        acao: 'UPDATE',
        alteracoes,
        userId,
        timestamp: new Date(),
        ...(entidade === 'ContaReceber' ? { contaReceberId: id } : {}),
        ...(entidade === 'ContaPagar' ? { contaPagarId: id } : {}),
      },
    });
  } catch (error) {
    console.error('Erro ao registrar auditoria de alteração:', error);
  }
}

/**
 * Registra log de mudança de status
 * @param {string} entidade
 * @param {string} id
 * @param {string} userId
 * @param {string} statusAnterior
 * @param {string} statusNovo
 */
async function registrarMudancaStatus(entidade, id, userId, statusAnterior, statusNovo) {
  try {
    await prisma.logAuditoria.create({
      data: {
        entidade,
        entidadeId: id,
        acao: 'STATUS_CHANGE',
        statusAnterior,
        statusNovo,
        userId,
        timestamp: new Date(),
        ...(entidade === 'ContaReceber' ? { contaReceberId: id } : {}),
        ...(entidade === 'ContaPagar' ? { contaPagarId: id } : {}),
      },
    });
  } catch (error) {
    console.error('Erro ao registrar mudança de status:', error);
  }
}

/**
 * Registra log de exclusão
 * @param {string} entidade
 * @param {string} id
 * @param {string} userId
 */
async function registrarExclusao(entidade, id, userId) {
  try {
    await prisma.logAuditoria.create({
      data: {
        entidade,
        entidadeId: id,
        acao: 'DELETE',
        userId,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Erro ao registrar exclusão:', error);
  }
}

/**
 * Lista logs de auditoria por entidade
 * @param {string} entidade
 * @param {string} id
 * @returns {Promise<Array>}
 */
async function listarPorEntidade(entidade, id) {
  return prisma.logAuditoria.findMany({
    where: {
      entidade,
      entidadeId: id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });
}

module.exports = {
  registrarCriacao,
  registrarAlteracao,
  registrarMudancaStatus,
  registrarExclusao,
  listarPorEntidade,
};
