import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = (() => {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) throw new Error('JWT_SECRET precisa estar configurado');
  return secret;
})();

const getAuthToken = (req) => {
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
  if (typeof authHeader !== 'string') return null;
  return authHeader.replace(/^Bearer\s+/i, '').trim() || null;
};

const requireMasterAccess = (req) => {
  const token = getAuthToken(req);

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token de acesso requerido' }), { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded?.role !== 'MASTER') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
    }
    return null;
  } catch {
    return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), { status: 403 });
  }
};

export default async function handler(req) {
  // POST /api/licensing/public/checkout/confirm
  if (req.method === 'POST' && req.url.includes('/public/checkout/confirm')) {
    try {
      const body = await req.json();
      const {
        paymentId,
        paymentReference,
        paymentStatus,
        planCode,
        company,
        adminUser
      } = body;

      // Validações
      if (!company?.name || !company?.email || !company?.cnpj) {
        return new Response(
          JSON.stringify({ error: 'Dados da empresa incompletos' }),
          { status: 400 }
        );
      }

      if (!adminUser?.name || !adminUser?.email || !adminUser?.password) {
        return new Response(
          JSON.stringify({ error: 'Dados do usuário admin incompletos' }),
          { status: 400 }
        );
      }

      // Verificar se empresa já existe
      const existingCompany = await prisma.company.findFirst({
        where: { 
          OR: [
            { document: company.cnpj }
          ]
        }
      });

      if (existingCompany) {
        return new Response(
          JSON.stringify({ error: 'Empresa já cadastrada' }),
          { status: 409 }
        );
      }

      // Verificar se email do admin já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: adminUser.email }
      });

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: 'Email do administrador já em uso' }),
          { status: 409 }
        );
      }

      // Criar empresa
      const newCompany = await prisma.company.create({
        data: {
          name: company.name,
          document: company.cnpj,
          status: 'ACTIVE'
        }
      });

      // Hash da senha
      const hashedPassword = bcrypt.hashSync(adminUser.password, 10);

      // Criar usuário admin
      const newUser = await prisma.user.create({
        data: {
          name: adminUser.name,
          email: adminUser.email,
          password: hashedPassword,
          role: 'ADMIN'
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          company: {
            id: newCompany.id,
            name: newCompany.name,
            email: newCompany.email
          },
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
          },
          message: 'Empresa e usuário criados com sucesso'
        }),
        { status: 201 }
      );
    } catch (error) {
      console.error('Erro ao confirmar checkout:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar checkout' }),
        { status: 500 }
      );
    }
  }

  // GET /api/licensing/plans
  if (req.method === 'GET' && req.url.includes('/plans')) {
    const authError = requireMasterAccess(req);
    if (authError) return authError;

    try {
      // Retornar planos padrão
      const plans = [
        {
          id: 'plan-mensal',
          name: 'Plano Mensal',
          code: 'MENSAL',
          price: 299.00,
          currency: 'BRL',
          seatsIncluded: 5,
          description: 'Plano mensal com 5 assentos'
        },
        {
          id: 'plan-trimestral',
          name: 'Plano Trimestral',
          code: 'TRIMESTRAL',
          price: 799.00,
          currency: 'BRL',
          seatsIncluded: 10,
          description: 'Plano trimestral com 10 assentos'
        },
        {
          id: 'plan-semestral',
          name: 'Plano Semestral',
          code: 'SEMESTRAL',
          price: 1499.00,
          currency: 'BRL',
          seatsIncluded: 20,
          description: 'Plano semestral com 20 assentos'
        },
        {
          id: 'plan-anual',
          name: 'Plano Anual',
          code: 'ANUAL',
          price: 2499.00,
          currency: 'BRL',
          seatsIncluded: 50,
          description: 'Plano anual com 50 assentos'
        }
      ];

      return new Response(JSON.stringify({ data: plans }), { status: 200 });
    } catch (error) {
      console.error('Erro ao listar planos:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao listar planos' }),
        { status: 500 }
      );
    }
  }

  // GET /api/licensing/companies
  if (req.method === 'GET' && req.url.includes('/companies')) {
    const authError = requireMasterAccess(req);
    if (authError) return authError;

    try {
      const companies = await prisma.company.findMany({
        select: {
          id: true,
          name: true,
          document: true,
          status: true,
          createdAt: true,
          _count: {
            select: { contacts: true }
          }
        }
      });

      return new Response(JSON.stringify({ data: companies }), { status: 200 });
    } catch (error) {
      console.error('Erro ao listar empresas:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao listar empresas' }),
        { status: 500 }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Rota não encontrada' }), {
    status: 404
  });
}
