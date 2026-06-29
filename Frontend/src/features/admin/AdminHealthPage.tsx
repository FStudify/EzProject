import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Loader2,
  Server,
  Timer,
  AlertTriangle,
  Activity as ActivityIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Send,
  Info,
} from 'lucide-react';
import {
  getAdminHealth,
  getAdminEmailStatus,
  sendAdminTestEmail,
  type AdminHealth,
  type AdminEmailStatus,
  type AdminEmailTestResult,
} from '@/api/admin.api';
import { useToast, Modal, Button } from '@/components/ui';
import AdminPageHeader from './components/AdminPageHeader';

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  return new Date(ts).toLocaleString('vi-VN');
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  Online: { bg: '#dcfce7', text: '#15803d', dot: '#10b981', label: 'Online' },
  Degraded: { bg: '#fef3c7', text: '#a16207', dot: '#f59e0b', label: 'Degraded' },
  Down: { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444', label: 'Down' },
};

export default function AdminHealthPage() {
  const { toast } = useToast();
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [emailStatus, setEmailStatus] = useState<AdminEmailStatus | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testResult, setTestResult] = useState<AdminEmailTestResult | null>(null);
  const [testSending, setTestSending] = useState(false);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const h = await getAdminHealth();
      setHealth(h);
    } catch {
      setError('Không thể tải trạng thái hệ thống');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
    const id = setInterval(() => void fetchHealth(), 60_000);
    return () => clearInterval(id);
  }, [fetchHealth]);

  const fetchEmailStatus = useCallback(async () => {
    setEmailLoading(true);
    try {
      const s = await getAdminEmailStatus();
      setEmailStatus(s);
    } catch {
      setEmailStatus(null);
    } finally {
      setEmailLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEmailStatus();
  }, [fetchEmailStatus]);

  const sendTest = async () => {
    if (!testTo) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await sendAdminTestEmail(testTo);
      setTestResult(res.data);
      toast(res.message, res.data.sent ? 'success' : 'error');
      void fetchEmailStatus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gửi email test thất bại';
      toast(msg, 'error');
    } finally {
      setTestSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#D97853' }} />
        <span className="ml-2" style={{ color: '#7D6F66' }}>Đang kiểm tra...</span>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="space-y-6 p-6">
        <AdminPageHeader title="Sức khỏe hệ thống" />
        <div className="rounded-2xl border bg-white p-12 text-center" style={{ borderColor: '#E8D8CF' }}>
          <XCircle className="mx-auto h-10 w-10 text-rose-400" />
          <p className="mt-3 text-slate-600">{error ?? 'Không có dữ liệu'}</p>
          <button
            type="button"
            onClick={() => void fetchHealth()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  const st = STATUS_STYLE[health.status];

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Sức khỏe hệ thống"
        description="Trạng thái kỹ thuật theo thời gian thực — tự động làm mới mỗi 60 giây."
        actions={
          <button
            type="button"
            onClick={() => void fetchHealth()}
            className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            style={{ borderColor: '#E8D8CF' }}
          >
            <RefreshCw className="h-4 w-4" /> Làm mới
          </button>
        }
      />

      {/* Status hero */}
      <div
        className="rounded-2xl border p-6"
        style={{ backgroundColor: st.bg, borderColor: '#E8D8CF' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
            >
              <span
                className="absolute inline-flex h-3 w-3 animate-ping rounded-full"
                style={{ backgroundColor: st.dot, opacity: 0.5 }}
              />
              <span
                className="relative inline-flex h-3 w-3 rounded-full"
                style={{ backgroundColor: st.dot }}
              />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: st.text }}>
                Trạng thái server
              </p>
              <p className="text-2xl font-bold" style={{ color: st.text }}>
                {st.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: st.text }}>
            <Clock className="h-3.5 w-3.5" />
            Cập nhật lúc {new Date(health.checkedAt).toLocaleTimeString('vi-VN')}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Timer}
          label="Response time trung bình"
          value={`${health.avgResponseMs.toFixed(0)} ms`}
          sub="Trong 24h gần nhất"
          accent="#3b82f6"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Lỗi 5xx (24h)"
          value={String(health.errorCount24h)}
          sub={health.errorCount24h > 0 ? 'Cần kiểm tra' : 'Bình thường'}
          accent={health.errorCount24h > 0 ? '#ef4444' : '#10b981'}
        />
        <MetricCard
          icon={ActivityIcon}
          label="Uptime 7 ngày"
          value={`${health.uptimePercent7d}%`}
          sub="Hoạt động liên tục"
          accent="#10b981"
        />
        <MetricCard
          icon={Server}
          label="MongoDB"
          value={health.dbConnected ? 'Connected' : 'Disconnected'}
          sub={health.mongoVersion ? `v${health.mongoVersion}` : 'Không khả dụng'}
          accent={health.dbConnected ? '#10b981' : '#ef4444'}
        />
      </div>

      {/* Email / SMTP diagnostics */}
      <EmailDiagnosticsCard
        status={emailStatus}
        loading={emailLoading}
        onRefresh={() => void fetchEmailStatus()}
        onSendTest={() => {
          setTestResult(null);
          setTestOpen(true);
        }}
      />

      {/* Recent errors */}
      <div className="rounded-2xl border bg-white" style={{ borderColor: '#E8D8CF' }}>
        <div className="border-b px-4 py-3" style={{ borderColor: '#E8D8CF' }}>
          <h3 className="text-sm font-semibold text-slate-800">Lỗi gần đây (24h)</h3>
          <p className="text-xs text-slate-500">
            Tổng cộng {health.errorCount24h} lỗi được phát hiện trong 24h qua
          </p>
        </div>
        {health.recentErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="mt-3 text-sm font-medium text-slate-700">Không có lỗi nào trong 24h qua.</p>
            <p className="text-xs text-slate-500">Hệ thống đang hoạt động ổn định.</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: '#F0E5DA' }}>
            {health.recentErrors.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">{e.message}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {e.actor ? `${e.actor.fullName} · ` : ''}
                    {timeAgo(e.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        isOpen={testOpen}
        onClose={() => setTestOpen(false)}
        title="Gửi email test"
        size="md"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Gửi 1 email mẫu để kiểm tra pipeline SMTP còn hoạt động không. Email
            sẽ tới hộp thư chính (kèm Spam/Promotions).
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-700">Gửi tới email</label>
            <input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm focus:outline-none"
              style={{ borderColor: '#E8D8CF' }}
            />
          </div>

          {testResult && (
            <div
              className="rounded-lg border p-3 text-xs space-y-1"
              style={{
                backgroundColor: testResult.sent ? '#f0fdf4' : '#fef2f2',
                borderColor: testResult.sent ? '#bbf7d0' : '#fecaca',
                color: testResult.sent ? '#166534' : '#991b1b',
              }}
            >
              <p>
                <strong>{testResult.sent ? '✓ Gửi thành công' : '✗ Gửi thất bại'}</strong>
                {testResult.reason && <> — {testResult.reason}</>}
                {testResult.error && <> ({testResult.error})</>}
              </p>
              {testResult.messageId && (
                <p className="break-all opacity-80">messageId: {testResult.messageId}</p>
              )}
              {testResult.inviteUrl && (
                <p className="break-all">Link mời: {testResult.inviteUrl}</p>
              )}
              {testResult.diagnosticNote && <p className="pt-1 italic">{testResult.diagnosticNote}</p>}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-3" style={{ borderColor: '#E8D8CF' }}>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" onClick={sendTest} disabled={!testTo || testSending}>
              {testSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1.5 h-4 w-4" />Gửi test</>}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EmailDiagnosticsCard({
  status,
  loading,
  onRefresh,
  onSendTest,
}: {
  status: AdminEmailStatus | null;
  loading: boolean;
  onRefresh: () => void;
  onSendTest: () => void;
}) {
  if (loading && !status) {
    return (
      <div className="flex items-center justify-center rounded-2xl border bg-white p-6" style={{ borderColor: '#E8D8CF' }}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#D97853' }} />
        <span className="ml-2 text-sm text-slate-600">Đang kiểm tra SMTP...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#E8D8CF' }}>
        <p className="text-sm text-rose-600">Không tải được trạng thái SMTP.</p>
      </div>
    );
  }

  const verifyOk = status.verify?.ok === true;
  const configured = status.envPresent && status.nodemailerInstalled;
  const issues =
    status.hints && status.hints.length > 0
      ? status.hints
      : configured && verifyOk
        ? ['Mọi thứ ổn. Vẫn chưa thấy email? Kiểm tra Spam, Promotions, và các filter khác.']
        : [];

  return (
    <div className="rounded-2xl border bg-white" style={{ borderColor: '#E8D8CF' }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: '#E8D8CF' }}>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" style={{ color: '#D97853' }} />
          <h3 className="text-sm font-semibold text-slate-800">Email / SMTP</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            style={{ borderColor: '#E8D8CF' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button
            type="button"
            onClick={onSendTest}
            className="inline-flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            style={{ borderColor: '#E8D8CF' }}
          >
            <Send className="h-3.5 w-3.5" /> Gửi mail test
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-3">
        <KV label="Host" value={status.host || '—'} />
        <KV label="Port" value={status.port ? `${status.port} (${status.secureByPort ? 'implicit TLS' : 'STARTTLS'})` : '—'} />
        <KV label="Tài khoản" value={status.user || '—'} />
        <KV label="From (raw)" value={status.fromRaw || '—'} mono />
        <KV label="nodemailer" value={status.nodemailerInstalled ? 'Đã cài' : 'Thiếu'} />
        <KV
          label="SMTP verify"
          value={
            status.verify
              ? verifyOk
                ? '✓ OK'
                : '✗ Lỗi'
              : '—'
          }
          tone={status.verify ? (verifyOk ? 'ok' : 'error') : undefined}
        />
      </div>

      {status.verify && !verifyOk && (status.verify.error || status.verify.reason) && (
        <div className="mx-4 mb-3 rounded-lg border bg-rose-50 px-3 py-2 text-xs text-rose-700" style={{ borderColor: '#fecaca' }}>
          <strong>Lỗi SMTP:</strong> {status.verify.reason ? `${status.verify.reason}: ` : ''}
          {status.verify.error || '(không rõ)'}
        </div>
      )}

      {status.missing && status.missing.length > 0 && (
        <div className="mx-4 mb-3 rounded-lg border bg-amber-50 px-3 py-2 text-xs text-amber-700" style={{ borderColor: '#fde68a' }}>
          <strong>Thiếu biến môi trường:</strong> {status.missing.join(', ')}
        </div>
      )}

      <div className="mx-4 mb-4 rounded-lg border bg-slate-50 px-3 py-2 text-xs text-slate-700" style={{ borderColor: '#E8D8CF' }}>
        <div className="mb-1 flex items-center gap-1 font-semibold text-slate-800">
          <Info className="h-3.5 w-3.5" /> Gợi ý
        </div>
        <ul className="list-disc space-y-1 pl-5">
          {issues.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KV({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'ok' | 'error';
}) {
  const valColor = tone === 'ok' ? '#15803d' : tone === 'error' ? '#b91c1c' : '#1f2937';
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-0.5 truncate text-sm ${mono ? 'font-mono' : 'font-medium'}`}
        style={{ color: valColor }}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#E8D8CF' }}>
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${accent}1f`, color: accent }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800">{value}</p>
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
    </div>
  );
}