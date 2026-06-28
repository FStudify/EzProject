import type { Document } from '@/types';

interface DocumentContentAreaProps {
  document: Document | null;
  fileBlob?: Blob | null;
  className?: string;
}

export default function DocumentContentArea({
  document: doc,
  className = '',
}: DocumentContentAreaProps) {
  if (!doc) {
    return (
      <div className={`flex flex-1 items-center justify-center ${className}`}>
        <p className="text-sm text-ink-muted">Select a document to view</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-1 items-center justify-center ${className}`}>
      <div className="text-center">
        <p className="text-sm font-medium text-ink">{doc.title}</p>
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-primary hover:underline"
        >
          Open in new tab →
        </a>
      </div>
    </div>
  );
}
