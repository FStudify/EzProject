import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Loader2, Mail, AlertCircle, CheckCircle2, LogIn, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { getInviteByToken, type InviteTokenDetails } from '@/api/member.api';

type Phase = 'loading' | 'ready' | 'error';

export default function InviteLandingPage() {
  const { token = '' } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [details, setDetails] = useState<InviteTokenDetails | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setPhase('error');
      return;
    }

    getInviteByToken(token)
      .then((invite) => {
        setDetails(invite);
        setPhase('ready');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Invalid or expired invitation');
        setPhase('error');
      });
  }, [token]);

  const handleAccept = () => {
    if (!user) {
      // User chưa đăng nhập → đăng nhập (sẽ tự redirect về accept)
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }
    // User đã đăng nhập → gọi accept rồi vào project
    navigate(`/app/join/${token}`);
  };

  const handleSignup = () => {
    // User chưa có account → đăng ký với email prefilled
    const email = details?.email ?? '';
    navigate(`/register?email=${encodeURIComponent(email)}&invite=${token}`);
  };

  if (phase === 'loading' || authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF8F3] to-[#F0EDE8]">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#D97853' }} />
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF8F3] to-[#F0EDE8] px-4">
        <section className="w-full max-w-md rounded-2xl p-8 text-center shadow-xl" style={{ backgroundColor: '#FFFDFB', border: '1px solid #E8D8CF' }}>
          <AlertCircle className="mx-auto h-12 w-12" style={{ color: '#EF4444' }} />
          <h1 className="mt-4 text-xl font-bold" style={{ color: '#1F1F1F' }}>Invalid invitation</h1>
          <p className="mt-2 text-sm" style={{ color: '#7D6F66' }}>{error}</p>
          <Link to="/" className="mt-6 inline-block text-sm font-medium" style={{ color: '#D97853' }}>
            Go to homepage
          </Link>
        </section>
      </main>
    );
  }

  const projectName = details?.project?.name ?? 'a project';
  const inviter = details?.invitedBy?.fullName ?? 'A teammate';
  const expiresAt = details?.expiresAt ? new Date(details.expiresAt) : null;
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF8F3] to-[#F0EDE8] px-4 py-8">
      <section className="w-full max-w-md rounded-2xl p-8 shadow-xl" style={{ backgroundColor: '#FFFDFB', border: '1px solid #E8D8CF' }}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: '#FFF5EC' }}>
            <Users className="h-6 w-6" style={{ color: '#D97853' }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9a9086' }}>EzProject</p>
            <h1 className="text-lg font-bold" style={{ color: '#1F1F1F' }}>Project invitation</h1>
          </div>
        </div>

        <div className="mb-6 rounded-xl p-5" style={{ backgroundColor: '#FFF8F3', border: '1px solid #F0E0D2' }}>
          <p className="text-sm" style={{ color: '#7D6F66' }}>You have been invited to join</p>
          <h2 className="mt-1 text-2xl font-bold" style={{ color: '#1F1F1F' }}>{projectName}</h2>
          <p className="mt-3 text-sm" style={{ color: '#7D6F66' }}>
            Invited by <strong style={{ color: '#1F1F1F' }}>{inviter}</strong>
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: '#9a9086' }}>
            <Mail className="h-3.5 w-3.5" />
            <span>{details?.email}</span>
          </div>
          {daysLeft > 0 && (
            <p className="mt-1 text-xs" style={{ color: '#9a9086' }}>
              Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
            </p>
          )}
        </div>

        {user ? (
          <Button
            variant="primary"
            size="lg"
            onClick={handleAccept}
            className="w-full"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Accept and join project
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm" style={{ color: '#7D6F66' }}>
              Already have an account?
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={handleAccept}
              className="w-full"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Log in and join
            </Button>

            <div className="relative my-4 flex items-center">
              <div className="flex-1 border-t" style={{ borderColor: '#E8D8CF' }} />
              <span className="px-3 text-xs" style={{ color: '#9a9086' }}>OR</span>
              <div className="flex-1 border-t" style={{ borderColor: '#E8D8CF' }} />
            </div>

            <Button
              variant="secondary"
              size="lg"
              onClick={handleSignup}
              className="w-full"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create account and join
            </Button>
            <p className="text-center text-xs" style={{ color: '#9a9086' }}>
              Sign up with <strong>{details?.email}</strong> to be added to the project automatically.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-xs" style={{ color: '#9a9086' }}>
          By accepting, you agree to join this project on EzProject.
        </p>
      </section>
    </main>
  );
}
