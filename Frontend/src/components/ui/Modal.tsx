import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  bodyScrollable?: boolean;
  panelOverflow?: 'hidden' | 'visible';
  panelClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  closeButtonClassName?: string;
  bodyClassName?: string;
  backdropClassName?: string;
}

const sizeClasses = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-4xl', xl: 'max-w-7xl' };

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  bodyScrollable = true,
  panelOverflow = 'hidden',
  panelClassName = '',
  headerClassName = '',
  titleClassName = '',
  closeButtonClassName = '',
  bodyClassName = '',
  backdropClassName = '',
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 backdrop-blur-sm transition-opacity ${backdropClassName}`}
        style={{ backgroundColor: 'rgba(31, 18, 3, 0.5)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`
          relative w-full max-h-[90vh] flex flex-col
          transition-all duration-200 ease-out
          ${sizeClasses[size]}
          ${panelOverflow === 'visible' ? 'overflow-visible' : 'overflow-hidden'}
          ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
          ${panelClassName}
        `}
        style={{
          backgroundColor: '#FFFDFB',
          borderRadius: '12px',
          border: '1px solid #E8C7AE',
          boxShadow: '0 30px 60px -20px rgba(38, 24, 16, 0.65)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 ${headerClassName}`}
          style={{ borderBottom: '1px solid #E8D8CF' }}
        >
          <h2
            id="modal-title"
            className={`text-lg font-semibold ${titleClassName}`}
            style={{ color: '#1F1F1F', letterSpacing: '-0.01em' }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`
              rounded-lg p-1.5
              focus:outline-none focus:ring-2 focus:ring-offset-2
              transition-colors duration-150
              ${closeButtonClassName}
            `}
            style={{ color: '#9a9087' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1f0ee')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,120,83,0.2)')}
            onBlur={e => (e.currentTarget.style.boxShadow = '')}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div
          className={`px-6 py-5 flex-1 ${bodyScrollable ? 'overflow-y-auto' : 'overflow-visible'} ${bodyClassName}`}
          style={{ color: '#635648' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
