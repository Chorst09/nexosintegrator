
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = (() => {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) throw new Error('JWT_SECRET precisa estar configurado');
  return secret;
})();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }

    const userId = decoded?.userId || decoded?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
        tenantCompanyId: true,
        accessB2B: true,
        accessB2G: true,
        accessPreSales: true,
        permissionOverrides: true,
        isCompanyOwner: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const actualRole = String(user.role || 'USER').toUpperCase();
    const legacyRole = actualRole === 'USER' ? 'SELLER' : actualRole;

    req.user = {
      userId: user.id,
      id: user.id,
      email: user.email,
      role: legacyRole,
      actualRole,
      name: user.name,
      regionId: user.regionId,
      tenantCompanyId: user.tenantCompanyId,
      accessB2B: Boolean(user.accessB2B),
      accessB2G: Boolean(user.accessB2G),
      accessPreSales: Boolean(user.accessPreSales),
      permissionOverrides: user.permissionOverrides || {},
      isCompanyOwner: Boolean(user.isCompanyOwner)
    };
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const isMaster = (user) => String(user?.role || '').toUpperCase() === 'MASTER';

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (isMaster(req.user)) return next();

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  };
};

module.exports = { authenticateToken, requireRole };
