import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Presentation,
  Archive,
  Image,
  Upload,
  Folder,
  FolderPlus,
  Edit2,
  Trash2,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  MessageSquare,
  Info,
  Search,
  ChevronRight,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import { getDocuments, createFolder, renameDocument, deleteDocument, uploadDocument } from '@/api/document.api';
import type { Document } from '@/types';
import { Button, ProjectMemberAvatar, Badge } from '@/components/ui';
import DocumentContentArea from './DocumentContentArea';
import type { DocumentComment, DocumentAuditEntry } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

const fileTypeIcons = {
  DOC: FileText,
  PDF: FileText,
  PPT: Presentation,
  ZIP: Archive,
  IMG: Image,
  OTHER: FileText,
} as const;

function getFileType(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['doc', 'docx'].includes(ext)) return 'DOC';
  if (ext === 'pdf') return 'PDF';
  if (['ppt', 'pptx'].includes(ext)) return 'PPT';
  if (['zip', 'rar', '7z'].includes(ext)) return 'ZIP';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'IMG';
  return 'OTHER';
}

interface DocumentFolder {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  createdBy: { id: string; name: string; avatar: string };
}

export default function DocumentPage() {
  const { t } = useLanguage();

  function formatTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(h / 24);
    if (m < 1) return t('just_now');
    if (m < 60) return `${m} ${t('minutes_ago')}`;
    if (h < 24) return `${h} ${t('hours_ago')}`;
    return `${d} ${t('days_ago')}`;
  }

  const { projectId } = useParams<{ projectId: string }>();

  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanel, setRightPanel] = useState<'info' | 'comments' | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadedBlobs] = useState<Map<string, Blob>>(new Map());
  const [documentComments, setDocumentComments] = useState<Record<string, DocumentComment[]>>({});
  const [documentAuditLogs] = useState<Record<string, DocumentAuditEntry[]>>({});
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newComment, setNewComment] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  const [renameType, setRenameType] = useState<'file' | 'folder'>('file');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [dropdownId, setDropdownId] = useState<string | null>(null);
  const [dropdownType, setDropdownType] = useState<'file' | 'folder'>('file');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const response = await getDocuments(projectId, {
        folderId: currentFolderId,
        search: searchTerm || undefined,
      });
      // Normalize API Documents (@/api/types) to local Documents (@/types)
      setDocuments(
        response.files.map((f) => ({
          id: f.id,
          projectId: f.projectId,
          name: f.name,
          fileType: f.fileType,
          size: f.size,
          fileUrl: f.fileUrl ?? undefined,
          uploadedBy: {
            id: f.uploadedBy?.id ?? '',
            name: (f.uploadedBy as any)?.fullName ?? (f.uploadedBy as any)?.name ?? '',
            email: (f.uploadedBy as any)?.email ?? '',
            avatar: (f.uploadedBy as any)?.avatar ?? '',
          },
          uploadDate: f.uploadDate,
          folderId: f.folderId,
        }))
      );
      setFolders(
        response.folders.map((f) => ({
          id: f.id,
          name: f.name,
          parentId: f.parentId,
          createdAt: f.createdAt,
          createdBy: { id: '', name: '', avatar: '' },
        }))
      );
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, currentFolderId, searchTerm]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !projectId) return;
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId) formData.append('folderId', currentFolderId);
        const doc = await uploadDocument(projectId, formData);
        // Normalize API response to @/types Document
        const raw = doc as any;
        const normalized: Document = {
          id: raw._id ?? raw.id,
          projectId: raw.projectId ?? projectId,
          name: raw.name ?? file.name,
          fileType: raw.fileType ?? getFileType(file.name),
          size: raw.size ?? `${(file.size / 1024).toFixed(0)} KB`,
          fileUrl: raw.fileUrl ?? undefined,
          uploadedBy: {
            id: raw.uploadedBy?.id ?? raw.uploadedBy?._id ?? '',
            name: raw.uploadedBy?.fullName ?? raw.uploadedBy?.name ?? '',
            email: raw.uploadedBy?.email ?? '',
            avatar: raw.uploadedBy?.avatar ?? '',
          },
          uploadDate: raw.uploadDate ?? new Date().toISOString(),
          folderId: raw.folderId ?? currentFolderId,
        };
        setDocuments((prev) => [...prev, normalized]);
        setDocumentComments((prev) => ({ ...prev, [normalized.id]: [] }));
      } catch (error) {
        console.error('Failed to upload file:', file.name, error);
      }
    }
    e.target.value = '';
  };

  const handleAddComment = (docId: string, content: string) => {
    if (!content.trim()) return;
    const comment: DocumentComment = {
      id: `comment-${Date.now()}`,
      content: content.trim(),
      author: { id: '', name: '', email: '', avatar: '' },
      createdAt: new Date().toISOString(),
    };
    setDocumentComments((prev) => ({
      ...prev,
      [docId]: [...(prev[docId] ?? []), comment],
    }));
    setNewComment('');
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !projectId) return;
    try {
      const newFolder = await createFolder(projectId, {
        name: newFolderName.trim(),
        parentId: currentFolderId,
      });
      setFolders((prev) => [
        ...prev,
        {
          id: newFolder.id,
          name: newFolder.name,
          parentId: newFolder.parentId,
          createdAt: newFolder.createdAt,
          createdBy: { id: '', name: '', avatar: '' },
        },
      ]);
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleRename = async (id: string) => {
    if (!renamingValue.trim() || !projectId) {
      setRenamingId(null);
      return;
    }
    if (renameType === 'file') {
      try {
        await renameDocument(projectId, id, renamingValue.trim());
        setDocuments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, name: renamingValue.trim() } : d))
        );
      } catch (error) {
        console.error('Failed to rename document:', error);
      }
    } else {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name: renamingValue.trim() } : f))
      );
    }
    setRenamingId(null);
  };

  const handleDeleteFile = async (id: string) => {
    if (!projectId) return;
    try {
      await deleteDocument(projectId, id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDoc?.id === id) setSelectedDoc(null);
      setDropdownId(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleDeleteFolder = (id: string) => {
    const idsToDelete = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of folders) {
        if (f.parentId && idsToDelete.has(f.parentId) && !idsToDelete.has(f.id)) {
          idsToDelete.add(f.id);
          changed = true;
        }
      }
    }
    setFolders((prev) => prev.filter((f) => !idsToDelete.has(f.id)));
    setDocuments((prev) => prev.filter((d) => !idsToDelete.has(d.folderId ?? '')));
    if (currentFolderId && idsToDelete.has(currentFolderId)) {
      setCurrentFolderId(null);
    }
    setDropdownId(null);
  };

  const handleGoUp = () => {
    if (!currentFolderId) return;
    const folder = folders.find((f) => f.id === currentFolderId);
    setCurrentFolderId(folder?.parentId ?? null);
  };

  const handleDropdownToggle = (id: string, type: 'file' | 'folder') => {
    if (dropdownId === id) { setDropdownId(null); return; }
    setDropdownId(id);
    setDropdownType(type);
  };

  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const comments = selectedDoc ? documentComments[selectedDoc.id] ?? [] : [];
  const auditLog = selectedDoc ? documentAuditLogs[selectedDoc.id] ?? [] : [];

  const currentFolders = folders.filter((f) => f.parentId === currentFolderId);
  const currentDocs = documents.filter((d) => d.folderId === currentFolderId);
  const flatDocs = searchTerm
    ? documents.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : currentDocs;

  const getBreadcrumb = (folderId: string | null): DocumentFolder[] => {
    const path: DocumentFolder[] = [];
    let id: string | null = folderId;
    while (id) {
      const folder = folders.find((f) => f.id === id);
      if (!folder) break;
      path.unshift(folder);
      id = folder.parentId;
    }
    return path;
  };

  const breadcrumb = getBreadcrumb(currentFolderId);

  // ── File list panel ──────────────────────────────────────────────────────
  const FileListPanel = () => (
    <div className="flex w-56 shrink-0 flex-col border-r border-border bg-canvas">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{t('documents')}</h2>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-ink-muted">
          {currentDocs.length + currentFolders.length}
        </span>
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            placeholder={t('search_placeholder_doc')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ez-input w-full pl-8 text-xs"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 border-b border-border px-3 py-2">
        <Button variant="primary" size="sm" className="flex-1 justify-center text-xs" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> {t('upload')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setIsCreatingFolder(true)} title={t('create_folder')}>
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
        <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
      </div>

      {/* Folder creation */}
      {isCreatingFolder && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Folder className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName(''); }
            }}
            onBlur={() => { if (!newFolderName.trim()) setIsCreatingFolder(false); }}
            placeholder={t('folder_name')}
            className="ez-input flex-1 text-xs"
          />
        </div>
      )}

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 border-b border-border px-3 py-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleBreadcrumbClick(null)}
            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary-dark shrink-0"
          >
            <Folder className="h-3 w-3" />
            {t('folder_root')}
          </button>
          {breadcrumb.map((f, i) => (
            <div key={f.id} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3 w-3 text-ink-muted" />
              {i === breadcrumb.length - 1 ? (
                <span className="text-[11px] font-medium text-ink">{f.name}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(f.id)}
                  className="text-[11px] text-primary hover:text-primary-dark"
                >
                  {f.name}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Up button when inside folder */}
      {currentFolderId && !searchTerm && (
        <div className="px-3 pt-2 pb-0">
          <button
            type="button"
            onClick={handleGoUp}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            <span>{t('folder_up')}</span>
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
        </div>
      )}

      {/* Items list */}
      {!isLoading && (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-1">

          {/* Folders */}
          {!searchTerm && (
            <>
              {currentFolders.length > 0 && (
                <>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{t('folders')}</p>
                  <ul className="space-y-0.5 mb-3">
                    {currentFolders.map((folder) => (
                      <li key={folder.id} className="group relative">
                        {renamingId === folder.id ? (
                          <div className="flex items-center gap-2 px-2 py-1.5">
                            <Folder className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                            <input
                              autoFocus
                              value={renamingValue}
                              onChange={(e) => setRenamingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(folder.id);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              onBlur={() => setRenamingId(null)}
                              className="ez-input flex-1 text-xs"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCurrentFolderId(folder.id)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-ink hover:bg-surface-muted transition-colors"
                          >
                            <Folder className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                            <span className="flex-1 truncate">{folder.name}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDropdownToggle(folder.id, 'folder'); }}
                              className="flex h-5 w-5 items-center justify-center rounded opacity-0 group-hover:opacity-100 text-ink-muted hover:bg-border hover:text-ink transition-all"
                              aria-label={t('folder_options')}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </button>
                        )}
                        {dropdownId === folder.id && dropdownType === 'folder' && (
                          <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-border bg-surface p-1 shadow-xl">
                            <button type="button" onClick={() => { setRenamingId(folder.id); setRenamingValue(folder.name); setRenameType('folder'); setDropdownId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-ink hover:bg-canvas transition-colors">
                              <Edit2 className="h-3.5 w-3.5 text-ink-muted" />{t('rename')}
                            </button>
                            <button type="button" onClick={() => handleDeleteFolder(folder.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-danger hover:bg-canvas transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />{t('delete_folder')}
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-border mb-3" />
                </>
              )}
            </>
          )}

          {/* Files */}
          <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted ${searchTerm ? '' : 'mt-0'}`}>
            {searchTerm ? t('search_results') : t('files')}
          </p>
          {flatDocs.length === 0 && !searchTerm && currentFolders.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-muted">{t('folder_empty')}</p>
          ) : flatDocs.length === 0 && searchTerm ? (
            <p className="py-6 text-center text-xs text-ink-muted">{t('no_results')}</p>
          ) : (
            <ul className="space-y-0.5 pb-2">
              {flatDocs.map((doc) => {
                const Icon = fileTypeIcons[doc.fileType];
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <li key={doc.id} className="group relative">
                    {renamingId === doc.id ? (
                      <input
                        autoFocus
                        value={renamingValue}
                        onChange={(e) => setRenamingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(doc.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onBlur={() => setRenamingId(null)}
                        className="ez-input w-full text-xs"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedDoc(doc)}
                        className={`group/file w-full text-left flex items-center gap-2 rounded-lg px-2 py-2 transition-all ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'hover:bg-surface-muted text-ink'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs font-medium">{doc.name}</p>
                          <p className={`text-[10px] ${isSelected ? 'text-white/60' : 'text-ink-muted'}`}>
                            {doc.size}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDropdownToggle(doc.id, 'file'); }}
                          className={`flex h-5 w-5 items-center justify-center rounded opacity-0 group-hover/file:opacity-100 ${isSelected ? 'hover:bg-white/20' : 'text-ink-muted hover:bg-border hover:text-ink'} transition-all`}
                          aria-label={t('file_options')}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </button>
                      </button>
                    )}
                    {dropdownId === doc.id && dropdownType === 'file' && (
                      <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-border bg-surface p-1 shadow-xl">
                        <button type="button" onClick={() => { setRenamingId(doc.id); setRenamingValue(doc.name); setRenameType('file'); setDropdownId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-ink hover:bg-canvas transition-colors">
                          <Edit2 className="h-3.5 w-3.5 text-ink-muted" />{t('rename')}
                        </button>
                        <button type="button" onClick={() => handleDeleteFile(doc.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-danger hover:bg-canvas transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />{t('delete_file')}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );

  // ── Right panel ──────────────────────────────────────────────────────────
  const RightPanel = ({ mode }: { mode: 'info' | 'comments' }) => (
    <div className="flex w-72 shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-xs font-semibold text-ink">
          {mode === 'info' ? t('file_info') : `${t('file_comments')} (${comments.length})`}
        </p>
        <button type="button" onClick={() => setRightPanel(null)} className="rounded p-0.5 text-ink-muted hover:bg-surface-muted hover:text-ink">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {mode === 'info' ? (
        <div className="flex-1 overflow-y-auto p-4">
          <dl className="space-y-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t('file_type')}</dt>
              <dd className="font-medium text-ink">{selectedDoc?.fileType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t('file_size')}</dt>
              <dd className="font-medium text-ink">{selectedDoc?.size}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t('uploaded_by')}</dt>
              <dd className="font-medium text-ink">{selectedDoc?.uploadedBy.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{t('upload_date')}</dt>
              <dd className="font-medium text-ink">{selectedDoc ? new Date(selectedDoc.uploadDate).toLocaleDateString('vi-VN') : ''}</dd>
            </div>
          </dl>
          {auditLog.length > 0 && (
            <>
              <div className="mt-5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{t('history')}</div>
              <ul className="space-y-2">
                {auditLog.map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-border bg-surface-muted p-2">
                    <Badge variant="default" className="mb-1">{entry.action}</Badge>
                    <p className="text-xs font-medium text-ink">{entry.user.name}</p>
                    <p className="text-[10px] text-ink-muted">{formatTime(entry.timestamp)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {comments.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-muted">{t('no_comments')}</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-surface-muted p-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ProjectMemberAvatar member={c.author} projectMembers={[]} size="sm" />
                    <div>
                      <p className="text-xs font-semibold text-ink">{c.author.name}</p>
                      <p className="text-[10px] text-ink-muted">{formatTime(c.createdAt)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-ink-secondary">{c.content}</p>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-border p-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('write_comment')}
              rows={2}
              className="ez-input mb-2 resize-none text-xs"
            />
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center text-xs"
              onClick={() => selectedDoc && handleAddComment(selectedDoc.id, newComment)}
              disabled={!newComment.trim()}
            >
              {t('send_comment')}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  // ── Viewer toolbar ──────────────────────────────────────────────────────
  const ViewerToolbar = () => (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
      {selectedDoc ? (
        <>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{selectedDoc.name}</p>
          </div>
          {selectedDoc.fileUrl && (
            <a
              href={`${window.location.origin}${selectedDoc.fileUrl}`}
              download={selectedDoc.name}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-secondary hover:border-primary hover:text-primary transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {t('download')}
            </a>
          )}
          <button
            type="button"
            onClick={() => setRightPanel(rightPanel === 'info' ? null : 'info')}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${rightPanel === 'info' ? 'border-primary bg-primary-50 text-primary' : 'border-border text-ink-secondary hover:bg-surface-muted'}`}
          >
            <Info className="h-3.5 w-3.5 inline mr-1" />{t('file_info')}
          </button>
          <button
            type="button"
            onClick={() => setRightPanel(rightPanel === 'comments' ? null : 'comments')}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${rightPanel === 'comments' ? 'border-primary bg-primary-50 text-primary' : 'border-border text-ink-secondary hover:bg-surface-muted'}`}
          >
            <MessageSquare className="h-3.5 w-3.5 inline mr-1" />{t('file_comments')}
          </button>
        </>
      ) : null}
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────────
  if (!sidebarOpen) {
    return (
      <div className="flex h-[calc(100vh-72px)] overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <ViewerToolbar />
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {selectedDoc ? (
              <DocumentContentArea document={selectedDoc} fileBlob={uploadedBlobs.get(selectedDoc.id) ?? null} className="flex-1" />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-ink-muted">{t('select_document')}</p>
              </div>
            )}
            {rightPanel && <RightPanel mode={rightPanel} />}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="absolute left-0 top-1/2 z-10 flex h-10 w-6 items-center justify-center rounded-r-lg border border-l-0 border-border bg-surface shadow-md hover:bg-surface-muted"
        >
          <PanelLeftOpen className="h-4 w-4 text-ink-muted" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-72px)] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <FileListPanel />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ViewerToolbar />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {selectedDoc ? (
            <DocumentContentArea document={selectedDoc} fileBlob={uploadedBlobs.get(selectedDoc.id) ?? null} className="flex-1" />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
                  <FileText className="h-6 w-6 text-ink-muted" />
                </div>
                <p className="text-sm font-medium text-ink">{t('no_documents')}</p>
                <p className="mt-1 text-xs text-ink-muted">{t('select_document')}</p>
              </div>
            </div>
          )}
          {rightPanel && <RightPanel mode={rightPanel} />}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setSidebarOpen(false)}
        className="absolute left-56 top-1/2 z-10 flex h-10 w-6 items-center justify-center rounded-r-lg border border-l-0 border-border bg-surface shadow-md hover:bg-surface-muted"
      >
        <PanelLeftClose className="h-4 w-4 text-ink-muted" />
      </button>
    </div>
  );
}
