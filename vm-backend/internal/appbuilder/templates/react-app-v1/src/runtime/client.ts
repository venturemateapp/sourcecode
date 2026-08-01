import { runtimeAccessKey, runtimeProjectId } from './project';

export type RuntimeRecord<T extends object = Record<string, unknown>> = {
  id: string;
  data: T;
  createdAt: string;
  updatedAt: string;
};

const base = (import.meta.env.VITE_VM_RUNTIME_URL || '/api/runtime').replace(/\/$/, '');
const projectId = import.meta.env.VITE_VM_PROJECT_ID || runtimeProjectId;
const accessKey = import.meta.env.VITE_VM_RUNTIME_KEY || runtimeAccessKey;

async function request<T>(requestPath: string, init?: RequestInit): Promise<T> {
  if (!projectId || !accessKey) throw new Error('Managed runtime is not configured for this project.');
  const response = await fetch(`${base}/projects/${encodeURIComponent(projectId)}${requestPath}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-VM-Runtime-Key': accessKey,
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) throw new Error((await response.text()) || `Runtime request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export const vmRuntime = {
  list: <T extends object>(entity: string, params = '') => request<{ items: RuntimeRecord<T>[]; total: number }>(`/entities/${encodeURIComponent(entity)}/records${params}`),
  create: <T extends object>(entity: string, data: T) => request<RuntimeRecord<T>>(`/entities/${encodeURIComponent(entity)}/records`, { method: 'POST', body: JSON.stringify({ data }) }),
  update: <T extends object>(entity: string, id: string, data: Partial<T>) => request<RuntimeRecord<T>>(`/entities/${encodeURIComponent(entity)}/records/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ data }) }),
  remove: (entity: string, id: string) => request<{ success: boolean }>(`/entities/${encodeURIComponent(entity)}/records/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
