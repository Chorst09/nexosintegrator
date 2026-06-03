const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../lib/auth');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = (() => {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) throw new Error('JWT_SECRET precisa estar configurado');
  return secret;
})();
const JWT_EXPIRES_IN = '7d';

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Não precisamos mais salvar sessões no banco, apenas usar JWT

    // Não precisamos mais atualizar lastLogin

    // Remover senha da resposta
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    // Com JWT, não precisamos fazer nada no servidor
    // O token será invalidado no frontend
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Verificar JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Buscar usuário atual
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      res.json({ user });
    } catch (jwtError) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alterar senha
router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar sessão
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(currentPassword, session.user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar usuários (apenas admin/manager)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    // Verificar permissão
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
        quota: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar usuário (apenas admin)
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, region, quota } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Verificar permissão
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'SELLER',
        region,
        quota
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
        quota: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar usuário (apenas admin)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, regionId, quota } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Verificar permissão
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        regionId,
        quota
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
        quota: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;