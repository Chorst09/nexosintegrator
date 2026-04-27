import { Navigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { moduleFromPath, canAccessModule, roleSatisfiesAllowed } from '../utils/permissions';

const RoleGuard = ({ children, allowedRoles }) => {
  const location = useLocation();
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const role = user?.role || null;

  if (!allowedRoles || allowedRoles.length === 0) return children;
  if (!role) return <Navigate to="/login" replace />;

  const moduleName = moduleFromPath(location.pathname);
  if (moduleName && !canAccessModule(user, moduleName)) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="crm-panel p-8 text-center max-w-lg motion-safe:animate-fade-up">
          <h1 className="text-2xl font-bold text-[var(--crm-ink)] mb-2">Acesso negado</h1>
          <p className="text-[var(--crm-muted)]">Seu perfil não possui acesso ao módulo solicitado.</p>
        </div>
      </div>
    );
  }

  if (!roleSatisfiesAllowed(role, allowedRoles)) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="crm-panel p-8 text-center max-w-lg motion-safe:animate-fade-up">
          <h1 className="text-2xl font-bold text-[var(--crm-ink)] mb-2">Acesso negado</h1>
          <p className="text-[var(--crm-muted)]">Voce nao tem permissao para acessar esta pagina.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default RoleGuard;
