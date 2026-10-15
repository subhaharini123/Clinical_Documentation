import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  onRetry?: () => void;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  showError: (title: string, message?: string, onRetry?: () => void) => void;
  showSuccess: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, onRetry, duration = 5000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message, onRetry, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0 && !onRetry) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const showError = useCallback(
    (title: string, message?: string, onRetry?: () => void) => {
      addToast({ type: 'error', title, message, onRetry, duration: onRetry ? 12000 : 6000 });
    },
    [addToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'success', title, message, duration: 4000 });
    },
    [addToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'warning', title, message, duration: 5000 });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'info', title, message, duration: 4500 });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showError, showSuccess, showWarning, showInfo }}>
      {children}
      {/* Toast container floating bottom right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm transition-all animate-in slide-in-from-bottom-2 duration-200',
              toast.type === 'error' && 'bg-red-50/95 border-red-200 text-red-900',
              toast.type === 'success' && 'bg-emerald-50/95 border-emerald-200 text-emerald-900',
              toast.type === 'warning' && 'bg-amber-50/95 border-amber-200 text-amber-900',
              toast.type === 'info' && 'bg-slate-900/95 text-white border-slate-800'
            )}
          >
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-xs tracking-wide uppercase opacity-90">{toast.title}</h5>
              {toast.message && <p className="text-xs mt-0.5 leading-relaxed opacity-85">{toast.message}</p>}

              {toast.onRetry && (
                <button
                  onClick={() => {
                    toast.onRetry?.();
                    removeToast(toast.id);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Retry operation
                </button>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-50 hover:opacity-100 p-0.5 rounded cursor-pointer transition-opacity"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
