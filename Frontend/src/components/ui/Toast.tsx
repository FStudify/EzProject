import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

type ToastVariant = 'success' | 'warning' | 'error';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, { bar: string; icon: typeof CheckCircle2 }> = {
  success: { bar: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2 },
  warning: { bar: 'border-amber-200 bg-amber-50 text-amber-900', icon: AlertTriangle },
  error: { bar: 'border-rose-200 bg-rose-50 text-rose-900', icon: XCircle },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = (id: string) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
      >
        {items.map((item) => {
          const { bar, icon: Icon } = variantStyles[item.variant];
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${bar}`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p className="flex-1 text-sm font-medium">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-0.5 opacity-70 hover:opacity-100"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
