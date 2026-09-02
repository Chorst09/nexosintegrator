import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit3,
  Filter,
  ListChecks,
  PlusCircle,
  UserPlus
} from 'lucide-react';
import { Issue, Space, User } from '../types';

type ActivityKind = 'all' | 'items' | 'team' | 'risk' | 'done';

type ActivityEvent = {
  id: string;
  kind: Exclude<ActivityKind, 'all'>;
  date: Date;
  actor?: User;
  title: string;
  action: string;
  target: string;
  detail?: string;
  issue?: Issue;
};

type ActivityViewProps = {
  project?: Space;
  issues: Issue[];
  users: User[];
  onTaskClick?: (issue: Issue) => void;
};

const filterOptions: Array<{ id: ActivityKind; label: string }> = [
  { id: 'all', label: 'Tudo' },
  { id: 'items', label: 'Itens' },
  { id: 'team', label: 'Equipe' },
  { id: 'risk', label: 'Risco' },
  { id: 'done', label: 'Concluidos' }
];

function toValidDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelativeDate(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const isFuture = diffMinutes < 0;
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) return 'Agora';
  if (isFuture && absMinutes < 60) return `Em ${absMinutes} min`;
  if (isFuture) {
    const absHours = Math.round(absMinutes / 60);
    if (absHours < 24) return `Em ${absHours} h`;
    const absDays = Math.round(absHours / 24);
    if (absDays < 8) return `Em ${absDays} dia${absDays > 1 ? 's' : ''}`;
  }

  if (diffMinutes < 60) return `Ha ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Ha ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 8) return `Ha ${diffDays} dia${diffDays > 1 ? 's' : ''}`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatAbsoluteDate(date: Date) {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getEventIcon(kind: ActivityEvent['kind'], issue?: Issue) {
  if (kind === 'team') return UserPlus;
  if (kind === 'risk') return AlertCircle;
  if (kind === 'done' || issue?.status === 'CONCLUÍDO') return CheckCircle2;
  if (issue?.sourceType === 'task') return ListChecks;
  return PlusCircle;
}

function getEventTone(kind: ActivityEvent['kind']) {
  if (kind === 'team') return 'text-[#18c8df] bg-[#18c8df]/12 border-[#18c8df]/35';
  if (kind === 'risk') return 'text-red-300 bg-red-500/12 border-red-500/35';
  if (kind === 'done') return 'text-[#22c55e] bg-[#22c55e]/12 border-[#22c55e]/35';
  return 'text-[#ffb15c] bg-[#ff7a00]/12 border-[#ff7a00]/35';
}

function sortByDateDesc(a: ActivityEvent, b: ActivityEvent) {
  return b.date.getTime() - a.date.getTime();
}

export default function ActivityView({ project, issues, users, onTaskClick }: ActivityViewProps) {
  const [activeFilter, setActiveFilter] = useState<ActivityKind>('all');

  const events = useMemo(() => {
    const timeline: ActivityEvent[] = [];
    const fallbackActor = users[0];

    const projectCreatedAt = toValidDate(project?.createdAt);
    if (project && projectCreatedAt) {
      timeline.push({
        id: `project-created-${project.id}`,
        kind: 'items',
        date: projectCreatedAt,
        actor: fallbackActor,
        title: 'Projeto criado',
        action: 'criou o projeto',
        target: project.name,
        detail: project.client ? `Cliente: ${project.client}` : undefined
      });
    }

    for (const member of project?.teamMembers || []) {
      const user = users.find(item => item.id === member.userId || item.memberId === member.id);
      const joinedAt = toValidDate(member.startDate) || toValidDate(member.createdAt);
      if (joinedAt && user) {
        timeline.push({
          id: `team-joined-${member.id}`,
          kind: 'team',
          date: joinedAt,
          actor: user,
          title: 'Membro adicionado',
          action: 'entrou na equipe do projeto',
          target: user.name,
          detail: `${member.role || 'Membro'} · ${member.allocationPercent ?? 100}% alocado`
        });
      }
    }

    for (const issue of issues) {
      const createdAt = toValidDate(issue.createdAt);
      const updatedAt = toValidDate(issue.updatedAt);
      const actor = issue.assignee || fallbackActor;
      const label = issue.sourceType === 'phase' ? 'fase' : 'tarefa';

      if (createdAt) {
        timeline.push({
          id: `${issue.id}-created`,
          kind: 'items',
          date: createdAt,
          actor,
          title: `${label === 'fase' ? 'Fase' : 'Tarefa'} criada`,
          action: `criou a ${label}`,
          target: issue.title,
          detail: issue.assignee?.name ? `Responsavel: ${issue.assignee.name}` : 'Sem responsavel',
          issue
        });
      }

      if (updatedAt && (!createdAt || Math.abs(updatedAt.getTime() - createdAt.getTime()) > 60000)) {
        timeline.push({
          id: `${issue.id}-updated`,
          kind: issue.status === 'CONCLUÍDO' ? 'done' : issue.status === 'EM RISCO' ? 'risk' : 'items',
          date: updatedAt,
          actor,
          title: issue.status === 'CONCLUÍDO' ? 'Item concluido' : 'Item atualizado',
          action: issue.status === 'CONCLUÍDO' ? `concluiu a ${label}` : `atualizou a ${label}`,
          target: issue.title,
          detail: `${issue.status}${issue.estimatedHours ? ` · ${issue.estimatedHours}h estimadas` : ''}`,
          issue
        });
      }

      const dueDate = toValidDate(issue.dueDate);
      if (dueDate && issue.status !== 'CONCLUÍDO' && issue.status !== 'CANCELADO') {
        const now = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
        if (daysUntilDue <= 7) {
          timeline.push({
            id: `${issue.id}-due`,
            kind: daysUntilDue < 0 ? 'risk' : 'items',
            date: dueDate,
            actor,
            title: daysUntilDue < 0 ? 'Prazo vencido' : 'Prazo proximo',
            action: daysUntilDue < 0 ? 'tem prazo vencido em' : 'tem prazo programado para',
            target: issue.title,
            detail: dueDate.toLocaleDateString('pt-BR'),
            issue
          });
        }
      }
    }

    return timeline.sort(sortByDateDesc);
  }, [issues, project, users]);

  const filteredEvents = activeFilter === 'all'
    ? events
    : events.filter(event => event.kind === activeFilter);

  const itemEvents = events.filter(event => event.kind === 'items').length;
  const riskEvents = events.filter(event => event.kind === 'risk').length;
  const teamEvents = events.filter(event => event.kind === 'team').length;

  return (
    <div className="h-full overflow-y-auto bg-[#070b16] p-6 text-slate-300 custom-scrollbar">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-3 text-xl font-bold text-slate-100">
              <Clock className="h-5 w-5 text-[#ff7a00]" />
              Atividade
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Linha do tempo real de fases, tarefas, prazos e equipe deste projeto.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            {filterOptions.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveFilter(option.id)}
                className={`rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
                  activeFilter === option.id
                    ? 'border-[#ff7a00] bg-[#ff7a00] text-white'
                    : 'border-[#263345] bg-[#111827] text-slate-400 hover:border-[#374151] hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-md border border-[#263345] bg-[#111827] p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Eventos</p>
            <p className="mt-2 text-2xl font-black text-slate-100">{events.length}</p>
          </div>
          <div className="rounded-md border border-[#263345] bg-[#111827] p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Itens</p>
            <p className="mt-2 text-2xl font-black text-[#ffb15c]">{itemEvents}</p>
          </div>
          <div className="rounded-md border border-[#263345] bg-[#111827] p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Equipe</p>
            <p className="mt-2 text-2xl font-black text-[#18c8df]">{teamEvents}</p>
          </div>
          <div className="rounded-md border border-[#263345] bg-[#111827] p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Riscos</p>
            <p className={`mt-2 text-2xl font-black ${riskEvents ? 'text-red-300' : 'text-[#22c55e]'}`}>{riskEvents}</p>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#374151] bg-[#111827] p-10 text-center">
            <CalendarClock className="mx-auto mb-3 h-9 w-9 text-[#ff7a00]" />
            <p className="font-bold text-slate-200">Nenhuma atividade encontrada.</p>
            <p className="mt-1 text-sm text-slate-500">Crie fases, tarefas ou adicione membros para preencher a linha do tempo.</p>
          </div>
        ) : (
          <div className="relative ml-4 space-y-5 border-l border-[#263345] pb-12">
            {filteredEvents.map(event => {
              const Icon = getEventIcon(event.kind, event.issue);
              const tone = getEventTone(event.kind);
              const actorInitials = event.actor?.initials || 'PM';
              const actorColor = event.actor?.color || 'bg-[#ff7a00]';

              return (
                <article key={event.id} className="relative pl-8">
                  <div className="absolute -left-[17px] top-1">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-4 ring-[#070b16] ${actorColor}`}>
                      {actorInitials}
                    </div>
                  </div>

                  <div className="rounded-md border border-[#263345] bg-[#111827] p-4 transition-colors hover:border-[#374151]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${tone}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <p className="text-xs font-bold uppercase text-slate-500">{event.title}</p>
                        </div>
                        <p className="text-sm text-slate-300">
                          <span className="font-semibold text-slate-100">{event.actor?.name || 'Sistema'}</span>{' '}
                          <span>{event.action}</span>{' '}
                          {event.issue ? (
                            <button
                              type="button"
                              onClick={() => onTaskClick?.(event.issue as Issue)}
                              className="font-semibold text-[#ffb15c] hover:text-[#ff7a00] hover:underline"
                            >
                              {event.target}
                            </button>
                          ) : (
                            <span className="font-semibold text-[#ffb15c]">{event.target}</span>
                          )}
                        </p>
                        {event.detail && (
                          <p className="mt-2 text-xs text-slate-500">{event.detail}</p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                        <Edit3 className="h-3.5 w-3.5" />
                        <span title={formatAbsoluteDate(event.date)}>{formatRelativeDate(event.date)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
