import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.25;

interface PdfViewerProps {
  fileUrl?: string;
  fileBlob?: Blob;
  className?: string;
}

export default function PdfViewer({ fileUrl, fileBlob, className = '' }: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Load PDF
  useEffect(() => {
    const currentUrl = fileUrl;
    const currentBlob = fileBlob;

    if (!currentUrl && !currentBlob) {
      setStatus('error');
      setErrorMsg('Chưa có tệp để hiển thị');
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    setStatus('loading');
    setErrorMsg('');
    setNumPages(0);

    const load = async () => {
      try {
        let url: string;
        if (currentBlob) {
          objectUrl = URL.createObjectURL(currentBlob);
          url = objectUrl;
        } else {
          url = currentUrl!;
        }

        const pdf = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled) { pdf.destroy(); return; }
        setNumPages(pdf.numPages);
        setStatus('done');
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : 'Không thể tải tệp PDF');
          setStatus('error');
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl, fileBlob]);

  // Render pages
  useEffect(() => {
    if (status !== 'done' || !scrollRef.current) return;

    const el = scrollRef.current;
    let active = true;
    let currentPdf: pdfjsLib.PDFDocumentProxy | null = null;
    el.innerHTML = '';

    const load = async () => {
      try {
        const currentUrl = fileUrl;
        const currentBlob = fileBlob;
        let url: string;
        if (currentBlob) {
          url = URL.createObjectURL(currentBlob);
        } else {
          url = currentUrl!;
        }
        currentPdf = await pdfjsLib.getDocument({ url }).promise;
        if (!active) { currentPdf.destroy(); return; }

        const containerW = el.clientWidth - 48;
        const baseScale = scale * Math.max(0.5, Math.min(1.5, containerW / 612));
        const dpr = Math.max(1, window.devicePixelRatio || 1);

        for (let i = 1; i <= currentPdf.numPages; i++) {
          if (!active) break;
          const page = await currentPdf.getPage(i);
          const vp = page.getViewport({ scale: baseScale * dpr });

          const canvas = document.createElement('canvas');
          canvas.width = Math.round(vp.width);
          canvas.height = Math.round(vp.height);
          const ctx = canvas.getContext('2d')!;

          const displayScale = Math.max(0.1, containerW / vp.width);
          canvas.style.width = `${Math.round(vp.width * displayScale)}px`;
          canvas.style.height = `${Math.round(vp.height * displayScale)}px`;
          canvas.style.display = 'block';
          canvas.style.margin = '0 auto 12px';
          canvas.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
          canvas.style.background = 'white';

          await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;

          const wrapper = document.createElement('div');
          wrapper.style.cssText = 'display:flex;justify-content:center;';
          wrapper.appendChild(canvas);
          el.appendChild(wrapper);
        }
      } catch {
        // ignore render errors
      } finally {
        if (currentPdf) currentPdf.destroy();
      }
    };

    load();
    return () => { active = false; currentPdf?.destroy(); };
  }, [status, fileUrl, fileBlob, scale, numPages]);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-1 rounded-t-xl border border-border bg-surface px-3 py-1.5">
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(ZOOM_MIN, s - ZOOM_STEP))}
          disabled={scale <= ZOOM_MIN}
          className="rounded p-1.5 text-ink-muted hover:bg-surface-muted disabled:opacity-30"
          title="Thu nhỏ"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[3rem] text-center text-xs font-medium text-ink">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP))}
          disabled={scale >= ZOOM_MAX}
          className="rounded p-1.5 text-ink-muted hover:bg-surface-muted disabled:opacity-30"
          title="Phóng to"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setScale(1)}
          className="rounded p-1.5 text-ink-muted hover:bg-surface-muted"
          title="Đặt lại"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        {numPages > 0 && (
          <span className="ml-2 text-xs text-ink-muted">{numPages} trang</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto rounded-b-xl border border-t-0 border-border bg-slate-50">
        {status === 'loading' && (
          <div className="flex items-center justify-center p-12 text-sm text-ink-muted">
            Đang tải PDF...
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center justify-center p-12 text-sm text-red-600">
            Lỗi: {errorMsg}
          </div>
        )}
        <div ref={scrollRef} className="p-4" />
      </div>
    </div>
  );
}
