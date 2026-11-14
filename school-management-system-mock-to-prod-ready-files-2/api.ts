export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

type ApiSuccess = { message?: string; user?: Record<string, unknown> };

/** Error thrown for non-2xx responses; `status` lets screens tell "incorrect" (401) from "locked" (403). */
export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
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
    const fieldErrors = typeof payload === 'object' && payload?.fieldErrors ? payload.fieldErrors : {};
    throw new ApiError(message, response.status, fieldErrors);
  }

  return payload as T;
}

export type StaffUser = { id: number; email: string; role: 'superadmin' | 'teacher'; kind: 'staff' };
export type ClassRow = { id: number; name: string };

export type AdminStudent = {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  parentPhone: string;
  active: boolean;
  classId: number;
  className: string;
};

export type StudentInput = {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classId: number;
  parentPhone: string;
  active: boolean;
};

export type ImportPreview = {
  counts: { new: number; duplicate: number; unknownClass: number; invalid: number };
  errors: string[];
  rows: Array<{
    firstName: string;
    lastName: string;
    admissionNumber: string;
    className: string;
    parentPhone: string;
    status: 'new' | 'duplicate' | 'unknown_class';
  }>;
};

export type AccessStatusRow = {
  id: number;
  admissionNumber: string;
  name: string;
  classId: number;
  className: string;
  codeGenerated: boolean;
  lastGenerated: string | null;
};

export type IssuedCode = { studentId: number; name: string; admissionNumber: string; className: string; code: string };

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const api = {
  loginStaff: (payload: { email: string; password: string }) =>
    apiRequest<{ message: string; user: StaffUser }>('/auth/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  loginParent: (payload: { admissionNumber: string; accessCode: string }) =>
    apiRequest<{ message: string; user: { admissionNumber: string; kind: 'parent'; classId: number } }>('/auth/parent', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () => apiRequest<{ message: string }>('/auth/logout', { method: 'POST' }),

  getStaffProfile: () => apiRequest<{ user: StaffUser }>('/staff/me'),

  getParentProfile: () => apiRequest<{ user: { admissionNumber: string; kind: 'parent'; classId: number } }>('/parent/me'),

  /* ---- Admin: classes and students ---- */

  listClasses: () => apiRequest<{ classes: ClassRow[] }>('/admin/classes'),

  listStudents: (params: { q?: string; classId?: number; status?: 'all' | 'active' | 'inactive' } = {}) =>
    apiRequest<{ students: AdminStudent[]; total: number }>(`/admin/students${qs(params)}`),

  getStudent: (id: number) => apiRequest<{ student: AdminStudent }>(`/admin/students/${id}`),

  createStudent: (input: StudentInput) =>
    apiRequest<{ student: AdminStudent }>('/admin/students', { method: 'POST', body: JSON.stringify(input) }),

  updateStudent: (id: number, input: Partial<StudentInput>) =>
    apiRequest<{ student: AdminStudent }>(`/admin/students/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  previewStudentImport: (csv: string) =>
    apiRequest<ImportPreview>('/admin/students/import/preview', { method: 'POST', body: JSON.stringify({ csv }) }),

  commitStudentImport: (csv: string) =>
    apiRequest<{ inserted: number; skippedDuplicates: number; skippedUnknownClass: number; invalidRows: number }>(
      '/admin/students/import/commit',
      { method: 'POST', body: JSON.stringify({ csv }) },
    ),

  /* ---- Admin: access codes ---- */

  listAccessStatus: () => apiRequest<{ students: AccessStatusRow[] }>('/admin/access-codes'),

  issueClassCodes: (classId: number) =>
    apiRequest<{ codes: IssuedCode[] }>('/admin/access-codes/class', { method: 'POST', body: JSON.stringify({ classId }) }),

  issueStudentCode: (studentId: number) =>
    apiRequest<{ codes: IssuedCode[] }>(`/admin/access-codes/student/${studentId}`, { method: 'POST', body: '{}' }),
};
