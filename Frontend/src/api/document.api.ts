/**
 * ============================================================
 * Document API Module
 * ============================================================
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import type { Document, Folder, DocumentListResponse } from './types';

/** Lay danh sach tai lieu cua project */
export async function getDocuments(
  projectId: string,
  options?: { folderId?: string | null; search?: string; fileType?: string },
): Promise<DocumentListResponse> {
  const params = new URLSearchParams();
  if (options?.folderId !== undefined) params.set('folderId', options.folderId ?? 'null');
  if (options?.search) params.set('search', options.search);
  if (options?.fileType) params.set('fileType', options.fileType);

  const qs = params.toString();
  return api.get<DocumentListResponse>(
    `${Endpoints.DOCUMENT_LIST(projectId)}${qs ? `?${qs}` : ''}`,
  );
}

/** Upload tai lieu */
export async function uploadDocument(
  projectId: string,
  formData: FormData,
): Promise<Document> {
  return api.upload<Document>(Endpoints.DOCUMENT_LIST(projectId), formData);
}

/** Cap nhat ten tai lieu */
export async function renameDocument(
  projectId: string,
  docId: string,
  name: string,
): Promise<Document> {
  return api.put<Document>(Endpoints.DOCUMENT_DETAIL(projectId, docId), { name });
}

/** Xoa tai lieu */
export async function deleteDocument(projectId: string, docId: string): Promise<void> {
  return api.delete(Endpoints.DOCUMENT_DETAIL(projectId, docId));
}

/** Tao thu muc */
export async function createFolder(
  projectId: string,
  data: { name: string; parentId?: string | null },
): Promise<Folder> {
  return api.post<Folder>(Endpoints.DOCUMENT_FOLDERS(projectId), data);
}

/** Cap nhat ten thu muc */
export async function renameFolder(
  projectId: string,
  folderId: string,
  name: string,
): Promise<Folder> {
  return api.put<Folder>(Endpoints.DOCUMENT_FOLDER(projectId, folderId), { name });
}

/** Xoa thu muc */
export async function deleteFolder(projectId: string, folderId: string): Promise<void> {
  return api.delete(Endpoints.DOCUMENT_FOLDER(projectId, folderId));
}
