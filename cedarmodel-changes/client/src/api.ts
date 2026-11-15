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

export type TableInput = { csv?: string; xlsxBase64?: string };

export type ImportPreview = {
  counts: { new: number; duplicate: number; unknownClass: number; invalidPhone: number; invalid: number };
  errors: string[];
  rows: Array<{
    firstName: string;
    lastName: string;
    admissionNumber: string;
    className: string;
    parentPhone: string;
    status: 'new' | 'duplicate' | 'unknown_class' | 'invalid_phone';
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

export type Term = { id: number; name: string; session: string; isCurrent?: boolean; nextTermBegins: string | null };
export type SchoolSettings = { name: string; email: string; phone: string };

export type ResultBatchSummary = {
  id: number;
  classId: number;
  className: string;
  status: 'draft' | 'published';
  uploadedAt: string;
  reviewedAt: string | null;
  uploader: string | null;
  studentCount: number;
};

export type UploadSummary = {
  ok: boolean;
  students: number;
  rows: number;
  missingStudents: number;
  errors: string[];
  totalErrors: number;
  batchId?: number;
};

export type SubjectLine = { subject: string; ca1: number; ca2: number; exam: number; total: number; grade: string; credit: boolean };

export type BatchDetail = {
  batch: { id: number; className: string; status: 'draft' | 'published'; termName: string; session: string };
  students: Array<{
    studentId: number;
    name: string;
    admissionNumber: string;
    subjects: SubjectLine[];
    average: number;
    rank: number;
    schoolDays: number | null;
    daysPresent: number | null;
    comment: string | null;
  }>;
  missing: Array<{ name: string; admissionNumber: string }>;
};

export type AuditEntry = { id: number; title: string; owner: string; detail: string; at: string };

export type Overview = {
  counts: { students: number; activeStudents: number; classes: number; codesIssued: number };
  term: Term | null;
  results: { draft: number; published: number; notUploaded: number };
  recent: AuditEntry[];
};

export type ParentReport = {
  status: 'published' | 'pending';
  school: SchoolSettings;
  student: { name: string; admissionNumber: string; className: string };
  term: { name: string; session: string; nextTermBegins: string | null } | null;
  gradeScale?: Array<{ grade: string; min: number; max: number }>;
  subjects?: SubjectLine[];
  summary?: { average: number; highest: number; creditsEarned: number; subjectCount: number; position: { rank: number; of: number } };
  attendance?: { schoolDays: number; present: number } | null;
  comment?: string | null;
};

export type StaffAccount = { id: number; email: string; role: 'superadmin' | 'teacher'; active: boolean; classIds: number[] };

export type AttendanceStatus = 'present' | 'absent' | 'late';
export type AttendanceSheet = {
  date: string;
  saved: boolean;
  students: Array<{ id: number; name: string; admissionNumber: string; status: AttendanceStatus | null }>;
};

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

  previewStudentImport: (input: TableInput) =>
    apiRequest<ImportPreview>('/admin/students/import/preview', { method: 'POST', body: JSON.stringify(input) }),

  commitStudentImport: (input: TableInput) =>
    apiRequest<{ inserted: number; skippedDuplicates: number; skippedUnknownClass: number; skippedInvalidPhone: number; invalidRows: number }>(
      '/admin/students/import/commit',
      { method: 'POST', body: JSON.stringify(input) },
    ),

  /* ---- Admin: access codes ---- */

  listAccessStatus: () => apiRequest<{ students: AccessStatusRow[] }>('/admin/access-codes'),

  issueClassCodes: (classId: number) =>
    apiRequest<{ codes: IssuedCode[] }>('/admin/access-codes/class', { method: 'POST', body: JSON.stringify({ classId }) }),

  issueStudentCode: (studentId: number) =>
    apiRequest<{ codes: IssuedCode[] }>(`/admin/access-codes/student/${studentId}`, { method: 'POST', body: '{}' }),
  /* ---- Admin: overview, audit, terms, settings, classes, promotion ---- */

  getOverview: () => apiRequest<Overview>('/admin/overview'),

  listAudit: (offset = 0, limit = 50) => apiRequest<{ entries: AuditEntry[] }>(`/admin/audit${qs({ offset, limit })}`),

  listTerms: () => apiRequest<{ terms: Term[] }>('/admin/terms'),

  createTerm: (input: { name: string; session: string; nextTermBegins: string | null; makeCurrent: boolean }) =>
    apiRequest<{ ok: true }>('/admin/terms', { method: 'POST', body: JSON.stringify(input) }),

  setCurrentTerm: (id: number) => apiRequest<{ ok: true }>(`/admin/terms/${id}/current`, { method: 'POST', body: '{}' }),

  getSettings: () => apiRequest<{ settings: SchoolSettings }>('/admin/settings'),

  saveSettings: (input: SchoolSettings) => apiRequest<{ ok: true }>('/admin/settings', { method: 'PUT', body: JSON.stringify(input) }),

  createClass: (name: string) => apiRequest<{ class: ClassRow }>('/admin/classes', { method: 'POST', body: JSON.stringify({ name }) }),

  promoteStudents: (input: { fromClassId: number; toClassId: number; studentIds?: number[] }) =>
    apiRequest<{ moved: number }>('/admin/students/promote', { method: 'POST', body: JSON.stringify(input) }),

  /* ---- Results ---- */

  getCurrentTerm: () => apiRequest<{ term: Term | null }>('/admin/terms/current'),

  listResultBatches: () => apiRequest<{ term: Term | null; batches: ResultBatchSummary[] }>('/admin/results/batches'),

  uploadResults: (input: TableInput & { classId: number; dryRun: boolean }) =>
    apiRequest<UploadSummary>('/admin/results/upload', { method: 'POST', body: JSON.stringify(input) }),

  getResultBatch: (id: number) => apiRequest<BatchDetail>(`/admin/results/batches/${id}`),

  publishResults: (id: number) => apiRequest<{ ok: true }>(`/admin/results/batches/${id}/publish`, { method: 'POST', body: '{}' }),

  unpublishResults: (id: number) => apiRequest<{ ok: true }>(`/admin/results/batches/${id}/unpublish`, { method: 'POST', body: '{}' }),

  /* ---- Parent ---- */

  getParentReport: () => apiRequest<ParentReport>('/parent/report'),

  /* ---- Staff accounts ---- */

  listStaff: () => apiRequest<{ staff: StaffAccount[] }>('/admin/staff'),

  createStaff: (input: { email: string; password: string; role: 'superadmin' | 'teacher'; classIds: number[] }) =>
    apiRequest<{ id: number }>('/admin/staff', { method: 'POST', body: JSON.stringify(input) }),

  updateStaff: (id: number, input: { active?: boolean; role?: 'superadmin' | 'teacher'; classIds?: number[] }) =>
    apiRequest<{ ok: true }>(`/admin/staff/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  resetStaffPassword: (id: number, password: string) =>
    apiRequest<{ ok: true }>(`/admin/staff/${id}/password`, { method: 'POST', body: JSON.stringify({ password }) }),

  /* ---- Attendance ---- */

  getAttendance: (classId: number, date: string) => apiRequest<AttendanceSheet>(`/admin/attendance${qs({ classId, date })}`),

  saveAttendance: (input: { classId: number; date: string; entries: Array<{ studentId: number; status: AttendanceStatus }> }) =>
    apiRequest<{ ok: true; saved: number }>('/admin/attendance', { method: 'PUT', body: JSON.stringify(input) }),
};
