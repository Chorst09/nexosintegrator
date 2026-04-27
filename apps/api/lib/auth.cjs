const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { normalizeRole, getPermissionTemplate, isMaster } = require('./permissions.cjs');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

const authenticateToken = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    const actualRole = normalizeRole(user.role);
    const legacyRole = actualRole === 'USER' ? 'SELLER' : actualRole;

    // Normalizar formato usado no código atual
    req.user = {
      userId: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: legacyRole,
      actualRole,
      regionId: user.regionId,
      tenantCompanyId: user.tenantCompanyId,
      accessB2B: Boolean(user.accessB2B),
      accessB2G: Boolean(user.accessB2G),
      accessPreSales: Boolean(user.accessPreSales),
      isCompanyOwner: Boolean(user.isCompanyOwner),
      permissions: getPermissionTemplate(actualRole, user.permissionOverrides || {})
    };

    return next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const requireRole = (roles) => {
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    if (isMaster(req.user)) return next();

    const currentRoles = new Set([req.user.role, req.user.actualRole].filter(Boolean));
    const normalizedAllowed = rolesArray.map((item) => normalizeRole(item));
    const allowed = normalizedAllowed.some((allowedRole) => currentRoles.has(allowedRole));

    if (!allowed) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    return next();
  };
};

module.exports = { authenticateToken, requireRole };
