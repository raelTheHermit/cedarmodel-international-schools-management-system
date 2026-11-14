export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

type ApiSuccess = { message?: string; user?: Record<string, unknown> };

/** Error thrown for non-2xx responses; `status` lets screens tell "incorrect" (401) from "locked" (403). */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest<T = ApiSuccess>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message ?? 'Request failed';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export const api = {
  loginStaff: (payload: { email: string; password: string }) =>
    apiRequest<{ message: string; user: { email: string; role: 'superadmin' | 'teacher'; kind: 'staff' } }>('/auth/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  loginParent: (payload: { admissionNumber: string; accessCode: string }) =>
    apiRequest<{ message: string; user: { admissionNumber: string; kind: 'parent'; classId: number } }>('/auth/parent', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () => apiRequest<{ message: string }>('/auth/logout', { method: 'POST' }),

  getStaffProfile: () => apiRequest<{ user: { email: string; role: 'superadmin' | 'teacher'; kind: 'staff' } }>('/staff/me'),

  getParentProfile: () => apiRequest<{ user: { admissionNumber: string; kind: 'parent'; classId: number } }>('/parent/me'),
};
