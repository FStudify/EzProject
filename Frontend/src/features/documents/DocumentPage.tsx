import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Link as LinkIcon,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Search,
  Loader2,
  X,
  Check,
  AlertCircle,
  Github,
  Figma,
  Globe,
  Sheet,
  Presentation,
  Copy,
  Calendar,
  User as UserIcon,
} from 'lucide-react';
import { Button, EmptyState, useToast } from '@/components/ui';
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  type CreateDocumentPayload,
} from '@/api/document.api';
import type { Document, DocumentType } from '@/types';

// ── Type → icon + label mapping ──────────────────────────────────
const TYPE_META: Record<
  DocumentType,
  { label: string; Icon: typeof FileText; color: string; bg: string }
> = {
  google_doc: {
    label: 'Google Docs',
    Icon: FileText,
    color: '#1A73E8',
    bg: '#E8F0FE',
  },
  google_sheet: {
    label: 'Google Sheets',
    Icon: Sheet,
    color: '#188038',
    bg: '#E6F4EA',
  },
  google_slide: {
    label: 'Google Slides',
    Icon: Presentation,
    color: '#F4B400',
    bg: '#FEF7E0',
  },
  figma: {
    label: 'Figma',
    Icon: Figma,
    color: '#A259FF',
    bg: '#F3E8FF',
  },
  github: {
    label: 'GitHub',
    Icon: Github,
    color: '#1F1F1F',
    bg: '#F0EDE8',
  },
  notion: {
    label: 'Notion',
    Icon: FileText,
    color: '#000000',
    bg: '#F5F5F5',
  },
  other: {
    label: 'Link',
    Icon: Globe,
    color: '#635648',
    bg: '#F0EDE8',
  },
};

function getTypeMeta(type: string) {
  return TYPE_META[type as DocumentType] ?? TYPE_META.other;
}

function formatTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Add/Edit Document Modal ──────────────────────────────────────
interface DocumentFormModalProps {
  open: boolean;
  initial: Document | null;
  onClose: () => void;
  onSave: (payload: CreateDocumentPayload) => Promise<void>;
}

function DocumentFormModal({ open, initial, onClose, onSave }: DocumentFormModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '');
      setUrl(initial?.url ?? '');
      setDescription(initial?.description ?? '');
      setError('');
      setSaving(false);
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    const cleanUrl = url.trim();
    if (!isValidUrl(cleanUrl)) {
      setError('Please enter a valid URL (http:// or https://)');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        url: cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`,
        description: description.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: '#FFFDFB', border: '1px solid #E8D8CF' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: '#1F1F1F' }}>
            {initial ? 'Edit document' : 'Add document link'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-canvas"
            style={{ color: '#9a9086' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: '#635648' }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Database Design"
              autoFocus
              className="ez-input w-full"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: '#635648' }}>
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              className="ez-input w-full"
              required
            />
            <p className="mt-1.5 text-xs" style={{ color: '#9a9086' }}>
              Supported: Google Docs, Sheets, Slides, Figma, GitHub, Notion
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: '#635648' }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note about this document"
              rows={2}
              className="ez-input w-full resize-none"
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {initial ? 'Save changes' : 'Add document'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function DocumentPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await getDocuments(projectId, {
        type: filterType === 'all' ? undefined : filterType,
        search: searchTerm || undefined,
      });
      setDocuments(data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast('Failed to load documents', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, filterType, searchTerm, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (doc: Document) => {
    setEditing(doc);
    setModalOpen(true);
  };

  const handleDelete = async (doc: Document) => {
    if (!projectId) return;
    if (!window.confirm(`Delete "${doc.title}"?`)) return;
    try {
      await deleteDocument(projectId, doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast('Document deleted', 'success');
    } catch (error: any) {
      toast(error?.message || 'Failed to delete', 'error');
    }
  };

  const handleSave = async (payload: CreateDocumentPayload) => {
    if (!projectId) return;
    try {
      if (editing) {
        const updated = await updateDocument(projectId, editing.id, payload);
        setDocuments((prev) => prev.map((d) => (d.id === editing.id ? updated : d)));
        toast('Document updated', 'success');
      } else {
        const created = await createDocument(projectId, payload);
        setDocuments((prev) => [created, ...prev]);
        toast('Document added', 'success');
      }
    } catch (error: any) {
      toast(error?.message || 'Failed to save document', 'error');
    }
  };

  const handleOpen = (doc: Document) => {
    window.open(doc.url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async (doc: Document) => {
    try {
      await navigator.clipboard.writeText(doc.url);
      setCopiedId(doc.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast('Failed to copy link', 'error');
    }
  };

  const totalDocs = documents.length;
  const grouped = documents.reduce<Record<DocumentType, Document[]>>(
    (acc, doc) => {
      const key = doc.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    },
    {
      google_doc: [],
      google_sheet: [],
      google_slide: [],
      figma: [],
      github: [],
      notion: [],
      other: [],
    },
  );

  const filterTabs: { value: DocumentType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'google_doc', label: 'Docs' },
    { value: 'google_sheet', label: 'Sheets' },
    { value: 'google_slide', label: 'Slides' },
    { value: 'figma', label: 'Figma' },
    { value: 'github', label: 'GitHub' },
    { value: 'notion', label: 'Notion' },
  ];

  return (
    <div
      className="flex h-[calc(100vh-72px)] flex-col overflow-hidden rounded-2xl border shadow-sm"
      style={{ backgroundColor: '#FFFDFB', borderColor: '#E8D8CF' }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b px-5 py-3" style={{ borderColor: '#E8D8CF' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: '#FFF5EC' }}>
          <LinkIcon className="h-5 w-5" style={{ color: '#D97853' }} />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold" style={{ color: '#1F1F1F' }}>
            Documents
          </h1>
          <p className="text-xs" style={{ color: '#9a9086' }}>
            {totalDocs} {totalDocs === 1 ? 'link' : 'links'} to external resources
          </p>
        </div>
        <Button variant="primary" size="md" onClick={handleAdd}>
          <Plus className="h-4 w-4" /> Add document
        </Button>
      </header>

      {/* Search + filters */}
      <div
        className="flex flex-wrap items-center gap-2 border-b px-5 py-3"
        style={{ borderColor: '#E8D8CF' }}
      >
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: '#9a9086' }}
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents…"
            className="ez-input w-full pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filterTabs.map((tab) => {
            const active = filterType === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilterType(tab.value)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  backgroundColor: active ? '#D97853' : 'transparent',
                  color: active ? '#FFFFFF' : '#7D6F66',
                  border: `1px solid ${active ? '#D97853' : '#E8D8CF'}`,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#D97853' }} />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <EmptyState
              icon={<LinkIcon className="h-7 w-7" />}
              title={Boolean(searchTerm || filterType !== 'all') ? 'Không tìm thấy tài liệu' : 'Chưa có tài liệu'}
              description={Boolean(searchTerm || filterType !== 'all') ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.' : 'Thêm liên kết tài liệu nhóm của bạn (Google Docs, Figma, GitHub, Notion...)'}
              actionLabel={!Boolean(searchTerm || filterType !== 'all') ? 'Thêm tài liệu' : undefined}
              onAction={!Boolean(searchTerm || filterType !== 'all') ? handleAdd : undefined}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {filterType === 'all'
              ? Object.entries(grouped).map(([type, docs]) => {
                  if (docs.length === 0) return null;
                  const meta = getTypeMeta(type);
                  const { Icon } = meta;
                  return (
                    <section key={type}>
                      <header className="mb-3 flex items-center gap-2">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-lg"
                          style={{ backgroundColor: meta.bg }}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                        </div>
                        <h2 className="text-sm font-semibold" style={{ color: '#1F1F1F' }}>
                          {meta.label}
                        </h2>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: '#F0EDE8', color: '#7D6F66' }}
                        >
                          {docs.length}
                        </span>
                      </header>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {docs.map((doc) => (
                          <DocumentCard
                            key={doc.id}
                            doc={doc}
                            copied={copiedId === doc.id}
                            onOpen={() => handleOpen(doc)}
                            onCopy={() => handleCopy(doc)}
                            onEdit={() => handleEdit(doc)}
                            onDelete={() => handleDelete(doc)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })
              : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      copied={copiedId === doc.id}
                      onOpen={() => handleOpen(doc)}
                      onCopy={() => handleCopy(doc)}
                      onEdit={() => handleEdit(doc)}
                      onDelete={() => handleDelete(doc)}
                    />
                  ))}
                </div>
              )}
          </div>
        )}
      </div>

      <DocumentFormModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}

// ── Document card ────────────────────────────────────────────────
interface DocumentCardProps {
  doc: Document;
  copied: boolean;
  onOpen: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function DocumentCard({ doc, copied, onOpen, onCopy, onEdit, onDelete }: DocumentCardProps) {
  const meta = getTypeMeta(doc.type);
  const { Icon } = meta;

  return (
    <article
      className="group relative flex flex-col gap-3 rounded-2xl p-4 transition-all"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E0D8',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#D97853';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(217,120,83,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E8E0D8';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top row: type badge + actions */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: meta.bg }}
        >
          <Icon className="h-4 w-4" style={{ color: meta.color }} />
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onCopy}
            className="rounded-lg p-1.5 transition-colors hover:bg-canvas"
            style={{ color: '#7D6F66' }}
            aria-label="Copy link"
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-1.5 transition-colors hover:bg-canvas"
            style={{ color: '#7D6F66' }}
            aria-label="Edit"
            title="Edit"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
            style={{ color: '#EF4444' }}
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title + description */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold" style={{ color: '#1F1F1F' }}>
          {doc.title}
        </h3>
        {doc.description && (
          <p className="mt-1 line-clamp-2 text-xs" style={{ color: '#7D6F66' }}>
            {doc.description}
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 text-[11px]" style={{ color: '#9a9086' }}>
        {doc.createdBy?.fullName && (
          <span className="flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            {doc.createdBy.fullName}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatTime(doc.createdAt)}
        </span>
      </div>

      {/* Open button */}
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all"
        style={{ backgroundColor: '#FFF5EC', color: '#D97853' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFE8D6')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFF5EC')}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open in new tab
      </button>
    </article>
  );
}


