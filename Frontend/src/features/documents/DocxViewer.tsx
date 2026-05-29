import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { renderAsync } from 'docx-preview';

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.25;

interface DocxViewerProps {
  fileUrl?: string;
  fileBlob?: Blob;
  className?: string;
}

export default function DocxViewer({ fileUrl, fileBlob, className = '' }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1); // default zoom = 100%
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const currentUrl = fileUrl;
    const currentBlob = fileBlob;
    const el = containerRef.current;
    if (!el) return;

    setStatus('loading');
    setErrorMsg('');
    el.innerHTML = '';

    let active = true;

    const run = async () => {
      try {
        let buf: ArrayBuffer;
        if (currentBlob) {
          buf = await currentBlob.arrayBuffer();
        } else if (currentUrl) {
          const res = await fetch(currentUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          buf = await res.arrayBuffer();
        } else {
          throw new Error('No file provided');
        }
        if (!active) return;

        // Render docx — let it size itself naturally
        await renderAsync(buf, el, undefined, {
          className: 'docx-viewer',
          inWrapper: true,
          ignoreWidth: true,
          ignoreHeight: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: false,
          renderChanges: false,
          renderHeaders: true,
          renderFooters: true,
        });
        if (active) setStatus('done');
      } catch (e: unknown) {
        if (active) {
          setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
          setStatus('error');
        }
      }
    };

    run();
    return () => { active = false; };
  }, [fileUrl, fileBlob]);

  // Apply zoom CSS after rendering
  useEffect(() => {
    if (status !== 'done' || !containerRef.current) return;
    const root = containerRef.current;
    root.style.zoom = `${scale * 100}%`;
  }, [status, scale]);

  const handleFitToWidth = () => {
    if (!scrollRef.current) return;
    // Measure actual rendered page width
    const page = scrollRef.current.querySelector<HTMLElement>('.docx-page');
    if (page) {
      setScale(scrollRef.current.clientWidth / page.offsetWidth);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-2 shrink-0">
        <span className="text-xs text-ink-muted">DOCX Viewer</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(ZOOM_MIN, s - ZOOM_STEP))}
            disabled={scale <= ZOOM_MIN}
            className="rounded p-1.5 text-ink-muted hover:bg-slate-100 disabled:opacity-30"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-xs font-medium text-ink">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP))}
            disabled={scale >= ZOOM_MAX}
            className="rounded p-1.5 text-ink-muted hover:bg-slate-100 disabled:opacity-30"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleFitToWidth}
            className="rounded p-1.5 text-ink-muted hover:bg-slate-100"
            title="Fit to width"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scroll area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
      >
        {status === 'loading' && (
          <div className="flex items-center justify-center p-12 text-sm text-ink-muted">
            Đang tải tài liệu...
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center justify-center p-12 text-sm text-red-600">
            Lỗi: {errorMsg}
          </div>
        )}
        <div ref={containerRef} className="p-6" />
      </div>
    </div>
  );
}
