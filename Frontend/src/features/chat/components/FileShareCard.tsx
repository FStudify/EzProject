import { FileText, Download } from 'lucide-react';

interface FileShareCardProps {
  url: string;
  name: string;
  size: string;
  uploader: string;
}

export default function FileShareCard({ url, name, size, uploader }: FileShareCardProps) {
  return (
    <div className="my-2 flex max-w-sm items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:bg-slate-50 transition-colors">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-slate-900">{name}</span>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{size}</span>
          <span>•</span>
          <span className="truncate">{uploader}</span>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
        title="Download/Open File"
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
}
