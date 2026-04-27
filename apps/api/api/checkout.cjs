const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();
const router = express.Router();

// Configuração do Mercado Pago (adicionar no .env)
const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
const MERCADO_PAGO_PUBLIC_KEY = process.env.MERCADO_PAGO_PUBLIC_KEY || '';
const MERCADO_PAGO_WEBHOOK_TOKEN = process.env.MERCADO_PAGO_WEBHOOK_TOKEN || '';
const FORCE_SIMULATED_PAYMENT = process.env.FORCE_SIMULATED_PAYMENT === 'true';

/**
 * POST /api/checkout/create-preference
 * Criar preferência de pagamento no Mercado Pago
 */
router.post('/create-preference', async (req, res) => {
  try {
    const { planId, companyData } = req.body;

    console.log('🔵 Iniciando create-preference');
    console.log('   Plan ID:', planId);
    console.log('   Company:', companyData?.companyName);
    console.log('   MP Token presente:', !!MERCADO_PAGO_ACCESS_TOKEN);
    console.log('   MP Token length:', MERCADO_PAGO_ACCESS_TOKEN?.length || 0);

    // Validar dados
    if (!planId || !companyData) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Definir planos
    const plans = {
      starter: {
        id: 'starter',
        name: 'Starter',
        price: 297.00,
        description: 'Plano Starter - Até 3 usuários'
      },
      professional: {
        id: 'professional',
        name: 'Professional',
        price: 697.00,
        description: 'Plano Professional - Até 10 usuários'
      }
    };

    const selectedPlan = plans[planId];
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    // Criar registro pendente no banco
    const pendingSubscription = await prisma.pendingSubscription.create({
      data: {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        price: selectedPlan.price,
        companyName: companyData.companyName,
        document: companyData.document,
        email: companyData.email,
        phone: companyData.phone,
        responsibleName: companyData.responsibleName,
        responsibleEmail: companyData.responsibleEmail,
        responsiblePhone: companyData.responsiblePhone,
        status: 'PENDING',
        paymentData: {}
      }
    });

    // Se não tiver token do Mercado Pago configurado OU modo simulado forçado, simular aprovação
    if (FORCE_SIMULATED_PAYMENT || !MERCADO_PAGO_ACCESS_TOKEN || MERCADO_PAGO_ACCESS_TOKEN.trim() === '') {
      console.log('⚠️  Modo simulado ativado. Aprovando pagamento automaticamente...');
      console.log('   Forçado:', FORCE_SIMULATED_PAYMENT);
      console.log('   Token presente:', !!MERCADO_PAGO_ACCESS_TOKEN);
      
      // Aprovar automaticamente em desenvolvimento
      await prisma.pendingSubscription.update({
        where: { id: pendingSubscription.id },
        data: { 
          status: 'APPROVED',
          paymentData: { simulated: true, approvedAt: new Date() }
        }
      });

      // Criar empresa e usuário admin
      const result = await createCompanyAndAdmin(pendingSubscription);

      console.log('✅ Retornando resposta simulada com setupToken:', result.setupToken.substring(0, 10) + '...');

      const simulatedResponse = {
        success: true,
        simulated: true,
        subscriptionId: pendingSubscription.id,
        setupToken: result.setupToken,
        companyId: result.companyId,
        paymentUrl: null, // Modo simulado não precisa de URL
        message: 'Pagamento simulado aprovado (desenvolvimento)'
      };

      console.log('📤 Response simulada:', JSON.stringify(simulatedResponse, null, 2));

      return res.json(simulatedResponse);
    }

    console.log('💳 Mercado Pago configurado! Criando preferência de pagamento...');
    console.log('   Access Token:', MERCADO_PAGO_ACCESS_TOKEN.substring(0, 20) + '...');

    // Criar preferência no Mercado Pago
    const checkoutBaseUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/checkout?plan=${encodeURIComponent(selectedPlan.id)}`;

    const isTestMode = String(MERCADO_PAGO_ACCESS_TOKEN || '').trim().toUpperCase().startsWith('TEST-');

    const preference = {
      items: [
        {
          title: selectedPlan.name,
          description: selectedPlan.description,
          quantity: 1,
          unit_price: selectedPlan.price,
          currency_id: 'BRL'
        }
      ],
      payer: {
        name: companyData.responsibleName,
        email: companyData.responsibleEmail,
        phone: {
          number: companyData.responsiblePhone
        }
      },
      back_urls: {
        success: `${checkoutBaseUrl}&status=success&subscription=${encodeURIComponent(pendingSubscription.id)}`,
        failure: `${checkoutBaseUrl}&status=failure&subscription=${encodeURIComponent(pendingSubscription.id)}`,
        pending: `${checkoutBaseUrl}&status=pending&subscription=${encodeURIComponent(pendingSubscription.id)}`
      },
      external_reference: pendingSubscription.id,
      notification_url: `${process.env.API_URL || 'http://localhost:3002'}/api/checkout/webhook`
    };

    // Em credenciais de teste, reduzir opções que desviam para saldo/linha de
    // crédito, mantendo cartões habilitados para os dados de teste.
    if (isTestMode) {
      preference.payment_methods = {
        excluded_payment_methods: [
          { id: 'consumer_credits' }
        ],
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'bank_transfer' },
          { id: 'atm' },
          { id: 'debit_card' }
        ]
      };
    }

    console.log('📤 Enviando preferência para MP:', JSON.stringify(preference, null, 2));

    // Fazer requisição para o Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json().catch(() => ({}));
      console.error('❌ Erro do Mercado Pago:', mpResponse.status, errorData);
      throw new Error('Erro ao criar preferência no Mercado Pago');
    }

    const mpData = await mpResponse.json();
    // Mesmo com credencial TEST, usar init_point evita problemas conhecidos de
    // tokenização de cartão no domínio sandbox em alguns navegadores.
    const resolvedInitPoint = mpData.init_point || mpData.sandbox_init_point;

    console.log('✅ Preferência criada no MP:', mpData.id);
    console.log('   Init Point:', resolvedInitPoint);

    // Atualizar registro com dados do MP
    await prisma.pendingSubscription.update({
      where: { id: pendingSubscription.id },
      data: {
        paymentData: {
          preferenceId: mpData.id,
          initPoint: resolvedInitPoint,
          sandboxInitPoint: mpData.sandbox_init_point || null
        }
      }
    });

    console.log('✅ Retornando resposta com paymentUrl');
    console.log('   paymentUrl:', resolvedInitPoint);

    // Retornar resposta padronizada
    const response = {
      success: true,
      subscriptionId: pendingSubscription.id,
      paymentUrl: resolvedInitPoint,
      initPoint: resolvedInitPoint, // Compatibilidade
      sandboxInitPoint: mpData.sandbox_init_point || null,
      preferenceId: mpData.id,
      testMode: isTestMode
    };

    console.log('📤 Response final:', JSON.stringify(response, null, 2));

    res.json(response);

  } catch (error) {
    console.error('❌ Erro ao criar preferência:', error);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({ error: 'Erro ao processar checkout', details: error.message });
  }
});

/**
 * POST /api/checkout/webhook
 * Webhook do Mercado Pago para notificações de pagamento
 */
router.post('/webhook', async (req, res) => {
  try {
    // Validar token do webhook (segurança básica)
    const webhookToken = req.headers['x-webhook-token'] || req.query.token;
    if (MERCADO_PAGO_WEBHOOK_TOKEN && webhookToken !== MERCADO_PAGO_WEBHOOK_TOKEN) {
      console.log('⚠️  Webhook token inválido');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, data } = req.body;
    console.log('📥 Webhook recebido:', { type, data });

    if (type === 'payment') {
      const paymentId = data.id;

      // Buscar informações do pagamento no MP
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`
        }
      });

      const payment = await paymentResponse.json();
      const subscriptionId = payment.external_reference;

      console.log('💳 Pagamento:', { 
        id: payment.id, 
        status: payment.status, 
        subscriptionId 
      });

      // Atualizar status da assinatura
      const subscription = await prisma.pendingSubscription.findUnique({
        where: { id: subscriptionId }
      });

      if (!subscription) {
        console.log('❌ Assinatura não encontrada:', subscriptionId);
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      if (payment.status === 'approved') {
        console.log('✅ Pagamento aprovado! Criando empresa...');
        
        await prisma.pendingSubscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'APPROVED',
            paymentData: {
              ...subscription.paymentData,
              paymentId: payment.id,
              status: payment.status,
              approvedAt: new Date()
            }
          }
        });

        // Criar empresa e usuário admin
        await createCompanyAndAdmin(subscription);
        
        console.log('🎉 Empresa criada com sucesso!');
      } else {
        console.log('⏳ Pagamento pendente ou recusado:', payment.status);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

/**
 * GET /api/checkout/success
 * Verificar status do pagamento após retorno do MP
 */
router.get('/success/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await prisma.pendingSubscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    if (subscription.status === 'APPROVED') {
      // Gerar token de setup se ainda não foi criado
      let setupToken = subscription.paymentData?.setupToken;
      
      if (!setupToken) {
        const result = await createCompanyAndAdmin(subscription);
        setupToken = result.setupToken;
      }

      return res.json({
        success: true,
        status: 'APPROVED',
        setupToken,
        email: subscription.responsibleEmail
      });
    }

    res.json({
      success: false,
      status: subscription.status
    });

  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
});

/**
 * GET /api/checkout/verify-token/:token
 * Verificar token de setup
 */
router.get('/verify-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const subscription = await prisma.pendingSubscription.findFirst({
      where: {
        paymentData: {
          path: ['setupToken'],
          equals: token
        },
        status: 'APPROVED'
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Token inválido ou expirado' });
    }

    // Verificar se já expirou (24h)
    const tokenExpiry = new Date(subscription.paymentData.setupTokenExpiry);
    if (tokenExpiry < new Date()) {
      return res.status(400).json({ error: 'Token expirado' });
    }

    // Verificar se já foi usado
    if (subscription.paymentData.adminCreated) {
      return res.status(400).json({ error: 'Conta já foi criada' });
    }

    res.json({
      companyName: subscription.companyName,
      planName: subscription.planName,
      responsibleName: subscription.responsibleName,
      responsibleEmail: subscription.responsibleEmail
    });

  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(500).json({ error: 'Erro ao verificar token' });
  }
});

/**
 * POST /api/checkout/setup-admin
 * Criar usuário administrador após pagamento
 */
router.post('/setup-admin', async (req, res) => {
  try {
    const { token, name, email, password } = req.body;

    if (!token || !name || !email || !password) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Buscar subscription
    const subscription = await prisma.pendingSubscription.findFirst({
      where: {
        paymentData: {
          path: ['setupToken'],
          equals: token
        },
        status: 'APPROVED'
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Token inválido' });
    }

    // Verificar se já expirou
    const tokenExpiry = new Date(subscription.paymentData.setupTokenExpiry);
    if (tokenExpiry < new Date()) {
      return res.status(400).json({ error: 'Token expirado' });
    }

    // Verificar se já foi usado
    if (subscription.paymentData.adminCreated) {
      return res.status(400).json({ error: 'Conta já foi criada' });
    }

    // Buscar empresa
    const company = await prisma.tenantCompany.findUnique({
      where: { id: subscription.paymentData.companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Criar usuário admin
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        tenantCompanyId: company.id,
        isCompanyOwner: true,
        accessB2B: true,
        accessB2G: true,
        accessPreSales: true,
        quota: 999999
      }
    });

    // Marcar como usado
    await prisma.pendingSubscription.update({
      where: { id: subscription.id },
      data: {
        paymentData: {
          ...subscription.paymentData,
          adminCreated: true,
          adminUserId: user.id,
          adminCreatedAt: new Date()
        }
      }
    });

    res.json({
      success: true,
      message: 'Conta criada com sucesso',
      userId: user.id
    });

  } catch (error) {
    console.error('Erro ao criar admin:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

/**
 * Função auxiliar para criar empresa e usuário admin
 */
async function createCompanyAndAdmin(subscription) {
  try {
    // Verificar se já foi criado
    if (subscription.paymentData?.companyId) {
      return {
        companyId: subscription.paymentData.companyId,
        setupToken: subscription.paymentData.setupToken
      };
    }

    // Criar empresa
    const company = await prisma.tenantCompany.create({
      data: {
        name: subscription.companyName,
        cnpj: subscription.document,
        email: subscription.email,
        phone: subscription.phone,
        status: 'ACTIVE'
      }
    });

    // Gerar token de setup (válido por 24h)
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Atualizar subscription com dados da empresa
    await prisma.pendingSubscription.update({
      where: { id: subscription.id },
      data: {
        paymentData: {
          ...subscription.paymentData,
          companyId: company.id,
          setupToken,
          setupTokenExpiry
        }
      }
    });

    // TODO: Enviar email com link de setup
    console.log(`
      ✉️  Email de setup:
      Para: ${subscription.responsibleEmail}
      Link: ${process.env.FRONTEND_URL}/setup?token=${setupToken}
    `);

    return {
      companyId: company.id,
      setupToken
    };

  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    throw error;
  }
}

module.exports = router;
