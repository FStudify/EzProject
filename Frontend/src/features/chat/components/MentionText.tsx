import { useNavigate } from 'react-router-dom';

interface MentionTextProps {
  userId: string;
  name: string;
  /** Light mode = on a light bubble (own message); dark = on a dark bubble. */
  variant?: 'light' | 'dark';
}

export default function MentionText({ userId, name, variant = 'light' }: MentionTextProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/app/profile/${userId}`);
  };

  // Highlight tag in a clear blue chip — readable on both light and dark bubbles.
  const palette =
    variant === 'dark'
      ? 'bg-blue-400/25 text-blue-50 hover:bg-blue-400/40 border border-blue-300/40'
      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200';

  return (
    <span
      onClick={handleClick}
      className={`inline-flex cursor-pointer items-center rounded-md px-1.5 py-0.5 text-sm font-semibold transition-colors ${palette}`}
      title="Xem hồ sơ"
    >
      @{name}
    </span>
  );
}