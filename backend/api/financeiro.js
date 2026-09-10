/**
 * API Routes - Módulo Financeiro
 */

const express = require('express');
const router = express.Router();

const contasReceberService = require('../src/modules/gestao/financeiro/services/contasReceber.service');
const contasPagarService = require('../src/modules/gestao/financeiro/services/contasPagar.service');
const categoriasService = require('../src/modules/gestao/financeiro/services/categorias.service');
const centrosCustoService = require('../src/modules/gestao/financeiro/services/centrosCusto.service');
const dreService = require('../src/modules/gestao/financeiro/services/dre.service');
const fluxoCaixaService = require('../src/modules/gestao/financeiro/services/fluxoCaixa.service');
const dashboardService = require('../src/modules/gestao/financeiro/services/dashboard.service');

const {
  requireFinanceiroView,
  requireFinanceiroCreate,
  requireFinanceiroMarkPaid,
  requireFinanceiroDelete,
} = require('../src/modules/gestao/financeiro/middleware/financeiroAuth.middleware');

// ===== CONTAS A RECEBER =====
router.get('/contas-receber', requireFinanceiroView, async (req, res) => {
  try {
    const { status, clienteId, origem, dataInicio, dataFim, page = 1, limit = 20 } = req.query;
    const result = await contasReceberService.list(
      { status, clienteId, origem, dataInicio, dataFim },
      { page: parseInt(page), limit: parseInt(limit) }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/contas-receber/:id', requireFinanceiroView, async (req, res) => {
  try {
    const conta = await contasReceberService.getById(req.params.id);
    if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json(conta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/contas-receber', requireFinanceiroCreate, async (req, res) => {
  try {
    const conta = await contasReceberService.create(req.body, req.user.id);
    res.status(201).json(conta);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/contas-receber/:id/marcar-pago', requireFinanceiroMarkPaid, async (req, res) => {
  try {
    const { dataRecebimento } = req.body;
    const conta = await contasReceberService.marcarComoPago(req.params.id, dataRecebimento, req.user.id);
    res.json(conta);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/contas-receber/:id', requireFinanceiroDelete, async (req, res) => {
  try {
    await contasReceberService.deleteById(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===== CONTAS A PAGAR =====
router.get('/contas-pagar', requireFinanceiroView, async (req, res) => {
  try {
    const { status, fornecedor, categoriaId, centroCustoId, dataInicio, dataFim, page = 1, limit = 20 } = req.query;
    const result = await contasPagarService.list(
      { status, fornecedor, categoriaId, centroCustoId, dataInicio, dataFim },
      { page: parseInt(page), limit: parseInt(limit) }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/contas-pagar/:id', requireFinanceiroView, async (req, res) => {
  try {
    const conta = await contasPagarService.getById(req.params.id);
    if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json(conta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/contas-pagar', requireFinanceiroCreate, async (req, res) => {
  try {
    const conta = await contasPagarService.create(req.body, req.user.id);
    res.status(201).json(conta);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/contas-pagar/:id/marcar-pago', requireFinanceiroMarkPaid, async (req, res) => {
  try {
    const { dataPagamento } = req.body;
    const conta = await contasPagarService.marcarComoPago(req.params.id, dataPagamento, req.user.id);
    res.json(conta);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/contas-pagar/:id', requireFinanceiroDelete, async (req, res) => {
  try {
    await contasPagarService.deleteById(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===== RELATÓRIOS =====
router.get('/relatorios/dre', requireFinanceiroView, async (req, res) => {
  try {
    const { dataInicio, dataFim, agruparPor } = req.query;
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ error: 'dataInicio e dataFim são obrigatórios' });
    }
    const dre = await dreService.gerarDRE(dataInicio, dataFim, agruparPor);
    res.json(dre);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/relatorios/fluxo-caixa', requireFinanceiroView, async (req, res) => {
  try {
    const { dataInicio, dataFim, agrupamento = 'mes' } = req.query;
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ error: 'dataInicio e dataFim são obrigatórios' });
    }
    const fluxo = await fluxoCaixaService.gerarFluxo(dataInicio, dataFim, agrupamento);
    res.json(fluxo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard', requireFinanceiroView, async (req, res) => {
  try {
    const dashboard = await dashboardService.gerarDashboard();
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== CONFIGURAÇÕES =====
router.get('/categorias', requireFinanceiroView, async (req, res) => {
  try {
    const categorias = await categoriasService.list();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categorias', requireFinanceiroCreate, async (req, res) => {
  try {
    const { nome, tipo } = req.body;
    const categoria = await categoriasService.create(nome, tipo);
    res.status(201).json(categoria);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/categorias/:id/desativar', requireFinanceiroCreate, async (req, res) => {
  try {
    const categoria = await categoriasService.desativar(req.params.id);
    res.json(categoria);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/centros-custo', requireFinanceiroView, async (req, res) => {
  try {
    const centros = await centrosCustoService.list();
    res.json(centros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/centros-custo', requireFinanceiroCreate, async (req, res) => {
  try {
    const { nome, codigo } = req.body;
    const centro = await centrosCustoService.create(nome, codigo);
    res.status(201).json(centro);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
