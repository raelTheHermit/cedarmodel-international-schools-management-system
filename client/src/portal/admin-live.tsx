import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import type { AccessStatusRow, AdminStudent, ClassRow, ImportPreview, IssuedCode, StaffUser, TableInput } from '../api';
import { initialsOf } from './data';
import { Icon } from './icons';
import { useMessageModal } from './message-modal';
import { StaffContext } from './staff-context';
import { AdminPageHeader, AdminShell } from './shells';

const SUBJECT_PRESETS = {
  science: [
    'English Language',
    'General Mathematics',
    'Civic Education',
    'Data Processing',
    'Physics',
    'Chemistry',
    'Biology',
    'Further Mathematics',
    'Agricultural Science',
    'Geography',
    'Technical Drawing',
    'Computer Studies / ICT',
    'Physical & Health Education',
    'Foods & Nutrition',
  ],
  arts: [
    'English Language',
    'General Mathematics',
    'Civic Education',
    'Data Processing',
    'Literature-in-English',
    'Government',
    'Christian Religious Studies (CRS)',
    'History',
    'Visual Arts / Fine Art',
    'Music',
    'French / Arabic',
    'Additional Nigerian Languages',
    'Home Management / Catering Craft',
  ],
  commercial: [
    'English Language',
    'General Mathematics',
    'Civic Education',
    'Data Processing',
    'Economics',
    'Commerce',
    'Financial Accounting',
    'Office Practice / Business Studies',
    'Marketing',
    'Geography',
    'Book-Keeping',
    'Computer Studies / ICT',
  ],
} as const;

type SubjectStream = keyof typeof SUBJECT_PRESETS | 'custom';

type SubjectRow = {
  subject: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
};

function gradeForScore(score: number): string {
  if (score >= 75) return 'A';
  if (score >= 70) return 'B';
  if (score >= 65) return 'C';
  if (score >= 60) return 'D';
  if (score >= 50) return 'E';
  if (score >= 40) return 'P';
  return 'F';
}

function normalizeSubjectRows(
  rows: Array<{ subject?: string; ca1?: number; ca2?: number; exam?: number; total?: number; grade?: string }> = [],
): SubjectRow[] {
  return rows.map((row) => {
    const ca1 = Number(row.ca1 ?? 0);
    const ca2 = Number(row.ca2 ?? 0);
    const exam = Number(row.exam ?? 0);
    const total = Number(row.total ?? ca1 + ca2 + exam);
    return {
      subject: row.subject || 'Subject',
      ca1,
      ca2,
      exam,
      total,
      grade: row.grade || gradeForScore(total),
    };
  });
}

function getPresetSubjects(stream: SubjectStream): readonly string[] {
  if (stream === 'custom') return [];
  return SUBJECT_PRESETS[stream];
}

export function Initials({ name }: { name: string }) {
  return <span className="ap-initials" aria-hidden="true">{initialsOf(name)}</span>;
}

export function InlineSearch({ value, onChange, placeholder, className = '' }: { value: string; onChange: (next: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={`ap-inline-search ${className}`.trim()}>
      <Icon name="search" size={15} />
      <input type="search" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function Pill({ tone, children }: { tone: 'success' | 'muted'; children: ReactNode }) {
  return <span className={`ap-pill ${tone}`}><i />{children}</span>;
}

export function FormFooter({ children }: { children: ReactNode }) {
  return <div className="ap-form-footer">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Hooks and guard                                                     */
/* ------------------------------------------------------------------ */

export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: '', loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: '' }));
    load()
      .then((data) => !cancelled && setState({ data, error: '', loading: false }))
      .catch((caught) => {
        if (cancelled) return;
        const message = caught instanceof ApiError ? caught.message : 'We couldn’t reach the server. Check your connection and try again.';
        setState({ data: null, error: message, loading: false });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, reload: useCallback(() => setTick((value) => value + 1), []) };
}

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function errorText(caught: unknown) {
  return caught instanceof ApiError ? caught.message : 'We couldn’t reach the server. Check your connection and try again.';
}


export function useStaff(): StaffUser {
  const staff = useContext(StaffContext);
  if (!staff) throw new Error('useStaff must be used inside <RequireStaff>.');
  return staff;
}

/** The server decides who you are (GET /staff/me). Nothing here trusts router state or the URL. */
export function RequireStaff({ role, children }: { role?: 'superadmin'; children: ReactNode }) {
  const location = useLocation();
  const profile = useLoad(() => api.getStaffProfile(), [location.pathname]);

  if (profile.loading && !profile.data) return <div className="ap-page"><p className="ap-table-empty">Loading…</p></div>;

  const user = profile.data?.user;
  if (!user) return <Navigate to="/admin-login" replace />;
  if (role === 'superadmin' && user.role !== 'superadmin') return <Navigate to="/student-management" replace />;

  return <StaffContext.Provider value={user}>{children}</StaffContext.Provider>;
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="ap-empty" role="alert">
      <h3>Something went wrong</h3>
      <p>{message}</p>
      <div className="ap-button-row center">
        <button type="button" className="ap-button dark" onClick={onRetry}>Try again</button>
      </div>
    </section>
  );
}

export function ClassFilter({ classes, value, onChange }: { classes: ClassRow[]; value: number | 'all'; onChange: (next: number | 'all') => void }) {
  return (
    <span className="ap-select compact">
      <select value={value} aria-label="Filter by class" onChange={(event) => onChange(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
        <option value="all">All classes</option>
        {classes.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Student management                                                  */
/* ------------------------------------------------------------------ */

export function StudentManagementPage() {
  const navigate = useNavigate();
  const showMessage = useMessageModal();
  const staff = useStaff();
  const isAdmin = staff.role === 'superadmin';

  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [classId, setClassId] = useState<number | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const debounced = useDebounced(query);

  // The shell's search box navigates here with ?q=; follow it when it changes.
  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const classes = useLoad(() => api.listClasses(), []);
  const students = useLoad(
    () => api.listStudents({ q: debounced, classId: classId === 'all' ? undefined : classId, status }),
    [debounced, classId, status],
  );

  const rows = students.data?.students ?? [];
  const filtering = Boolean(debounced) || classId !== 'all' || status !== 'all';

  const toggleActive = async (student: AdminStudent) => {
    const next = !student.active;
    const verb = next ? 'reactivate' : 'deactivate';
    if (!window.confirm(`Do you want to ${verb} ${student.firstName} ${student.lastName}?${next ? '' : ' Their parent will no longer be able to sign in.'}`)) return;

    setBusyId(student.id);
    try {
      await api.updateStudent(student.id, { active: next });
      students.reload();
    } catch (caught) {
      showMessage(errorText(caught));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell section="students" title="Student Management">
      <div className="ap-page wide">
        <AdminPageHeader
          title="Student Management"
          subtitle="Manage student profiles, class assignments, and account access."
          action={isAdmin ? (
            <div className="ap-button-row">
              <button type="button" className="ap-button light" onClick={() => navigate('/student-import')}>
                <Icon name="upload" size={15} />
                Import register
              </button>
              <button type="button" className="ap-button dark" onClick={() => navigate('/student-add')}>
                <Icon name="plus" size={15} />
                Add student
              </button>
            </div>
          ) : undefined}
        />

        {students.error ? (
          <LoadError message={students.error} onRetry={students.reload} />
        ) : !students.loading && rows.length === 0 && !filtering ? (
          <section className="ap-empty">
            <span className="ap-empty-icon"><Icon name="users" size={22} /></span>
            <h3>No students in the system</h3>
            <p>{isAdmin ? 'Add a student manually or import your school’s register to get started.' : 'No students are assigned to your classes yet.'}</p>
            {isAdmin && (
              <div className="ap-button-row center">
                <button type="button" className="ap-button dark" onClick={() => navigate('/student-add')}>
                  <Icon name="plus" size={15} />
                  Add student manually
                </button>
                <button type="button" className="ap-button light" onClick={() => navigate('/student-import')}>
                  <Icon name="upload" size={15} />
                  Import CSV register
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="ap-panel" aria-busy={students.loading}>
            <div className="ap-panel-head">
              <div>
                <p className="ap-kicker">School register</p>
                <h3 className="ap-panel-title">All students</h3>
                <p className="ap-panel-note">{students.loading ? 'Loading…' : `Showing ${rows.length} of ${students.data?.total ?? 0} records`}</p>
              </div>
              <div className="ap-panel-controls">
                <InlineSearch value={query} onChange={setQuery} placeholder="Search name or admission number" />
                <ClassFilter classes={classes.data?.classes ?? []} value={classId} onChange={setClassId} />
                <span className="ap-select compact">
                  <select value={status} aria-label="Filter by status" onChange={(event) => setStatus(event.target.value as typeof status)}>
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </span>
              </div>
            </div>

            <div className="ap-table students" role="table" aria-label="Students">
              <div className="ap-table-head" role="row">
                <span role="columnheader">Student</span>
                <span role="columnheader">Admission number</span>
                <span role="columnheader">Assigned class</span>
                <span role="columnheader">Account status</span>
                <span role="columnheader" className="sr-only">Actions</span>
              </div>

              {!students.loading && rows.length === 0 && <p className="ap-table-empty">No students match your search.</p>}

              {rows.map((student) => (
                <div key={student.id} className="ap-table-row" role="row">
                  <span role="cell" className="ap-person"><Initials name={`${student.firstName} ${student.lastName}`} /><strong>{student.firstName} {student.lastName}</strong></span>
                  <span role="cell">{student.admissionNumber}</span>
                  <span role="cell">{student.className}</span>
                  <span role="cell"><Pill tone={student.active ? 'success' : 'muted'}>{student.active ? 'Active' : 'Inactive'}</Pill></span>
                  <span role="cell" className="ap-row-actions">
                    {isAdmin ? (
                      <>
                        <button type="button" className="ap-text-action" onClick={() => navigate(`/student-edit/${student.id}`)}>Edit</button>
                        <button
                          type="button"
                          className={student.active ? 'ap-text-action danger' : 'ap-text-action'}
                          disabled={busyId === student.id}
                          onClick={() => toggleActive(student)}
                        >
                          {student.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </>
                    ) : (
                      <span className="ap-text-muted">View only</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* Import (CSV only: Excel needs server-side parsing, see notes)       */
/* ------------------------------------------------------------------ */

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

/** CSV is sent as text; Excel (.xlsx) is sent as base64 and parsed on the server. */
export async function readTableFile(file: File): Promise<TableInput> {
  if (file.name.toLowerCase().endsWith('.xlsx')) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    const chunk = 0x8000;
    for (let index = 0; index < buffer.length; index += chunk) {
      binary += String.fromCharCode(...buffer.subarray(index, index + chunk));
    }
    return { xlsxBase64: btoa(binary) };
  }
  return { csv: await file.text() };
}

export function isAcceptedTableFile(file: File): string {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx')) return 'Choose a CSV or Excel (.xlsx) file.';
  if (file.size > MAX_IMPORT_BYTES) return 'That file is larger than 2 MB. Split it into smaller files.';
  return '';
}

export function StudentImportPage() {
  const navigate = useNavigate();
  const showMessage = useMessageModal();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [payload, setPayload] = useState<TableInput | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const choose = async (candidate: File | undefined) => {
    if (!candidate) return;
    setPreview(null);
    setError('');

    const problem = isAcceptedTableFile(candidate);
    if (problem) {
      setFile(null);
      setError(problem);
      return;
    }

    setBusy(true);
    try {
      const input = await readTableFile(candidate);
      const result = await api.previewStudentImport(input);
      setFile(candidate);
      setPayload(input);
      setPreview(result);
    } catch (caught) {
      setFile(null);
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!payload || busy) return;
    setBusy(true);
    try {
      const result = await api.commitStudentImport(payload);
      showMessage(`${result.inserted} students imported. Skipped: ${result.skippedDuplicates} duplicates, ${result.skippedUnknownClass} unknown classes, ${result.skippedInvalidPhone} invalid phone numbers.`);
      navigate('/student-management');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell section="students" title="Student Management">
      <div className="ap-page narrow">
        <AdminPageHeader
          title="Import student register"
          subtitle="Add existing student records from a CSV or Excel register."
          backLabel="Back to student management"
          onBack={() => navigate('/student-management')}
        />

        <section className="ap-card">
          <p className="ap-kicker">Bulk import</p>
          <h3 className="ap-card-title">Upload your student register</h3>
          <p className="ap-card-note">Required columns: First name, Last name, Admission number, Class, Parent phone number. Other columns are ignored and never stored. Classes must already exist.</p>

          <div className={file ? 'ap-dropzone has-file' : 'ap-dropzone'}>
            <span className="ap-dropzone-icon"><Icon name={file ? 'check' : 'upload'} size={18} /></span>
            <p className="ap-dropzone-title">{file ? file.name : 'Choose a register to upload'}</p>
            <p className="ap-dropzone-note">{busy ? 'Checking file…' : 'CSV or Excel (.xlsx) files up to 2 MB'}</p>
            <button type="button" className="ap-text-link" disabled={busy} onClick={() => inputRef.current?.click()}>
              {file ? 'Choose a different file' : 'Browse files'}
            </button>
            <input ref={inputRef} type="file" accept=".csv,.xlsx" hidden onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
          </div>

          {error && <p className="ap-field-error block" role="alert">{error}</p>}

          {preview && (
            <div className="ap-note-box">
              <strong>Ready to import {preview.counts.new} students</strong>
              <span>
                Will be skipped: {preview.counts.duplicate} duplicate admission numbers, {preview.counts.unknownClass} rows with a class that doesn’t exist, {preview.counts.invalidPhone} rows with an invalid phone number
                {preview.counts.invalid > 0 ? `, ${preview.counts.invalid} rows missing required fields` : ''}.
              </span>
              {preview.errors.slice(0, 5).map((message) => <span key={message}>{message}</span>)}
            </div>
          )}

          <FormFooter>
            <button type="button" className="ap-button light" onClick={() => navigate('/student-management')}>Cancel</button>
            <button type="button" className="ap-button dark" disabled={!preview || preview.counts.new === 0 || busy} onClick={commit}>
              {busy ? 'Working…' : 'Import register'}
              <Icon name="arrowRight" size={16} />
            </button>
          </FormFooter>
        </section>
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* Add / edit student                                                  */
/* ------------------------------------------------------------------ */

type FormState = { firstName: string; lastName: string; admissionNumber: string; classId: string; parentPhone: string; active: boolean };
const emptyForm: FormState = { firstName: '', lastName: '', admissionNumber: '', classId: '', parentPhone: '', active: true };

export function StudentFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const navigate = useNavigate();
  const showMessage = useMessageModal();
  const params = useParams();
  const studentId = mode === 'edit' ? Number(params.id) : null;

  const classes = useLoad(() => api.listClasses(), []);
  const existing = useLoad(() => (studentId ? api.getStudent(studentId) : Promise.resolve(null)), [studentId]);
  const details = useLoad(() => (studentId ? api.getStudentDetails(studentId) : Promise.resolve(null)), [studentId]);

  
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState<SubjectStream>('custom');
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([]);

  useEffect(() => {
    const rows = details.data?.summary?.subjects ?? [];
    if (!Array.isArray(rows) || rows.length === 0) {
      setSubjectRows([]);
      setStream('custom');
      return;
    }

    const normalized = normalizeSubjectRows(rows);
    setSubjectRows(normalized);

    const firstSubject = normalized[0]?.subject ?? '';
    const detected = (Object.keys(SUBJECT_PRESETS) as Array<keyof typeof SUBJECT_PRESETS>).find((key) =>
      SUBJECT_PRESETS[key].includes(firstSubject),
    );
    setStream(detected ?? 'custom');
  }, [details.data?.summary]);

  const updateSubjectRow = (index: number, patch: Partial<SubjectRow>) => {
    setSubjectRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, ...patch };
        const total = Number(next.ca1 ?? 0) + Number(next.ca2 ?? 0) + Number(next.exam ?? 0);
        return { ...next, total, grade: gradeForScore(total) };
      }),
    );
  };

  const applyStreamPreset = (nextStream: SubjectStream) => {
    setStream(nextStream);

    if (nextStream === 'custom') {
      setSubjectRows((current) => {
        if (current.length > 0) return current;
        return [{ subject: 'English Language', ca1: 0, ca2: 0, exam: 0, total: 0, grade: 'F' }];
      });
      return;
    }

    setSubjectRows(
      SUBJECT_PRESETS[nextStream].map((subject) => ({
        subject,
        ca1: 0,
        ca2: 0,
        exam: 0,
        total: 0,
        grade: 'F',
      })),
    );
  };


  useEffect(() => {
    const student = existing.data?.student;
    if (student) {
      setForm({
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        classId: String(student.classId),
        parentPhone: student.parentPhone,
        active: student.active,
      });
    }
  }, [existing.data]);

  const profile = details.data?.student ?? existing.data?.student ?? null;
  const summary = details.data?.summary ?? null;
  const history = details.data?.history ?? [];
  const allStudents = useLoad(() => (profile ? api.listStudents({ classId: profile.classId }) : Promise.resolve({ students: [], total: 0 })), [profile?.classId]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = 'Enter the first name.';
    if (!form.lastName.trim()) next.lastName = 'Enter the last name.';
    if (form.admissionNumber.trim().length < 3) next.admissionNumber = 'Enter the admission number.';
    if (!form.classId) next.classId = 'Choose a class.';
    if (!form.parentPhone.trim()) next.parentPhone = 'Enter the parent’s phone number.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      admissionNumber: form.admissionNumber,
      classId: Number(form.classId),
      parentPhone: form.parentPhone,
      active: form.active,
    };

    setBusy(true);
    try {
      if (studentId) await api.updateStudent(studentId, payload);
      else await api.createStudent(payload);
      navigate('/student-management');
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length > 0) setErrors(caught.fieldErrors);
      else showMessage(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const field = (id: keyof FormState, label: string, props: { placeholder?: string; inputMode?: 'tel' } = {}) => (
    <div className="ap-field">
      <label htmlFor={`student-${id}`}>{label} <b aria-hidden="true">*</b></label>
      <input
        id={`student-${id}`}
        type={id === 'parentPhone' ? 'tel' : 'text'}
        value={form[id] as string}
        placeholder={props.placeholder}
        aria-invalid={Boolean(errors[id]) || undefined}
        onChange={(event) => update(id, event.target.value as never)}
      />
      {errors[id] && <span className="ap-field-error">{errors[id]}</span>}
    </div>
  );

  if (mode === 'edit' && existing.error) return <AdminShell section="students" title="Student Management"><div className="ap-page wide"><LoadError message={existing.error} onRetry={existing.reload} /></div></AdminShell>;
  if (mode === 'add' && classes.error) return <AdminShell section="students" title="Student Management"><div className="ap-page narrow"><LoadError message={classes.error} onRetry={classes.reload} /></div></AdminShell>;

  if (mode === 'add') {
    return (
      <AdminShell section="students" title="Student Management">
        <div className="ap-page narrow">
          <AdminPageHeader
            title="Add a student"
            subtitle="Create a student profile and assign them to a class."
            backLabel="Back to student management"
            onBack={() => navigate('/student-management')}
          />

          <form className="ap-card" onSubmit={handleSubmit} noValidate>
            <p className="ap-kicker">Student information</p>
            <h3 className="ap-card-title">New student details</h3>
            <p className="ap-card-note">All fields are required to create a complete school record.</p>

            <div className="ap-form-grid">
              {field('firstName', 'First name', { placeholder: 'e.g. Adaeze' })}
              {field('lastName', 'Last name', { placeholder: 'e.g. Obi' })}
              {field('admissionNumber', 'Admission number', { placeholder: 'e.g. SCH/2026/0001' })}

              <div className="ap-field">
                <label htmlFor="student-classId">Class assignment <b aria-hidden="true">*</b></label>
                <span className="ap-select">
                  <select id="student-classId" value={form.classId} aria-invalid={Boolean(errors.classId) || undefined} onChange={(event) => update('classId', event.target.value)}>
                    <option value="" disabled>Select class</option>
                    {(classes.data?.classes ?? []).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </span>
                {errors.classId && <span className="ap-field-error">{errors.classId}</span>}
              </div>

              {field('parentPhone', 'Parent phone number', { placeholder: '08031234567' })}

              <div className="ap-field">
                <label htmlFor="student-active">Account status</label>
                <span className="ap-select">
                  <select id="student-active" value={form.active ? 'Active' : 'Inactive'} onChange={(event) => update('active', event.target.value === 'Active')}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </span>
              </div>
            </div>

            <FormFooter>
              <button type="button" className="ap-button light" onClick={() => navigate('/student-management')}>Cancel</button>
              <button type="submit" className="ap-button dark" disabled={busy}>
                {busy ? 'Saving…' : 'Add student'}
                <Icon name="arrowRight" size={16} />
              </button>
            </FormFooter>
          </form>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell section="students" title="Student Management">
      <div className="ap-page wide">
        <AdminPageHeader
          title={profile ? `${profile.firstName} ${profile.lastName}` : 'Student details'}
          subtitle={profile ? `Admission number: ${profile.admissionNumber} · ${profile.className}` : 'Student details'}
          backLabel="Back to student management"
          onBack={() => navigate('/student-management')}
        />

        {details.error ? (
          <LoadError message={details.error} onRetry={details.reload} />
        ) : profile && (
          <>
            {summary?.principalNotificationRequired && (
              <section className="ap-note-box" role="status">
                <strong>Principal review required:</strong>
                <span>Final examination data has been added for this student. Please notify the principal or headmaster to add the final teacher/principal comments.</span>
              </section>
            )}

            <section className="ap-card">
              <div className="ap-panel-head">
                <div>
                  <p className="ap-kicker">Student record</p>
                  <h3 className="ap-panel-title">Edit profile</h3>
                </div>
              </div>

              <form className="ap-form-grid" onSubmit={handleSubmit} noValidate>
                {field('firstName', 'First name', { placeholder: 'e.g. Adaeze' })}
                {field('lastName', 'Last name', { placeholder: 'e.g. Obi' })}
                {field('admissionNumber', 'Admission number', { placeholder: 'e.g. SCH/2026/0001' })}

                <div className="ap-field">
                  <label htmlFor="student-classId">Class assignment <b aria-hidden="true">*</b></label>
                  <span className="ap-select">
                    <select id="student-classId" value={form.classId} aria-invalid={Boolean(errors.classId) || undefined} onChange={(event) => update('classId', event.target.value)}>
                      <option value="" disabled>Select class</option>
                      {(classes.data?.classes ?? []).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </span>
                  {errors.classId && <span className="ap-field-error">{errors.classId}</span>}
                </div>

                {field('parentPhone', 'Parent phone number', { placeholder: '08031234567' })}

                <div className="ap-field">
                  <label htmlFor="student-active">Account status</label>
                  <span className="ap-select">
                    <select id="student-active" value={form.active ? 'Active' : 'Inactive'} onChange={(event) => update('active', event.target.value === 'Active')}>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </span>
                </div>

                <div className="ap-form-footer" style={{ gridColumn: '1 / -1' }}>
                  <button type="button" className="ap-button light" onClick={() => navigate('/student-management')}>Cancel</button>
                  <button type="submit" className="ap-button dark" disabled={busy || details.loading}>
                    {busy ? 'Saving…' : 'Save changes'}
                    <Icon name="arrowRight" size={16} />
                  </button>
                </div>
              </form>
            </section>

            <div className="ap-stat-grid four">
              <div className="ap-stat plain"><span className="ap-stat-label">Weighted average</span><strong className="serif">{summary?.weightedAverage ?? 0}</strong><small>Current term</small></div>
              <div className="ap-stat plain"><span className="ap-stat-label">Term score</span><strong className="serif">{summary?.termScore ?? 0}</strong><small>Across all subjects</small></div>
              <div className="ap-stat plain"><span className="ap-stat-label">Attendance</span><strong className="serif">{summary?.attendance ? `${summary.attendance.daysPresent}/${summary.attendance.schoolDays}` : '0/0'}</strong><small>Present / school days</small></div>
              <div className="ap-stat plain"><span className="ap-stat-label">Absence</span><strong className="serif">{summary?.attendance?.daysAbsent ?? 0}</strong><small>Days absent</small></div>
            </div>

            <section className="ap-panel">
              <div className="ap-panel-head">
                <div>
                  <p className="ap-kicker">Academic summary</p>
                  <h3 className="ap-panel-title">Current subject performance</h3>
                </div>

                <div className="ap-panel-controls">
                  <span className="ap-select compact">
                    <select
                      value={stream}
                      aria-label="Subject stream"
                      onChange={(event) => applyStreamPreset(event.target.value as SubjectStream)}
                    >
                      <option value="custom">Custom</option>
                      <option value="science">Science</option>
                      <option value="arts">Arts</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </span>
                </div>
              </div>

              <div className="ap-table students" role="table" aria-label="Editable subject summary">
                <div className="ap-table-head" role="row">
                  <span role="columnheader">Subject</span>
                  <span role="columnheader">CA1</span>
                  <span role="columnheader">CA2</span>
                  <span role="columnheader">Exam</span>
                  <span role="columnheader">Total</span>
                  <span role="columnheader">Grade</span>
                </div>

                {subjectRows.length === 0 ? (
                  <p className="ap-table-empty">No result data has been uploaded yet for this student.</p>
                ) : (
                  subjectRows.map((item, index) => {
                    const presetOptions = getPresetSubjects(stream === 'custom' ? 'science' : stream);

                    return (
                      <div key={`${item.subject}-${index}`} className="ap-table-row" role="row">
                        <span role="cell">
                          <select
                            value={item.subject}
                            onChange={(event) => updateSubjectRow(index, { subject: event.target.value })}
                            style={{ width: '100%' }}
                          >
                            {(stream === 'custom'
                              ? [...new Set([...presetOptions, item.subject])]
                              : getPresetSubjects(stream)
                            ).map((subject) => (
                              <option key={subject} value={subject}>{subject}</option>
                            ))}
                          </select>
                        </span>

                        <span role="cell">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.ca1}
                            onChange={(event) => updateSubjectRow(index, { ca1: Number(event.target.value) })}
                          />
                        </span>

                        <span role="cell">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.ca2}
                            onChange={(event) => updateSubjectRow(index, { ca2: Number(event.target.value) })}
                          />
                        </span>

                        <span role="cell">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.exam}
                            onChange={(event) => updateSubjectRow(index, { exam: Number(event.target.value) })}
                          />
                        </span>

                        <span role="cell">{item.total}</span>
                        <span role="cell">{item.grade}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="ap-form-footer" style={{ marginTop: 18 }}>
                <button type="button" className="ap-button light" onClick={() => applyStreamPreset('custom')}>
                  Custom subjects
                </button>
                <button type="button" className="ap-button dark" onClick={() => { }}>
                  Save changes
                </button>
              </div>
            </section>

            <section className="ap-panel">
              <div className="ap-panel-head">
                <div>
                  <p className="ap-kicker">Student conduct</p>
                  <h3 className="ap-panel-title">Attendance, behaviour and co-curricular</h3>
                </div>
              </div>
              <div className="ap-form-grid">
                <div className="ap-field">
                  <label>Teacher’s conduct comment</label>
                  <textarea value={summary?.conductComment ?? 'No teacher comment recorded yet.'} readOnly rows={3} />
                </div>
                <div className="ap-field">
                  <label>Absence reasons</label>
                  <textarea value={(summary?.absenceReasons.length ?? 0) ? summary!.absenceReasons.join('; ') : 'No recorded reasons for absence.'} readOnly rows={3} />
                </div>
                <div className="ap-field">
                  <label>Sport participation</label>
                  <textarea value={(summary?.sports?.length ?? 0) ? summary!.sports.map((sport) => `${sport.activity}: ${sport.comment ?? 'No comment yet'}`).join('\n') : 'No sports activity recorded.'} readOnly rows={4} />
                </div>
                <div className="ap-field">
                  <label>Club / youth organization participation</label>
                  <textarea value={(summary?.clubs?.length ?? 0) ? summary!.clubs.map((club) => `${club.organization} · ${club.officeHeld ?? 'Member'} · ${club.contributions ?? 'No contribution noted'}`).join('\n') : 'No club or youth organization data recorded.'} readOnly rows={4} />
                </div>
              </div>
            </section>

            <section className="ap-panel">
              <div className="ap-panel-head">
                <div>
                  <p className="ap-kicker">Academic history</p>
                  <h3 className="ap-panel-title">Old term / year results</h3>
                </div>
              </div>

              <div className="ap-table students" role="table" aria-label="Old term results history">
                <div className="ap-table-head" role="row">
                  <span role="columnheader">Term</span>
                  <span role="columnheader">Session</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Weighted average</span>
                  <span role="columnheader">Term score</span>
                </div>
                {history.length === 0 ? (
                  <p className="ap-table-empty">No prior term data is available for this student.</p>
                ) : (
                  history.map((term) => (
                    <div key={`${term.termName}-${term.session}`} className="ap-table-row" role="row">
                      <span role="cell">{term.termName}</span>
                      <span role="cell">{term.session}</span>
                      <span role="cell"><Pill tone={term.status === 'published' ? 'success' : 'muted'}>{term.status}</Pill></span>
                      <span role="cell">{term.weightedAverage}</span>
                      <span role="cell">{term.termScore}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="ap-panel">
              <div className="ap-panel-head">
                <div>
                  <p className="ap-kicker">Class roster</p>
                  <h3 className="ap-panel-title">All students in this class</h3>
                </div>
              </div>

              <div className="ap-table students" role="table" aria-label="Class roster">
                <div className="ap-table-head" role="row">
                  <span role="columnheader">Student</span>
                  <span role="columnheader">Admission number</span>
                  <span role="columnheader">Status</span>
                </div>
                {(allStudents.data?.students ?? []).length === 0 ? (
                  <p className="ap-table-empty">No classmates are registered in this class yet.</p>
                ) : (
                  (allStudents.data?.students ?? []).map((studentRow) => (
                    <div key={studentRow.id} className="ap-table-row" role="row">
                      <span role="cell" className="ap-person"><Initials name={`${studentRow.firstName} ${studentRow.lastName}`} /><strong>{studentRow.firstName} {studentRow.lastName}</strong></span>
                      <span role="cell">{studentRow.admissionNumber}</span>
                      <span role="cell"><Pill tone={studentRow.active ? 'success' : 'muted'}>{studentRow.active ? 'Active' : 'Inactive'}</Pill></span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* Access codes                                                        */
/* ------------------------------------------------------------------ */

// Spreadsheet apps run cells that start with these characters as formulas.
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Codes exist in plaintext only here, once. Leaving this screen discards them. */
function CodeReveal({ codes, onDone }: { codes: IssuedCode[]; onDone: () => void }) {
  const [saved, setSaved] = useState(false);

  const download = () => {
    const lines = ['Admission number,Name,Class,Access code', ...codes.map((c) => [c.admissionNumber, c.name, c.className, c.code].map(csvCell).join(','))];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'access-codes.csv';
    link.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.map((c) => `${c.admissionNumber}\t${c.name}\t${c.code}`).join('\n'));
      setSaved(true);
    } catch {
      /* clipboard can be blocked; the download button still works */
    }
  };

  return (
    <section className="ap-card">
      <p className="ap-kicker">New access codes</p>
      <h3 className="ap-card-title">{codes.length} code{codes.length === 1 ? '' : 's'} generated</h3>
      <div className="ap-warning" role="note">
        <span className="ap-warning-icon">!</span>
        <div>
          <strong>These codes are shown only once</strong>
          <p>Save or download them now. They cannot be viewed again; you can only generate replacements.</p>
        </div>
      </div>

      <ul className="ap-picker" aria-label="Generated codes">
        {codes.map((item) => (
          <li key={item.studentId}>
            <div className="ap-picker-row">
              <Initials name={item.name} />
              <span>
                <strong>{item.name}</strong>
                <small>{item.admissionNumber} · {item.className}</small>
              </span>
              <code style={{ marginLeft: 'auto', letterSpacing: '0.12em', fontWeight: 600 }}>{item.code}</code>
            </div>
          </li>
        ))}
      </ul>

      <FormFooter>
        <button type="button" className="ap-button light" onClick={copy}>Copy all</button>
        <button type="button" className="ap-button light" onClick={download}>Download CSV</button>
        <button type="button" className="ap-button dark" disabled={!saved} onClick={onDone}>I’ve saved these codes</button>
      </FormFooter>
    </section>
  );
}

export function AccessCodeManagementPage() {
  const navigate = useNavigate();
  const status = useLoad(() => api.listAccessStatus(), []);
  const [query, setQuery] = useState('');
  const [classId, setClassId] = useState<number | 'all'>('all');

  const all = status.data?.students ?? [];
  const classes = useMemo(() => {
    const map = new Map<number, string>();
    all.forEach((row) => map.set(row.classId, row.className));
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);

  const needle = query.trim().toLowerCase();
  const rows = all.filter((row) => (classId === 'all' || row.classId === classId) && (!needle || `${row.name} ${row.admissionNumber}`.toLowerCase().includes(needle)));
  const generated = all.filter((row) => row.codeGenerated).length;

  return (
    <AdminShell section="codes" title="Access Codes">
      <div className="ap-page wide">
        <AdminPageHeader
          eyebrow="Parent portal access"
          title="Access Code Management"
          subtitle="Generate and monitor secure parent access without exposing active codes."
          action={<button type="button" className="ap-button dark" onClick={() => navigate('/access-codes-generate')}>Generate class codes</button>}
        />

        {status.error ? (
          <LoadError message={status.error} onRetry={status.reload} />
        ) : (
          <>
            <div className="ap-stat-grid three">
              <div className="ap-stat plain"><span className="ap-stat-label">Active students</span><strong className="serif">{all.length}</strong><small>Across {classes.length} classes</small></div>
              <div className="ap-stat plain"><span className="ap-stat-label">Codes generated</span><strong className="serif">{generated}</strong><small>Shown once, then never again</small></div>
              <div className="ap-stat plain"><span className="ap-stat-label">Not generated</span><strong className="serif">{all.length - generated}</strong><small>Students still requiring access</small></div>
            </div>

            <section className="ap-panel" aria-busy={status.loading}>
              <div className="ap-panel-head">
                <div>
                  <p className="ap-kicker">Student access</p>
                  <h3 className="ap-panel-title">Access-code status</h3>
                  <p className="ap-panel-note">{status.loading ? 'Loading…' : `Showing ${rows.length} of ${all.length} students`}</p>
                </div>
                <div className="ap-panel-controls">
                  <InlineSearch value={query} onChange={setQuery} placeholder="Search name or admission number" />
                  <ClassFilter classes={classes} value={classId} onChange={setClassId} />
                </div>
              </div>

              <div className="ap-table codes" role="table" aria-label="Access-code status">
                <div className="ap-table-head" role="row">
                  <span role="columnheader">Student</span>
                  <span role="columnheader">Admission number</span>
                  <span role="columnheader">Assigned class</span>
                  <span role="columnheader">Access-code status</span>
                  <span role="columnheader">Last generated</span>
                  <span role="columnheader" className="sr-only">Actions</span>
                </div>
                {!status.loading && rows.length === 0 && <p className="ap-table-empty">No students match your search.</p>}
                {rows.map((student) => (
                  <div key={student.id} className="ap-table-row" role="row">
                    <span role="cell" className="ap-person"><Initials name={student.name} /><strong>{student.name}</strong></span>
                    <span role="cell">{student.admissionNumber}</span>
                    <span role="cell">{student.className}</span>
                    <span role="cell"><Pill tone={student.codeGenerated ? 'success' : 'muted'}>{student.codeGenerated ? 'Generated' : 'Not generated'}</Pill></span>
                    <span role="cell">{student.lastGenerated ? new Date(student.lastGenerated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                    <span role="cell" className="ap-row-actions">
                      <button type="button" className="ap-text-action" onClick={() => navigate('/access-codes-individual', { state: { studentId: student.id } })}>
                        {student.codeGenerated ? 'Regenerate' : 'Generate code'}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

export function GenerateClassCodesPage() {
  const navigate = useNavigate();
  const status = useLoad(() => api.listAccessStatus(), []);
  const [classId, setClassId] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [codes, setCodes] = useState<IssuedCode[] | null>(null);

  const all = status.data?.students ?? [];
  const classes = useMemo(() => {
    const map = new Map<number, string>();
    all.forEach((row) => map.set(row.classId, row.className));
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);

  const selected = classId ?? classes[0]?.id ?? null;
  const className = classes.find((item) => item.id === selected)?.name ?? '';
  const members = all.filter((row) => row.classId === selected);
  const replacing = members.filter((row) => row.codeGenerated).length;

  const generate = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      setCodes((await api.issueClassCodes(selected)).codes);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell section="codes" title="Access Codes">
      <div className="ap-page narrow">
        <AdminPageHeader
          title="Generate Class Codes"
          subtitle="Issue new parent portal login credentials for an entire class."
          backLabel="Back to Access Code Management"
          onBack={() => navigate('/access-codes')}
        />

        {codes ? (
          <CodeReveal codes={codes} onDone={() => navigate('/access-codes')} />
        ) : status.error ? (
          <LoadError message={status.error} onRetry={status.reload} />
        ) : (
          <section className="ap-card">
            <p className="ap-kicker">Class-wide generation</p>
            <h3 className="ap-card-title tight">Select a class</h3>

            <div className="ap-field spaced">
              <label htmlFor="class-assignment">Class assignment</label>
              <span className="ap-select">
                <select id="class-assignment" value={selected ?? ''} onChange={(event) => { setClassId(Number(event.target.value)); setConfirmed(false); }}>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </span>
            </div>

            <div className="ap-metric-pair">
              <div className="ap-metric"><span>Students receiving new codes</span><strong className="serif">{members.length}</strong></div>
              <div className="ap-metric"><span>Existing codes being replaced</span><strong className="serif">{replacing}</strong></div>
            </div>

            <div className="ap-warning" role="note">
              <span className="ap-warning-icon">!</span>
              <div>
                <strong>This action issues new login credentials</strong>
                <p>Any existing access code for a student in {className || 'this class'} will stop working immediately. The new codes are displayed once.</p>
              </div>
            </div>

            <label className="ap-consent">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>I understand that this will replace existing credentials and that the new codes are shown only once.</span>
            </label>

            {error && <p className="ap-field-error block" role="alert">{error}</p>}

            <FormFooter>
              <button type="button" className="ap-button light" onClick={() => navigate('/access-codes')}>Cancel</button>
              <button type="button" className="ap-button dark" disabled={!confirmed || members.length === 0 || busy} onClick={generate}>
                {busy ? 'Generating…' : 'Generate Codes'}
                <Icon name="arrowRight" size={16} />
              </button>
            </FormFooter>
          </section>
        )}
      </div>
    </AdminShell>
  );
}

export function GenerateIndividualCodePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const status = useLoad(() => api.listAccessStatus(), []);
  const [selectedId, setSelectedId] = useState<number | null>((location.state as { studentId?: number } | null)?.studentId ?? null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [codes, setCodes] = useState<IssuedCode[] | null>(null);

  const all: AccessStatusRow[] = status.data?.students ?? [];
  const needle = query.trim().toLowerCase();
  const matches = all.filter((row) => !needle || `${row.name} ${row.admissionNumber}`.toLowerCase().includes(needle)).slice(0, 100);
  const selected = all.find((row) => row.id === selectedId) ?? null;

  const generate = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      setCodes((await api.issueStudentCode(selected.id)).codes);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell section="codes" title="Access Codes">
      <div className="ap-page medium">
        <AdminPageHeader
          title="Generate Individual Code"
          subtitle="Find a student and issue new parent portal login credentials for their account."
          backLabel="Back to Access Code Management"
          onBack={() => navigate('/access-codes')}
        />

        {codes ? (
          <CodeReveal codes={codes} onDone={() => navigate('/access-codes')} />
        ) : status.error ? (
          <LoadError message={status.error} onRetry={status.reload} />
        ) : (
          <div className="ap-split">
            <section className="ap-card">
              <p className="ap-kicker">Select student</p>
              <h3 className="ap-card-title">Find a student account</h3>
              <InlineSearch className="field" value={query} onChange={setQuery} placeholder="Search name or admission number" />

              <ul className="ap-picker" aria-label="Students">
                {!status.loading && matches.length === 0 && <li className="ap-picker-empty">No students match your search.</li>}
                {matches.map((student) => (
                  <li key={student.id}>
                    <button type="button" className={student.id === selectedId ? 'ap-picker-row selected' : 'ap-picker-row'} aria-pressed={student.id === selectedId} onClick={() => setSelectedId(student.id)}>
                      <Initials name={student.name} />
                      <span><strong>{student.name}</strong><small>{student.admissionNumber} · {student.className}</small></span>
                      {student.id === selectedId && <span className="ap-picker-check"><Icon name="check" size={13} strokeWidth={2.2} /></span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="ap-card selected-card">
              <p className="ap-kicker center">Selected account</p>
              {selected ? (
                <>
                  <h3 className="ap-selected-name">{selected.name}</h3>
                  <dl className="ap-facts">
                    <div><dt>Admission number</dt><dd>{selected.admissionNumber}</dd></div>
                    <div><dt>Assigned class</dt><dd>{selected.className}</dd></div>
                    <div><dt>Current code status</dt><dd>{selected.codeGenerated ? 'Generated' : 'Not generated'}</dd></div>
                  </dl>
                  {selected.codeGenerated && <p className="ap-callout-warning">Generating a new code will replace this student’s existing login credential.</p>}
                </>
              ) : (
                <div className="ap-selected-empty"><strong>No student selected</strong><p>Choose a student from the list to review their account details.</p></div>
              )}

              {error && <p className="ap-field-error block" role="alert">{error}</p>}

              <div className="ap-selected-actions">
                <button type="button" className="ap-button light" onClick={() => navigate('/access-codes')}>Cancel</button>
                <button type="button" className="ap-button dark" disabled={!selected || busy} onClick={generate}>
                  {busy ? 'Generating…' : 'Generate Code'}
                  <Icon name="arrowRight" size={16} />
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
