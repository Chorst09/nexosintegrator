import bcrypt from 'bcryptjs';
import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { generateToken, authenticateUser } from './lib/auth.js';
import { normalizeRole, resolveUserAccess, getPermissionTemplate, isMaster } from './lib/permissions.js';

const PRIVILEGED_ROLES = new Set(['MASTER', 'ADMIN', 'DIRECTOR', 'MANAGER']);

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const getAuthMasterKey = () => String(process.env.AUTH_MASTER_KEY || '').trim();
const getMasterEmails = () =>
  new Set(
    String(process.env.MASTER_EMAILS || process.env.MASTER_EMAIL || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );

const isMasterEmail = (value) => getMasterEmails().has(normalizeEmail(value));

const sanitizeUserPayload = (user = {}) => {
  const role = normalizeRole(user.role);
  const access = resolveUserAccess(role, user);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    regionId: user.regionId || null,
    quota: user.quota ?? null,
    tenantCompanyId: user.tenantCompanyId || null,
    accessB2B: access.accessB2B,
    accessB2G: access.accessB2G,
    accessPreSales: access.accessPreSales,
    isCompanyOwner: Boolean(user.isCompanyOwner),
    permissions: getPermissionTemplate(role, user.permissionOverrides || {}),
    createdAt: user.createdAt || null
  };
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return handleCORS();
  }

  const prisma = getPrisma();
  const path = event.path.replace('/.netlify/functions/auth', '').replace('/api/auth', '');
  const method = event.httpMethod;

  try {
    // POST /login
    if (path === '/login' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { email, password } = body;
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail || !password) {
        return error('Email e senha são obrigatórios', 400);
      }

      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive'
          }
        }
      });

      if (!user) {
        return error('Credenciais inválidas', 401);
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return error('Credenciais inválidas', 401);
      }

      const token = generateToken(user.id);
      const { password: _, ...userWithoutPassword } = user;

      return success({
        user: sanitizeUserPayload(userWithoutPassword),
        token
      });
    }

    // POST /register
    if (path === '/register' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { name, email, password, confirmPassword, role, inviteCode } = body;
      const normalizedName = String(name || '').trim();
      const normalizedEmail = normalizeEmail(email);
      const rawPassword = String(password || '');
      const rawConfirmPassword = String(confirmPassword || '');
      const requestedRole = normalizeRole(role || 'USER');

      if (!normalizedName || !normalizedEmail || !rawPassword) {
        return error('Nome, email e senha são obrigatórios', 400);
      }

      if (rawPassword.length < 6) {
        return error('A senha deve ter pelo menos 6 caracteres', 400);
      }

      if (rawConfirmPassword && rawPassword !== rawConfirmPassword) {
        return error('As senhas não conferem', 400);
      }

      let finalRole = 'USER';
      if (PRIVILEGED_ROLES.has(requestedRole)) {
        const masterKey = getAuthMasterKey();
        if (!masterKey || String(inviteCode || '') !== masterKey) {
          return error('Código de convite inválido para perfil administrativo', 403);
        }
        if (requestedRole === 'MASTER' && !isMasterEmail(normalizedEmail)) {
          return error('Este email não está autorizado para role MASTER', 403);
        }
        finalRole = requestedRole;
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive'
          }
        }
      });

      if (existingUser) {
        return error('Email já está em uso', 400);
      }

      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      const roleAccess = resolveUserAccess(finalRole, {
        accessB2B: body?.accessB2B,
        accessB2G: body?.accessB2G,
        accessPreSales: body?.accessPreSales
      });

      const user = await prisma.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          password: hashedPassword,
          role: finalRole,
          accessB2B: roleAccess.accessB2B,
          accessB2G: roleAccess.accessB2G,
          accessPreSales: roleAccess.accessPreSales,
          isCompanyOwner: finalRole === 'ADMIN'
        }
      });

      return success({
        message: 'Usuário criado com sucesso',
        user: sanitizeUserPayload(user)
      }, 201);
    }

    // GET /me
    if (path === '/me' && method === 'GET') {
      const user = await authenticateUser(event.headers);
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      return success({ user: sanitizeUserPayload(fullUser) });
    }

    // POST /logout
    if (path === '/logout' && method === 'POST') {
      return success({ message: 'Logout realizado com sucesso' });
    }

    // POST /forgot-password
    if (path === '/forgot-password' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { email, newPassword, confirmPassword, recoveryCode } = body;
      const normalizedEmail = normalizeEmail(email);
      const nextPassword = String(newPassword || '');
      const nextPasswordConfirm = String(confirmPassword || '');
      const masterKey = getAuthMasterKey();

      if (!normalizedEmail || !nextPassword) {
        return error('Email e nova senha são obrigatórios', 400);
      }

      if (nextPassword.length < 6) {
        return error('A nova senha deve ter pelo menos 6 caracteres', 400);
      }

      if (nextPasswordConfirm && nextPassword !== nextPasswordConfirm) {
        return error('As senhas não conferem', 400);
      }

      if (!masterKey) {
        return error('Recuperação por código indisponível. Contate o administrador.', 503);
      }

      if (String(recoveryCode || '') !== masterKey) {
        return error('Código de recuperação inválido', 403);
      }

      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive'
          }
        }
      });

      if (!user) {
        return error('Usuário não encontrado', 404);
      }

      const hashedPassword = await bcrypt.hash(nextPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      return success({ message: 'Senha redefinida com sucesso' });
    }

    return error('Rota não encontrada', 404);
  } catch (err) {
    console.error('Erro na função auth:', err);
    return error(err.message || 'Erro interno do servidor', 500);
  }
}
