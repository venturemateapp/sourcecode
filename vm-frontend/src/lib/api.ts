import { API_CONFIG } from './constants';
import { getToken } from './auth';

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(
    message: string,
    status?: number,
    code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface UploadResult {
  document: {
    id: string;
    name: string;
    type: string;
    size: string;
    url: string;
  };
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = getToken();

  const res = await fetch(API_CONFIG.GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}: ${res.statusText}`, res.status);
  }

  const json = await res.json();

  if (json.errors) {
    const message = json.errors[0]?.message || 'GraphQL error';
    const code = json.errors[0]?.extensions?.code;
    throw new ApiError(message, res.status, code);
  }

  return json.data as T;
}

export async function deleteDocument(businessId: string, documentId: string): Promise<{success: boolean; message: string}> {
  const token = getToken();
  const url = `${API_CONFIG.DELETE_DOCUMENT_URL}?businessId=${encodeURIComponent(businessId)}&documentId=${encodeURIComponent(documentId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Delete failed (${res.status}): ${errBody || res.statusText}`);
  }
  return res.json();
}

export async function restRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}: ${res.statusText}`, res.status);
  }

  return res.json() as Promise<T>;
}

export async function uploadFile(
  file: File,
  businessId: string,
  category: string = 'other',
  tags: string = '',
): Promise<UploadResult> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('businessId', businessId);
  formData.append('category', category);
  if (tags) formData.append('tags', tags);

  const res = await fetch(API_CONFIG.UPLOAD_URL, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new ApiError(`Upload failed (${res.status}): ${errBody || res.statusText}`, res.status);
  }

  return res.json() as Promise<UploadResult>;
}
