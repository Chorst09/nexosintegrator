/**
 * Middleware de autorização para módulo financeiro
 */

function requireFinanceiroView(req, res, next) {
  const allowedRoles = ['MASTER', 'ADMIN', 'MANAGER', 'DIRECTOR'];
  
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Usuário não possui permissão para visualizar dados financeiros',
      requiredRoles: allowedRoles,
      userRole: req.user.role,
    });
  }

  next();
}

function requireFinanceiroCreate(req, res, next) {
  const allowedRoles = ['MASTER', 'ADMIN', 'MANAGER', 'DIRECTOR'];
  
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Usuário não possui permissão para criar lançamentos financeiros',
    });
  }

  next();
}

function requireFinanceiroMarkPaid(req, res, next) {
  const allowedRoles = ['MASTER', 'ADMIN', 'DIRECTOR'];
  
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Usuário não possui permissão para marcar contas como pagas',
    });
  }

  next();
}

function requireFinanceiroDelete(req, res, next) {
  const allowedRoles = ['MASTER', 'ADMIN', 'DIRECTOR'];
  
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Apenas diretores podem excluir lançamentos financeiros',
    });
  }

  next();
}

module.exports = {
  requireFinanceiroView,
  requireFinanceiroCreate,
  requireFinanceiroMarkPaid,
  requireFinanceiroDelete,
};
