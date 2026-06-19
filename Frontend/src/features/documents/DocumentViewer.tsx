import type { Document, DocumentComment, DocumentAuditEntry } from '@/types';
import { useState } from 'react';
import { Modal, Button, Badge } from '@/components/ui';
import DocumentContentArea from './DocumentContentArea';
import { Send, ExternalLink } from 'lucide-react';

interface DocumentViewerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  /** For uploaded files: pass the blob directly */
  fileBlob?: Blob | null;
  comments: DocumentComment[];
  auditLog: DocumentAuditEntry[];
  onAddComment: (docId: string, content: string) => void;
}

export default function DocumentViewer({
  document: doc,
  isOpen,
  onClose,
  comments,
  auditLog,
  onAddComment,
}: DocumentViewerProps) {
  const [newComment, setNewComment] = useState('');

  if (!doc) return null;

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    onAddComment(doc.id, newComment.trim());
    setNewComment('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={doc.title} size="xl" panelClassName="max-w-[1120px]">
      <div className="grid min-h-[62vh] gap-6 lg:grid-cols-[1.7fr_0.9fr]">
        <div className="flex min-h-[62vh] flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-base font-semibold text-slate-900">{doc.title}</p>
          {doc.description && (
            <p className="max-w-md text-center text-sm text-slate-600">{doc.description}</p>
          )}
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            <ExternalLink className="h-4 w-4" />
            Open document
          </a>
          <DocumentContentArea document={doc} className="hidden" />
        </div>

        <div className="flex min-h-[62vh] flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Audit log</p>
                <p className="text-xs text-slate-500">All document changes are recorded.</p>
              </div>
              <Badge variant="info">{auditLog.length} entries</Badge>
            </div>
            <div className="space-y-3 overflow-auto text-sm text-slate-700">
              {auditLog.length === 0 ? (
                <p className="text-slate-400">No activity yet.</p>
              ) : (
                auditLog.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2 text-[13px] text-slate-600">
                      <span>{entry.action}</span>
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-800">
                      <span className="font-medium">{entry.user.name}</span>
                      <span className="text-slate-500">{entry.user.role}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Comments</p>
                <p className="text-xs text-slate-500">Internal discussion per document.</p>
              </div>
              <span className="text-xs text-slate-400">{comments.length} comment(s)</span>
            </div>
            <div className="space-y-3 overflow-auto max-h-[32vh]">
              {comments.length === 0 ? (
                <p className="text-slate-500">No comments yet.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{comment.author.name}</p>
                      <p className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                placeholder="Add a comment..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitComment}
                className="w-full justify-center"
              >
                <Send className="mr-2 h-4 w-4" /> Add comment
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
