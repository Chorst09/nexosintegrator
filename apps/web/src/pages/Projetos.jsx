import ProjectManagementApp from '../project-management/App';
import '../project-management/index.css';
import './ProjetosWorkspace.css';

export default function Projetos() {
  return (
    <section className="project-management-embed" aria-label="Gestao de Projetos">
      <ProjectManagementApp />
    </section>
  );
}
