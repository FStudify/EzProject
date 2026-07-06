import { useNavigate } from 'react-router-dom';

interface MentionTextProps {
  userId: string;
  name: string;
}

export default function MentionText({ userId, name }: MentionTextProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/app/profile/${userId}`);
  };

  // Highlight tag in a clear blue chip — readable on both light and dark bubbles.
  const palette = 'bg-white/90 text-blue-600 hover:bg-white border border-blue-200/50 shadow-sm';

  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-sm font-semibold transition-colors ${palette}`}
    >
      {name}
    </span>
  );
}
