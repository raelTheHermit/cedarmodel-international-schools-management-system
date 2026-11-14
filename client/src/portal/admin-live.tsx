import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import type { AccessStatusRow, AdminStudent, ClassRow, ImportPreview, IssuedCode, StaffUser } from '../api';
import { initialsOf } from './data';
import { Icon } from './icons';
import { useMessageModal } from './message-modal';
import { AdminPageHeader, AdminShell } from './shells';

function Initials({ name }: { name: string }) {
  return <span className="ap-initials" aria-hidden="true">{initialsOf(name)}</span>;
}

function InlineSearch({ value, onChange, placeholder, className = '' }: { value: string; onChange: (next: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={`ap-inline-search ${className}`.trim()}>
      <Icon name="search" size={15} />
      <input type="search" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Pill({ tone, children }: { tone: 'success' | 'muted'; children: ReactNode }) {
  return <span className={`ap-pill ${tone}`}><i />{children}</span>;
}

function FormFooter({ children }: { children: ReactNode }) {
  return <div className="ap-form-footer">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Hooks and guard                                                     */
/* ------------------------------------------------------------------ */

function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
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

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function errorText(caught: unknown) {
  return caught instanceof ApiError ? caught.message : 'We couldn’t reach the server. Check your connection and try again.';
}

const StaffContext = createContext<StaffUser | null>(null);

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

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
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

function ClassFilter({ classes, value, onChange }: { classes: ClassRow[]; value: number | 'all'; onChange: (next: number | 'all') => void }) {
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

  const [query, setQuery] = useState('');
  const [classId, setClassId] = useState<number | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const debounced = useDebounced(query);

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

export function StudentImportPage() {
  const navigate = useNavigate();
  const showMessage = useMessageModal();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const choose = async (candidate: File | undefined) => {
    if (!candidate) return;
    setPreview(null);
    setError('');

    if (!candidate.name.toLowerCase().endsWith('.csv')) {
      setFile(null);
      setError('Choose a CSV file. In Excel, use File → Save As → CSV.');
      return;
    }
    if (candidate.size > MAX_IMPORT_BYTES) {
      setFile(null);
      setError('That file is larger than 2 MB. Split the register and import it in parts.');
      return;
    }

    setBusy(true);
    try {
      const text = await candidate.text();
      const result = await api.previewStudentImport(text);
      setFile(candidate);
      setCsv(text);
      setPreview(result);
    } catch (caught) {
      setFile(null);
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!csv || busy) return;
    setBusy(true);
    try {
      const result = await api.commitStudentImport(csv);
      showMessage(`${result.inserted} students imported. ${result.skippedDuplicates} duplicates, ${result.skippedUnknownClass} rows with an unknown class, ${result.skippedInvalidPhone} rows with an invalid phone, and ${result.invalidRows} incomplete rows were skipped.`);
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
          subtitle="Add existing student records from a CSV register."
          backLabel="Back to student management"
          onBack={() => navigate('/student-management')}
        />

        <section className="ap-card">
          <p className="ap-kicker">Bulk import</p>
          <h3 className="ap-card-title">Upload your student register</h3>
          <p className="ap-card-note">Required columns: First name, Last name, Admission number, Class, Parent phone number. Other columns are ignored and never stored.</p>

          <div className={file ? 'ap-dropzone has-file' : 'ap-dropzone'}>
            <span className="ap-dropzone-icon"><Icon name={file ? 'check' : 'upload'} size={18} /></span>
            <p className="ap-dropzone-title">{file ? file.name : 'Choose a register to upload'}</p>
            <p className="ap-dropzone-note">{busy ? 'Checking file…' : 'CSV files up to 2 MB'}</p>
            <button type="button" className="ap-text-link" disabled={busy} onClick={() => inputRef.current?.click()}>
              {file ? 'Choose a different file' : 'Browse files'}
            </button>
            <input ref={inputRef} type="file" accept=".csv" hidden onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
          </div>

          {error && <p className="ap-field-error block" role="alert">{error}</p>}

          {preview && (
            <div className="ap-note-box">
              <strong>Ready to import {preview.counts.new} students</strong>
              <span>
                {preview.counts.duplicate} duplicate admission numbers and {preview.counts.unknownClass} rows with a class that doesn’t exist will be skipped.
                {preview.counts.invalidPhone > 0 && ` ${preview.counts.invalidPhone} rows have an invalid parent phone number.`}
                {preview.counts.invalid > 0 && ` ${preview.counts.invalid} rows are missing required fields.`}
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

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

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

  if (existing.error) return <AdminShell section="students" title="Student Management"><div className="ap-page narrow"><LoadError message={existing.error} onRetry={existing.reload} /></div></AdminShell>;

  return (
    <AdminShell section="students" title="Student Management">
      <div className="ap-page narrow">
        <AdminPageHeader
          title={mode === 'edit' ? 'Edit student' : 'Add a student'}
          subtitle={mode === 'edit' ? 'Update this student’s record.' : 'Create a student profile and assign them to a class.'}
          backLabel="Back to student management"
          onBack={() => navigate('/student-management')}
        />

        <form className="ap-card" onSubmit={handleSubmit} noValidate>
          <p className="ap-kicker">Student information</p>
          <h3 className="ap-card-title">{mode === 'edit' ? 'Student details' : 'New student details'}</h3>
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
            <button type="submit" className="ap-button dark" disabled={busy || (mode === 'edit' && existing.loading)}>
              {busy ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add student'}
              <Icon name="arrowRight" size={16} />
            </button>
          </FormFooter>
        </form>
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
