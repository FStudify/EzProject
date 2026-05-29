import type { Document } from '@/types';
import PdfViewer from './PdfViewer';
import DocxViewer from './DocxViewer';

interface DocumentContentAreaProps {
  document: Document | null;
  fileBlob?: Blob | null;
  className?: string;
}

export default function DocumentContentArea({
  document: doc,
  fileBlob,
  className = '',
}: DocumentContentAreaProps) {
  if (!doc) {
    return (
      <div className={`flex flex-1 items-center justify-center ${className}`}>
        <p className="text-sm text-ink-muted">Chọn một tài liệu để xem</p>
      </div>
    );
  }

  if (doc.fileType === 'DOC') {
    return (
      <div className={`flex flex-1 min-h-0 ${className}`}>
        <DocxViewer
          fileUrl={doc.fileUrl ?? undefined}
          fileBlob={fileBlob ?? undefined}
          className="flex-1"
        />
      </div>
    );
  }

  if (doc.fileType === 'PDF') {
    return (
      <div className={`flex flex-1 min-h-0 ${className}`}>
        <PdfViewer
          fileUrl={doc.fileUrl ?? undefined}
          fileBlob={fileBlob ?? undefined}
          className="flex-1"
        />
      </div>
    );
  }

  if (doc.fileType === 'IMG') {
    const src = fileBlob ? URL.createObjectURL(fileBlob) : (doc.fileUrl ?? null);
    return (
      <div className={`flex flex-1 items-center justify-center overflow-auto p-6 ${className}`}>
        {src ? (
          <img src={src} alt={doc.name} className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-sm text-ink-muted">Không có file</p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-1 items-center justify-center ${className}`}>
      <p className="text-sm text-ink-muted">Định dạng không hỗ trợ xem trước.</p>
    </div>
  );
}
