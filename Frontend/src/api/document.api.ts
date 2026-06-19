/**
 * ============================================================
 * Document API Module — Link-based
 * ============================================================
 * Documents store references to external resources
 * (Google Docs, Figma, GitHub, Notion, etc.)
 */
import { api } from './config';
import { Endpoints } from './endpoints';
import type { Document, DocumentType } from './types';

export interface CreateDocumentPayload {
  title: string;
  description?: string;
  url: string;
  type?: DocumentType;
}

export interface UpdateDocumentPayload {
  title?: string;
  description?: string;
  url?: string;
  type?: DocumentType;
}

/** List documents in a project (optionally filter by type / search) */
export async function getDocuments(
  projectId: string,
  options?: { type?: DocumentType; search?: string },
): Promise<Document[]> {
  const params = new URLSearchParams();
  if (options?.type) params.set('type', options.type);
  if (options?.search) params.set('search', options.search);

  const qs = params.toString();
  return api.get<Document[]>(
    `${Endpoints.DOCUMENT_LIST(projectId)}${qs ? `?${qs}` : ''}`,
  );
}

/** Add a document link to a project */
export async function createDocument(
  projectId: string,
  payload: CreateDocumentPayload,
): Promise<Document> {
  return api.post<Document>(Endpoints.DOCUMENT_LIST(projectId), payload);
}

/** Update a document */
export async function updateDocument(
  projectId: string,
  docId: string,
  payload: UpdateDocumentPayload,
): Promise<Document> {
  return api.put<Document>(Endpoints.DOCUMENT_DETAIL(projectId, docId), payload);
}

/** Delete a document */
export async function deleteDocument(projectId: string, docId: string): Promise<void> {
  return api.delete(Endpoints.DOCUMENT_DETAIL(projectId, docId));
}
