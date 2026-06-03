import jwt from 'jsonwebtoken';
import getPrisma from './prisma.js';
import { normalizeRole, getPermissionTemplate, isMaster } from './permissions.js';

const JWT_SECRET = (() => {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) throw new Error('JWT_SECRET precisa estar configurado');
  return secret;
})();

function getBearerToken(headers) {
  const header = headers.authorization || headers.Authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

export async function authenticateUser(headers) {
  const token = getBearerToken(headers);
  if (!token) {
    throw new Error('Token não fornecido');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token inválido');
  }

  const prisma = getPrisma();
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
    throw new Error('Usuário não encontrado');
  }

  const actualRole = normalizeRole(user.role);
  const legacyRole = actualRole === 'USER' ? 'SELLER' : actualRole;

  return {
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
}

export function requireRole(user, roles) {
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  
  if (isMaster(user)) return true;

  const currentRoles = new Set([user.role, user.actualRole].filter(Boolean));
  const normalizedAllowed = rolesArray.map((item) => normalizeRole(item));
  const allowed = normalizedAllowed.some((allowedRole) => currentRoles.has(allowedRole));

  if (!allowed) {
    throw new Error('Acesso negado');
  }
  
  return true;
}

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
