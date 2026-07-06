/**
 * ============================================================
 * EvaluationSection — shared card body for §7.8 & §7.9
 * ============================================================
 * Renders the latest evaluation (or a clear "not yet evaluated"
 * placeholder) and exposes an Edit / Create button gated by the
 * current user's role within the project.
 */

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DetailedEvaluation, ProjectRole } from '@/types';
import EvaluationFormModal from './EvaluationFormModal';
import EvaluationCard from './EvaluationCard';

interface EvaluationSectionProps {
  kind: 'leader' | 'supervisor';
  projectId: string;
  memberId: string;
  memberName: string;
  currentUserRole: ProjectRole;
  evaluation: DetailedEvaluation | null;
  onUpdated?: (next: DetailedEvaluation) => void;
}

export default function EvaluationSection(props: EvaluationSectionProps) {
  const {
    kind,
    projectId,
    memberId,
    memberName,
    currentUserRole,
    evaluation,
    onUpdated,
  } = props;
  const { t } = useLanguage();

  const [editing, setEditing] = useState(false);

  const canSubmit =
    kind === 'leader'
      ? currentUserRole === 'LEADER'
      : currentUserRole === 'SUPERVISOR';

  const labels =
    kind === 'leader'
      ? {
          title: t('leader_evaluation'),
          desc: t('leader_evaluation_desc'),
          noData: t('no_leader_evaluation'),
          onlyRole: t('leader_evaluation_only_leader'),
          create: t('create_evaluation'),
          edit: t('edit_evaluation'),
          pending: t('leader_evaluation_pending'),
          submitted: t('leader_evaluation_submitted'),
        }
      : {
          title: t('supervisor_evaluation'),
          desc: t('supervisor_evaluation_desc'),
          noData: t('no_supervisor_evaluation'),
          onlyRole: t('supervisor_evaluation_only_supervisor'),
          create: t('create_evaluation'),
          edit: t('edit_evaluation'),
          pending: t('supervisor_evaluation_pending'),
          submitted: t('supervisor_evaluation_submitted'),
        };

  // Auto-close the form once a new evaluation is set.
  useEffect(() => {
    if (evaluation && editing) setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluation?.id]);

  return (
    <section
      aria-labelledby={`eval-section-${kind}`}
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`eval-section-${kind}`} className="text-sm font-semibold text-ink">
            {labels.title}
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">{labels.desc}</p>
        </div>
        {canSubmit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn-secondary btn-sm"
          >
            {evaluation ? labels.edit : labels.create}
          </button>
        )}
      </div>

      {evaluation ? (
        <EvaluationCard evaluation={evaluation} kind={kind} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-center">
          <p className="text-sm text-ink-muted">{labels.noData}</p>
          {!canSubmit && (
            <p className="mt-1 text-[11px] text-ink-muted/80">{labels.onlyRole}</p>
          )}
        </div>
      )}

      {editing && (
        <EvaluationFormModal
          kind={kind}
          projectId={projectId}
          memberId={memberId}
          memberName={memberName}
          initial={evaluation}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            onUpdated?.(next);
            setEditing(false);
          }}
        />
      )}
    </section>
  );
}