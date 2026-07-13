import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Home, AlertTriangle, RefreshCcw } from 'lucide-react';

export default function ErrorBoundary() {
  const error = useRouteError();
  const { lang } = useLanguage();

  let is404 = false;
  let errorMessage = lang === 'en' ? 'Unexpected Application Error!' : 'Đã có lỗi hệ thống xảy ra!';
  let errorDetails = '';

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      is404 = true;
      errorMessage = lang === 'en' ? 'Page Not Found' : 'Không tìm thấy trang';
      errorDetails = lang === 'en' 
        ? "The page you are looking for doesn't exist or has been moved."
        : "Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển.";
    } else {
      errorMessage = `${error.status} ${error.statusText}`;
      if (error.data) {
        errorDetails = typeof error.data === 'string' ? error.data : JSON.stringify(error.data);
      }
    }
  } else if (error instanceof Error) {
    errorDetails = error.message;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/40 dark:bg-slate-800 dark:shadow-none">
        {is404 ? (
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <span className="text-4xl font-extrabold text-orange-600 dark:text-orange-400">404</span>
          </div>
        ) : (
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
            <AlertTriangle className="h-10 w-10 text-rose-600 dark:text-rose-400" />
          </div>
        )}
        
        <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
          {errorMessage}
        </h1>
        
        {errorDetails && (
          <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
            {errorDetails}
          </p>
        )}
        
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCcw className="h-4 w-4" />
            {lang === 'en' ? 'Try Again' : 'Thử lại'}
          </button>
          <Link
            to="/app"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-primary/30"
          >
            <Home className="h-4 w-4" />
            {lang === 'en' ? 'Back to Home' : 'Về trang chủ'}
          </Link>
        </div>
      </div>
    </div>
  );
}
