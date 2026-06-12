import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  acceptInviteByToken,
  getInviteByToken,
  type InviteTokenDetails,
} from '@/api/member.api';

type Phase = 'checking' | 'ready' | 'accepting' | 'error';

export default function JoinProjectPage() {
  const { token = '' } = useParams();
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [phase, setPhase] = useState<Phase>('checking');
  const [details, setDetails] = useState<InviteTokenDetails | null>(null);
  const [error, setError] = useState('');
  const validationStarted = useRef(false);
  const acceptanceStarted = useRef(false);

  useEffect(() => {
    if (validationStarted.current) return;
    validationStarted.current = true;

    if (!token) {
      setError(t('invite_invalid'));
      setPhase('error');
      return;
    }

    getInviteByToken(token)
      .then((invite) => {
        setDetails(invite);
        setPhase('ready');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t('invite_invalid'));
        setPhase('error');
      });
  }, [t, token]);

  useEffect(() => {
    if (phase !== 'ready' || !details || isLoading) return;

    if (!user) {
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    if (acceptanceStarted.current) return;
    acceptanceStarted.current = true;
    setPhase('accepting');

    acceptInviteByToken(token)
      .then((result) => {
        navigate(`/app/projects/${result.projectId}`, { replace: true });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t('invite_invalid'));
        setPhase('error');
      });
  }, [details, isLoading, location, navigate, phase, t, token, user]);

  const loading = phase === 'checking' || phase === 'accepting' || isLoading;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">EZProject</h1>
            {details?.project?.name && (
              <p className="text-sm text-text-secondary">{details.project.name}</p>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 py-5 text-sm text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>{phase === 'accepting' ? t('invite_accepting') : t('invite_checking')}</span>
          </div>
        )}

        {phase === 'ready' && !isLoading && !user && (
          <div className="flex items-center gap-3 py-5 text-sm text-text-secondary">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span>{t('invite_login_required')}</span>
          </div>
        )}

        {phase === 'error' && (
          <div>
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error || t('invite_invalid')}</span>
            </div>
            <Button className="w-full" variant="secondary" onClick={() => navigate('/app')}>
              {t('invite_back_home')}
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
