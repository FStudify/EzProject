/**
 * PerformanceRulesModal — Hiển thị quy tắc chấm điểm hiệu suất của hệ thống.
 *
 * Nguồn dữ liệu:
 *   - Ngưỡng điểm -> trạng thái: `scoreToStatusVariant` (utils.ts)
 *     >=85 = Xuất sắc, >=70 = Tốt, >=50 = Trung bình, <50 = Cần cải thiện.
 *   - Trọng số cơ cấu đóng góp: 4 danh mục từ `computeBreakdown` (utils.ts)
 *     gồm Hoàn thành công việc, Tài liệu, Bình luận, Cuộc họp.
 *   - Tiêu chí Leader/Supervisor: 5 tiêu chí chấm điểm 0-20, tổng 100.
 *
 * Mục đích: để user biết hệ thống tính điểm như thế nào — không cần đoán.
 */
import { Calculator, ScrollText, TrendingUp, CheckCircle, AlertCircle, Award, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from '@/components/ui';

interface PerformanceRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PerformanceRulesModal({ isOpen, onClose }: PerformanceRulesModalProps) {
  const { t } = useLanguage();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('performance_rules_title')} size="lg" bodyScrollable>
      <div className="space-y-5 text-sm text-ink">
        <p className="text-ink-muted">{t('performance_rules_intro')}</p>

        {/* 0. Auto-grading rules (system) — chi tiết */}
        <section className="rounded-xl border border-border bg-canvas p-4">
          <header className="mb-3 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-ink">{t('performance_rules_auto_title')}</h3>
          </header>
          <p className="mb-3 text-xs text-ink-muted">{t('performance_rules_auto_desc')}</p>

          {/* Khối công thức chính */}
          <FormulaBlock formula={t('performance_rules_auto_formula')} />

          <p className="mt-2 inline-flex items-start gap-1.5 text-[11px] text-ink-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t('performance_rules_auto_capped')}</span>
          </p>

          <p className="mt-2 text-[11px] text-ink-muted">{t('performance_rules_auto_note')}</p>

          {/* Bảng giải thích từng hệ số */}
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t('performance_rules_auto_weights_title')}
            </h4>
            <ul className="space-y-2">
              <WeightRow
                chip="× 8"
                chipClass="bg-primary/10 text-primary"
                title={t('performance_rules_auto_weight_done_title')}
                desc={t('performance_rules_auto_weight_done_desc')}
              />
              <WeightRow
                chip="× 5"
                chipClass="bg-[#FB923C]/10 text-[#FB923C]"
                title={t('performance_rules_auto_weight_doc_title')}
                desc={t('performance_rules_auto_weight_doc_desc')}
              />
              <WeightRow
                chip="× 3"
                chipClass="bg-warning/10 text-warning"
                title={t('performance_rules_auto_weight_progress_title')}
                desc={t('performance_rules_auto_weight_progress_desc')}
              />
              <WeightRow
                chip="× 2"
                chipClass="bg-success/10 text-success"
                title={t('performance_rules_auto_weight_comments_title')}
                desc={t('performance_rules_auto_weight_comments_desc')}
              />
            </ul>
          </div>

          {/* Ví dụ minh hoạ */}
          <div className="mt-4 rounded-lg border border-dashed border-border bg-surface px-3 py-2">
            <h4 className="mb-1 text-xs font-semibold text-ink">
              {t('performance_rules_auto_example_title')}
            </h4>
            <p className="text-[11px] leading-relaxed text-ink-muted">
              {t('performance_rules_auto_example_intro')}
            </p>
          </div>

          {/* Phạm vi */}
          <div className="mt-3">
            <h4 className="mb-1 text-xs font-semibold text-ink">
              {t('performance_rules_auto_scope_title')}
            </h4>
            <p className="text-[11px] leading-relaxed text-ink-muted">
              {t('performance_rules_auto_scope_desc')}
            </p>
          </div>
        </section>

        {/* 1. Score status thresholds */}
        <section className="rounded-xl border border-border bg-canvas p-4">
          <header className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-ink">{t('performance_rules_score_title')}</h3>
          </header>
          <p className="mb-3 text-xs text-ink-muted">{t('performance_rules_score_desc')}</p>
          <ul className="space-y-2">
            <RuleRow variant="success" tone="excellent" range=">= 85" label={t('status_excellent')} />
            <RuleRow variant="success" tone="good" range="70 – 84" label={t('status_good')} />
            <RuleRow variant="warning" tone="average" range="50 – 69" label={t('status_average')} />
            <RuleRow variant="danger" tone="needsImprovement" range="< 50" label={t('status_needs_improvement')} />
          </ul>
        </section>

        {/* 2. Contribution breakdown weights */}
        <section className="rounded-xl border border-border bg-canvas p-4">
          <header className="mb-3 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-ink">{t('performance_rules_breakdown_title')}</h3>
          </header>
          <p className="mb-3 text-xs text-ink-muted">{t('performance_rules_breakdown_desc')}</p>
          <ul className="space-y-2">
            <BreakdownRow label={t('cat_tasks_completion')} note={t('performance_rules_breakdown_tasks')} />
            <BreakdownRow label={t('cat_documents')} note={t('performance_rules_breakdown_documents')} />
            <BreakdownRow label={t('cat_comments')} note={t('performance_rules_breakdown_comments')} />
            <BreakdownRow label={t('cat_meetings')} note={t('performance_rules_breakdown_meetings')} />
          </ul>
        </section>

        {/* 3. Leader / Supervisor evaluation criteria */}
        <section className="rounded-xl border border-border bg-canvas p-4">
          <header className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-ink">{t('performance_rules_evaluation_title')}</h3>
          </header>
          <p className="mb-3 text-xs text-ink-muted">{t('performance_rules_evaluation_desc')}</p>
          <ul className="space-y-1.5">
            <CriteriaRow label={t('criteria_responsibility')} />
            <CriteriaRow label={t('criteria_communication')} />
            <CriteriaRow label={t('criteria_initiative')} />
            <CriteriaRow label={t('criteria_teamwork')} />
            <CriteriaRow label={t('criteria_quality_of_work')} />
          </ul>
          <p className="mt-3 text-[11px] text-ink-muted">{t('performance_rules_evaluation_note')}</p>
        </section>

        <p className="text-xs italic text-ink-muted">{t('performance_rules_footer')}</p>
      </div>
    </Modal>
  );
}

function FormulaBlock({ formula }: { formula: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-surface px-3 py-2 text-[12px] leading-relaxed text-ink">
      <code className="font-mono">{formula}</code>
    </pre>
  );
}

function WeightRow({
  chip,
  chipClass,
  title,
  desc,
}: {
  chip: string;
  chipClass: string;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <span
        className={`inline-flex h-7 min-w-[44px] items-center justify-center rounded-md px-2 text-xs font-semibold tabular-nums ${chipClass}`}
      >
        {chip}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{desc}</p>
      </div>
    </li>
  );
}

function RuleRow({
  variant,
  range,
  label,
}: {
  variant: 'success' | 'warning' | 'danger';
  tone: 'excellent' | 'good' | 'average' | 'needsImprovement';
  range: string;
  label: string;
}) {
  // Tailwind purge-safe: full class strings, not template interpolation.
  const variantClass =
    variant === 'success'
      ? 'bg-success/10 text-success'
      : variant === 'warning'
      ? 'bg-warning/10 text-warning'
      : 'bg-danger/10 text-danger';
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <span className={`inline-flex h-7 min-w-[64px] items-center justify-center rounded-md px-2 text-xs font-semibold tabular-nums ${variantClass}`}>
        {range}
      </span>
      <span className="text-sm text-ink">{label}</span>
    </li>
  );
}

function BreakdownRow({ label, note }: { label: string; note: string }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-[11px] text-ink-muted">{note}</p>
      </div>
    </li>
  );
}

function CriteriaRow({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-surface">
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      <span className="text-sm text-ink">{label}</span>
    </li>
  );
}
