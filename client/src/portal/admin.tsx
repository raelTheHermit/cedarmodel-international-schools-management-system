import { useMemo, useRef, useState } from 'react';
import type { DragEvent, FormEvent, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './icons';
import type { IconName } from './icons';
import { AdminPageHeader, AdminShell } from './shells';
import { useMessageModal } from './message-modal';
import {
  auditEntries,
  classOptions,
  initialsOf,
  portalStudents,
  resultReviews,
  resultUploads,
} from './data';
import type { PortalStudent } from './data';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * The server has no student, access-code or results endpoints yet. Actions that would change data
 * explain that instead of pretending to succeed.
 */
function useNotConnected() {
  const showMessage = useMessageModal();
  return (action: string) => showMessage(`${action} isn’t connected to the server yet, so nothing was changed.`);
}

const registerClasses = Array.from(new Set(portalStudents.map((student) => student.className)));

function useStudentFilter() {
  const [query, setQuery] = useState('');
  const [className, setClassName] = useState('All classes');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return portalStudents.filter((student) => {
      const matchesClass = className === 'All classes' || student.className === className;
      const matchesQuery = !needle || `${student.name} ${student.admissionNumber}`.toLowerCase().includes(needle);
      return matchesClass && matchesQuery;
    });
  }, [query, className]);

  return { query, setQuery, className, setClassName, rows };
}

function Initials({ name }: { name: string }) {
  return <span className="ap-initials" aria-hidden="true">{initialsOf(name)}</span>;
}

function InlineSearch({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={`ap-inline-search ${className}`.trim()}>
      <Icon name="search" size={15} />
      <input type="search" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ClassSelect({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <span className="ap-select compact">
      <select value={value} aria-label="Filter by class" onChange={(event) => onChange(event.target.value)}>
        <option>All classes</option>
        {registerClasses.map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
    </span>
  );
}

function Pill({ tone, children }: { tone: 'success' | 'muted'; children: ReactNode }) {
  return (
    <span className={`ap-pill ${tone}`}>
      <i />
      {children}
    </span>
  );
}

function FormFooter({ children }: { children: ReactNode }) {
  return <div className="ap-form-footer">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function SkeletonBar({ className = '' }: { className?: string }) {
  return <span className={`sk ${className}`.trim()} aria-hidden="true" />;
}

function OverviewSkeleton() {
  return (
    <div className="ap-page wide" aria-busy="true" aria-label="Loading overview">
      <div className="ap-sk-header">
        <div className="ap-sk-stack">
          <SkeletonBar className="line w-118" />
          <SkeletonBar className="block w-430 tall" />
          <SkeletonBar className="line w-365" />
        </div>
        <SkeletonBar className="block w-142 tall" />
      </div>

      <div className="ap-stat-grid four">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="ap-stat sk-card">
            <div className="ap-stat-top"><SkeletonBar className="line w-92" /><SkeletonBar className="square" /></div>
            <SkeletonBar className="block w-64" />
            <SkeletonBar className="line w-175" />
          </div>
        ))}
      </div>

      <div className="ap-overview-grid">
        <section className="ap-panel">
          <div className="ap-panel-head">
            <div className="ap-sk-stack"><SkeletonBar className="line w-118" /><SkeletonBar className="block w-196" /></div>
            <SkeletonBar className="line w-88" />
          </div>
          <div className="ap-activity">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="ap-activity-row">
                <SkeletonBar className="square" />
                <div className="ap-sk-stack grow"><SkeletonBar className="line w-230" /><SkeletonBar className="line w-165" /></div>
                <SkeletonBar className="line w-72" />
              </div>
            ))}
          </div>
        </section>

        <div className="ap-overview-side">
          <section className="ap-feature">
            <SkeletonBar className="line on-dark w-126" />
            <SkeletonBar className="block on-dark w-108" />
            <SkeletonBar className="line on-dark full" />
            <SkeletonBar className="line on-dark w-94" />
          </section>
          <section className="ap-panel ap-queue">
            <div className="ap-panel-head tight">
              <div className="ap-sk-stack"><SkeletonBar className="line w-118" /><SkeletonBar className="block w-104" /></div>
              <SkeletonBar className="pill w-52" />
            </div>
            <div className="ap-queue-row"><SkeletonBar className="line w-78" /><SkeletonBar className="line w-62" /></div>
            <div className="ap-queue-row"><SkeletonBar className="line w-78" /><SkeletonBar className="line w-62" /></div>
          </section>
        </div>
      </div>

      <section className="ap-panel">
        <div className="ap-panel-head">
          <div className="ap-sk-stack"><SkeletonBar className="line w-118" /><SkeletonBar className="block w-196" /></div>
        </div>
        <div className="ap-quick-grid">
          {[0, 1, 2, 3, 4].map((tile) => (
            <div key={tile} className="ap-quick sk-card">
              <SkeletonBar className="square" />
              <SkeletonBar className="line w-156" />
              <SkeletonBar className="line w-124" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AdminOverviewPage({ view = 'loaded' }: { view?: 'loaded' | 'loading' }) {
  const navigate = useNavigate();

  if (view === 'loading') {
    return (
      <AdminShell section="overview" title="Overview">
        <OverviewSkeleton />
      </AdminShell>
    );
  }

  const classCount = registerClasses.length;
  const generated = portalStudents.filter((student) => student.codeGenerated).length;
  const awaiting = resultReviews.filter((item) => item.status === 'Awaiting approval').length;
  const published = resultReviews.filter((item) => item.status === 'Published').length;

  const stats: Array<{ label: string; value: number; note: string; icon: IconName }> = [
    { label: 'Students', value: portalStudents.length, note: `Across ${classCount} classes`, icon: 'users' },
    { label: 'Access codes', value: generated, note: `${portalStudents.length - generated} still to issue`, icon: 'lock' },
    { label: 'Awaiting approval', value: awaiting, note: 'Result sets to review', icon: 'doc' },
    { label: 'Published', value: published, note: 'Visible to parents', icon: 'check' },
  ];

  const quickActions: Array<{ title: string; note: string; icon: IconName; to: string }> = [
    { title: 'Add a student', note: 'Create a new school record', icon: 'plus', to: '/student-add' },
    { title: 'Import register', note: 'Upload a CSV or Excel file', icon: 'upload', to: '/student-import' },
    { title: 'Generate class codes', note: 'Issue parent access for a class', icon: 'lock', to: '/access-codes-generate' },
    { title: 'Upload results', note: 'Add validated result sheets', icon: 'upload', to: '/results-upload' },
    { title: 'Review results', note: 'Approve sets before publishing', icon: 'doc', to: '/results-review' },
  ];

  return (
    <AdminShell section="overview" title="Overview">
      <div className="ap-page wide">
        <AdminPageHeader
          eyebrow="School dashboard"
          title="School overview"
          subtitle="Second term · 2025/2026 session"
          action={(
            <button type="button" className="ap-button dark" onClick={() => navigate('/results-review')}>
              Review results
              <Icon name="arrowRight" size={16} />
            </button>
          )}
        />

        <div className="ap-stat-grid four">
          {stats.map((stat) => (
            <div key={stat.label} className="ap-stat">
              <div className="ap-stat-top">
                <span>{stat.label}</span>
                <span className="ap-stat-icon"><Icon name={stat.icon} size={15} /></span>
              </div>
              <strong>{stat.value}</strong>
              <small>{stat.note}</small>
            </div>
          ))}
        </div>

        <div className="ap-overview-grid">
          <section className="ap-panel">
            <div className="ap-panel-head">
              <div>
                <p className="ap-kicker">Recent activity</p>
                <h3 className="ap-panel-title">Latest actions</h3>
              </div>
              <button type="button" className="ap-link" onClick={() => navigate('/audit-log')}>View audit log</button>
            </div>
            <ul className="ap-activity">
              {auditEntries.map((entry) => (
                <li key={entry.id} className="ap-activity-row">
                  <span className="ap-activity-icon"><Icon name="history" size={15} /></span>
                  <div className="grow">
                    <strong>{entry.title}</strong>
                    <small>{entry.owner}</small>
                  </div>
                  <span className="ap-activity-time">{entry.status}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="ap-overview-side">
            <section className="ap-feature">
              <p className="ap-feature-kicker">Term status</p>
              <p className="ap-feature-value">2nd Term</p>
              <p className="ap-feature-text">2025 / 2026 academic session</p>
              <small>Results reach parents only after approval.</small>
            </section>

            <section className="ap-panel ap-queue">
              <div className="ap-panel-head tight">
                <div>
                  <p className="ap-kicker">Results queue</p>
                  <h3 className="ap-panel-title small">This term</h3>
                </div>
                <span className="ap-tag">{resultReviews.length} sets</span>
              </div>
              <div className="ap-queue-row"><span>Awaiting approval</span><strong>{awaiting}</strong></div>
              <div className="ap-queue-row"><span>Published</span><strong>{published}</strong></div>
            </section>
          </div>
        </div>

        <section className="ap-panel">
          <div className="ap-panel-head">
            <div>
              <p className="ap-kicker">Shortcuts</p>
              <h3 className="ap-panel-title">Quick actions</h3>
            </div>
          </div>
          <div className="ap-quick-grid">
            {quickActions.map((action) => (
              <button key={action.title} type="button" className="ap-quick" onClick={() => navigate(action.to)}>
                <span className="ap-quick-icon"><Icon name={action.icon} size={16} /></span>
                <strong>{action.title}</strong>
                <small>{action.note}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* Student management                                                  */
/* ------------------------------------------------------------------ */

export function StudentManagementPage({ view = 'list' }: { view?: 'list' | 'empty' }) {
  const navigate = useNavigate();
  const notConnected = useNotConnected();
  const { query, setQuery, className, setClassName, rows } = useStudentFilter();

  const header = (
    <AdminPageHeader
      title="Student Management"
      subtitle="Manage student profiles, class assignments, and account access."
      action={view === 'list' ? (
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
  );

  if (view === 'empty') {
    return (
      <AdminShell section="students" title="Student Management">
        <div className="ap-page wide">
          {header}
          <section className="ap-empty">
            <span className="ap-empty-icon"><Icon name="users" size={22} /></span>
            <h3>No students in the system</h3>
            <p>There are currently no student records available. Add a student manually or import your school’s existing Excel register to get started.</p>
            <div className="ap-button-row center">
              <button type="button" className="ap-button dark" onClick={() => navigate('/student-add')}>
                <Icon name="plus" size={15} />
                Add student manually
              </button>
              <button type="button" className="ap-button light" onClick={() => navigate('/student-import')}>
                <Icon name="upload" size={15} />
                Import Excel register
              </button>
            </div>
            <small>Excel and CSV registers are supported for bulk import.</small>
          </section>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell section="students" title="Student Management">
      <div className="ap-page wide">
        {header}

        <section className="ap-panel">
          <div className="ap-panel-head">
            <div>
              <p className="ap-kicker">School register</p>
              <h3 className="ap-panel-title">All students</h3>
              <p className="ap-panel-note">Showing {rows.length} of {portalStudents.length} records</p>
            </div>
            <div className="ap-panel-controls">
              <InlineSearch value={query} onChange={setQuery} placeholder="Search name or admission number" />
              <ClassSelect value={className} onChange={setClassName} />
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

            {rows.length === 0 && <p className="ap-table-empty">No students match your search.</p>}

            {rows.map((student: PortalStudent) => (
              <div key={student.id} className="ap-table-row" role="row">
                <span role="cell" className="ap-person"><Initials name={student.name} /><strong>{student.name}</strong></span>
                <span role="cell">{student.admissionNumber}</span>
                <span role="cell">{student.className}</span>
                <span role="cell"><Pill tone={student.active ? 'success' : 'muted'}>{student.active ? 'Active' : 'Inactive'}</Pill></span>
                <span role="cell" className="ap-row-actions">
                  <button type="button" className="ap-text-action" onClick={() => notConnected('Editing a student')}>Edit</button>
                  {student.active ? (
                    <button type="button" className="ap-text-action danger" onClick={() => notConnected('Deactivating a student')}>Deactivate</button>
                  ) : (
                    <span className="ap-text-muted">Deactivated</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const IMPORT_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudentImportPage() {
  const navigate = useNavigate();
  const notConnected = useNotConnected();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const accept = (candidate: File | undefined) => {
    if (!candidate) return;
    const lower = candidate.name.toLowerCase();

    if (!IMPORT_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
      setFile(null);
      setError('Choose a CSV or Excel file (.csv, .xlsx or .xls).');
      return;
    }

    if (candidate.size > MAX_IMPORT_BYTES) {
      setFile(null);
      setError('That file is larger than 10 MB. Split the register and import it in parts.');
      return;
    }

    setError('');
    setFile(candidate);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files?.[0]);
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
          <p className="ap-card-note">Include columns for full name, admission number, class, date of birth, gender, and account status.</p>

          <div
            className={dragging ? 'ap-dropzone dragging' : file ? 'ap-dropzone has-file' : 'ap-dropzone'}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <span className="ap-dropzone-icon"><Icon name={file ? 'check' : 'upload'} size={18} /></span>
            {file ? (
              <>
                <p className="ap-dropzone-title">{file.name}</p>
                <p className="ap-dropzone-note">{formatBytes(file.size)} · ready to import</p>
              </>
            ) : (
              <>
                <p className="ap-dropzone-title">Choose a register to upload</p>
                <p className="ap-dropzone-note">CSV or Excel files up to 10 MB</p>
              </>
            )}
            <button type="button" className="ap-text-link" onClick={() => inputRef.current?.click()}>
              {file ? 'Choose a different file' : 'Browse files'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              hidden
              onChange={(event) => {
                accept(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>

          {error && <p className="ap-field-error block" role="alert">{error}</p>}

          <div className="ap-note-box">
            <strong>Before you import</strong>
            <span>Duplicate admission numbers will be skipped. You can edit imported student records after the upload is complete.</span>
          </div>

          <FormFooter>
            <button type="button" className="ap-button light" onClick={() => navigate('/student-management')}>Cancel</button>
            <button type="button" className="ap-button dark" disabled={!file} onClick={() => notConnected('Importing a register')}>
              Import register
              <Icon name="arrowRight" size={16} />
            </button>
          </FormFooter>
        </section>
      </div>
    </AdminShell>
  );
}

const ADMISSION_PREFIX = 'SCH/2026/';

export function StudentAddPage() {
  const navigate = useNavigate();
  const notConnected = useNotConnected();
  const [form, setForm] = useState({
    fullName: '',
    admissionNumber: ADMISSION_PREFIX,
    className: 'JSS 1A',
    dateOfBirth: '',
    gender: '',
    status: 'Active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const admission = form.admissionNumber.trim();

    if (!form.fullName.trim()) next.fullName = 'Enter the student’s full name.';
    if (admission.length <= ADMISSION_PREFIX.length) next.admissionNumber = 'Enter the rest of the admission number.';
    else if (portalStudents.some((student) => student.admissionNumber.toLowerCase() === admission.toLowerCase())) {
      next.admissionNumber = 'That admission number is already in use.';
    }
    if (!form.dateOfBirth) next.dateOfBirth = 'Choose a date of birth.';
    if (!form.gender) next.gender = 'Select a gender.';

    setErrors(next);
    if (Object.keys(next).length === 0) notConnected('Adding a student');
  };

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
            <div className="ap-field">
              <label htmlFor="student-name">Full name <b aria-hidden="true">*</b></label>
              <input
                id="student-name"
                type="text"
                placeholder="e.g. Adaeze Obi"
                value={form.fullName}
                aria-invalid={Boolean(errors.fullName) || undefined}
                onChange={(event) => update('fullName', event.target.value)}
              />
              {errors.fullName && <span className="ap-field-error">{errors.fullName}</span>}
            </div>

            <div className="ap-field">
              <label htmlFor="student-admission">Admission number <b aria-hidden="true">*</b></label>
              <input
                id="student-admission"
                type="text"
                value={form.admissionNumber}
                aria-invalid={Boolean(errors.admissionNumber) || undefined}
                onChange={(event) => update('admissionNumber', event.target.value)}
              />
              {errors.admissionNumber && <span className="ap-field-error">{errors.admissionNumber}</span>}
            </div>

            <div className="ap-field">
              <label htmlFor="student-class">Class assignment <b aria-hidden="true">*</b></label>
              <span className="ap-select">
                <select id="student-class" value={form.className} onChange={(event) => update('className', event.target.value)}>
                  {classOptions.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </span>
            </div>

            <div className="ap-field">
              <label htmlFor="student-dob">Date of birth <b aria-hidden="true">*</b></label>
              <input
                id="student-dob"
                type="date"
                value={form.dateOfBirth}
                aria-invalid={Boolean(errors.dateOfBirth) || undefined}
                onChange={(event) => update('dateOfBirth', event.target.value)}
              />
              {errors.dateOfBirth && <span className="ap-field-error">{errors.dateOfBirth}</span>}
            </div>

            <div className="ap-field">
              <label htmlFor="student-gender">Gender <b aria-hidden="true">*</b></label>
              <span className="ap-select">
                <select
                  id="student-gender"
                  value={form.gender}
                  aria-invalid={Boolean(errors.gender) || undefined}
                  onChange={(event) => update('gender', event.target.value)}
                >
                  <option value="" disabled>Select gender</option>
                  <option>Female</option>
                  <option>Male</option>
                </select>
              </span>
              {errors.gender && <span className="ap-field-error">{errors.gender}</span>}
            </div>

            <div className="ap-field">
              <label htmlFor="student-status">Account status</label>
              <span className="ap-select">
                <select id="student-status" value={form.status} onChange={(event) => update('status', event.target.value)}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </span>
            </div>
          </div>

          <FormFooter>
            <button type="button" className="ap-button light" onClick={() => navigate('/student-management')}>Cancel</button>
            <button type="submit" className="ap-button dark">
              Add student
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

export function AccessCodeManagementPage() {
  const navigate = useNavigate();
  const { query, setQuery, className, setClassName, rows } = useStudentFilter();
  const generated = portalStudents.filter((student) => student.codeGenerated).length;

  return (
    <AdminShell section="codes" title="Access Codes">
      <div className="ap-page wide">
        <AdminPageHeader
          eyebrow="Parent portal access"
          title="Access Code Management"
          subtitle="Generate and monitor secure parent access without exposing active codes."
          action={(
            <button type="button" className="ap-button dark" onClick={() => navigate('/access-codes-generate')}>
              Generate class codes
            </button>
          )}
        />

        <div className="ap-stat-grid three">
          <div className="ap-stat plain">
            <span className="ap-stat-label">Total students</span>
            <strong className="serif">{portalStudents.length}</strong>
            <small>Across {registerClasses.length} classes</small>
          </div>
          <div className="ap-stat plain">
            <span className="ap-stat-label">Codes generated</span>
            <strong className="serif">{generated}</strong>
            <small>Available through secure delivery only</small>
          </div>
          <div className="ap-stat plain">
            <span className="ap-stat-label">Not generated</span>
            <strong className="serif">{portalStudents.length - generated}</strong>
            <small>Students still requiring access</small>
          </div>
        </div>

        <div className="ap-info-banner">
          <span className="ap-info-icon"><Icon name="lock" size={15} /></span>
          <div>
            <strong>Codes remain private</strong>
            <span>Access codes are shown once, immediately after generation. They never appear in this student list or in the audit log.</span>
          </div>
        </div>

        <section className="ap-panel">
          <div className="ap-panel-head">
            <div>
              <p className="ap-kicker">Student access</p>
              <h3 className="ap-panel-title">Access-code status</h3>
              <p className="ap-panel-note">Showing {rows.length} of {portalStudents.length} students</p>
            </div>
            <div className="ap-panel-controls">
              <InlineSearch value={query} onChange={setQuery} placeholder="Search name or admission number" />
              <ClassSelect value={className} onChange={setClassName} />
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

            {rows.length === 0 && <p className="ap-table-empty">No students match your search.</p>}

            {rows.map((student) => (
              <div key={student.id} className="ap-table-row" role="row">
                <span role="cell" className="ap-person"><Initials name={student.name} /><strong>{student.name}</strong></span>
                <span role="cell">{student.admissionNumber}</span>
                <span role="cell">{student.className}</span>
                <span role="cell"><Pill tone={student.codeGenerated ? 'success' : 'muted'}>{student.codeGenerated ? 'Generated' : 'Not generated'}</Pill></span>
                <span role="cell">{student.lastGenerated ?? '—'}</span>
                <span role="cell" className="ap-row-actions">
                  <button
                    type="button"
                    className="ap-text-action"
                    onClick={() => navigate('/access-codes-individual', { state: { studentId: student.id } })}
                  >
                    {student.codeGenerated ? 'Regenerate' : 'Generate code'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

export function GenerateClassCodesPage() {
  const navigate = useNavigate();
  const notConnected = useNotConnected();
  const [className, setClassName] = useState('JSS 1C');
  const [confirmed, setConfirmed] = useState(false);

  const members = portalStudents.filter((student) => student.className === className);
  const replacing = members.filter((student) => student.codeGenerated).length;
  const canGenerate = confirmed && members.length > 0;

  return (
    <AdminShell section="codes" title="Access Codes">
      <div className="ap-page narrow">
        <AdminPageHeader
          title="Generate Class Codes"
          subtitle="Issue new parent portal login credentials for an entire class."
          backLabel="Back to Access Code Management"
          onBack={() => navigate('/access-codes')}
        />

        <section className="ap-card">
          <div className="ap-card-lead">
            <span className="ap-tile"><Icon name="lock" size={18} /></span>
            <div>
              <p className="ap-kicker">Class-wide generation</p>
              <h3 className="ap-card-title tight">Select a class</h3>
              <p className="ap-card-note flush">Every student in the selected class will receive a newly generated access code.</p>
            </div>
          </div>

          <div className="ap-field spaced">
            <label htmlFor="class-assignment">Class assignment</label>
            <span className="ap-select">
              <select
                id="class-assignment"
                value={className}
                onChange={(event) => {
                  setClassName(event.target.value);
                  setConfirmed(false);
                }}
              >
                {registerClasses.map((name) => (
                  <option key={name}>{name}</option>
                ))}
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
              <p>
                Any existing access code for a student in {className} will stop working. The new codes will be displayed once after generation so they can be distributed securely.
              </p>
            </div>
          </div>

          <div className="ap-checklist">
            <p className="ap-kicker small">Before you continue</p>
            <ul>
              <li>All {members.length} students in {className} are included.</li>
              <li>Existing codes for this class are replaced, not duplicated.</li>
              <li>New codes will not appear later in student lists or the audit log.</li>
            </ul>
          </div>

          <label className="ap-consent">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I understand that this will replace existing credentials and that the new codes are shown only once.</span>
          </label>

          <FormFooter>
            <button type="button" className="ap-button light" onClick={() => navigate('/access-codes')}>Cancel</button>
            <button type="button" className="ap-button dark" disabled={!canGenerate} onClick={() => notConnected('Generating access codes')}>
              Generate Codes
              <Icon name="arrowRight" size={16} />
            </button>
          </FormFooter>
        </section>
      </div>
    </AdminShell>
  );
}

export function GenerateIndividualCodePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notConnected = useNotConnected();
  const startingId = (location.state as { studentId?: number } | null)?.studentId ?? null;
  const [selectedId, setSelectedId] = useState<number | null>(startingId);
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const matches = portalStudents.filter((student) => (
    !needle || `${student.name} ${student.admissionNumber}`.toLowerCase().includes(needle)
  ));
  const selected = portalStudents.find((student) => student.id === selectedId) ?? null;

  return (
    <AdminShell section="codes" title="Access Codes">
      <div className="ap-page medium">
        <AdminPageHeader
          title="Generate Individual Code"
          subtitle="Find a student and issue new parent portal login credentials for their account."
          backLabel="Back to Access Code Management"
          onBack={() => navigate('/access-codes')}
        />

        <div className="ap-split">
          <section className="ap-card">
            <p className="ap-kicker">Select student</p>
            <h3 className="ap-card-title">Find a student account</h3>
            <p className="ap-card-note">Search using the student’s name or admission number.</p>

            <InlineSearch className="field" value={query} onChange={setQuery} placeholder="Search name or admission number" />

            <ul className="ap-picker" aria-label="Students">
              {matches.length === 0 && <li className="ap-picker-empty">No students match your search.</li>}
              {matches.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    className={student.id === selectedId ? 'ap-picker-row selected' : 'ap-picker-row'}
                    aria-pressed={student.id === selectedId}
                    onClick={() => setSelectedId(student.id)}
                  >
                    <Initials name={student.name} />
                    <span>
                      <strong>{student.name}</strong>
                      <small>{student.admissionNumber} · {student.className}</small>
                    </span>
                    {student.id === selectedId && <span className="ap-picker-check"><Icon name="check" size={13} strokeWidth={2.2} /></span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="ap-card selected-card">
            <span className="ap-tile center"><Icon name="lock" size={18} /></span>
            <p className="ap-kicker center">Selected account</p>

            {selected ? (
              <>
                <h3 className="ap-selected-name">{selected.name}</h3>
                <p className="ap-selected-note">Confirm this is the correct student account before generating a code.</p>
                <dl className="ap-facts">
                  <div><dt>Admission number</dt><dd>{selected.admissionNumber}</dd></div>
                  <div><dt>Assigned class</dt><dd>{selected.className}</dd></div>
                  <div><dt>Current code status</dt><dd>{selected.codeGenerated ? 'Generated' : 'Not generated'}</dd></div>
                </dl>
                {selected.codeGenerated && (
                  <p className="ap-callout-warning">Generating a new code will replace this student’s existing login credential.</p>
                )}
              </>
            ) : (
              <div className="ap-selected-empty">
                <strong>No student selected</strong>
                <p>Choose a student from the list to review their account details.</p>
              </div>
            )}

            <div className="ap-selected-actions">
              <button type="button" className="ap-button light" onClick={() => navigate('/access-codes')}>Cancel</button>
              <button type="button" className="ap-button dark" disabled={!selected} onClick={() => notConnected('Generating an access code')}>
                Generate Code
                <Icon name="arrowRight" size={16} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* Results upload, results review and audit log                        */
/* ------------------------------------------------------------------ */

type RecordRow = { id: number; title: string; owner: string; detail: string; status: string };

function RecordsPage({
  section,
  title,
  subtitle,
  actionLabel,
  panelTitle,
  rows,
  onAction,
  onOpen,
}: {
  section: 'upload' | 'review' | 'audit';
  title: string;
  subtitle: string;
  actionLabel: string;
  panelTitle: string;
  rows: RecordRow[];
  onAction: () => void;
  onOpen: (row: RecordRow) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const visible = rows.filter((row) => !needle || `${row.title} ${row.owner} ${row.detail} ${row.status}`.toLowerCase().includes(needle));

  return (
    <AdminShell section={section} title={title}>
      <div className="ap-page wide">
        <AdminPageHeader
          title={title}
          subtitle={subtitle}
          backLabel="Back to overview"
          onBack={() => navigate('/admin-overview')}
          action={(
            <button type="button" className="ap-button dark" onClick={onAction}>
              {actionLabel}
              <Icon name="arrowRight" size={16} />
            </button>
          )}
        />

        <section className="ap-panel records">
          <div className="ap-panel-head">
            <div>
              <p className="ap-kicker">Recent records</p>
              <h3 className="ap-panel-title">{panelTitle}</h3>
            </div>
            <InlineSearch value={query} onChange={setQuery} placeholder="Search records" />
          </div>

          <ul className="ap-records">
            {visible.length === 0 && <li className="ap-table-empty">No records match your search.</li>}
            {visible.map((row, index) => (
              <li key={row.id}>
                <button type="button" className="ap-record" onClick={() => onOpen(row)} aria-label={`Open ${row.title}`}>
                  <span className="ap-record-index">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{row.title}</strong>
                  <span>{row.owner}</span>
                  <span>{row.detail}</span>
                  <span className="ap-tag">{row.status}</span>
                  <Icon name="arrowRight" size={15} className="ap-record-arrow" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}

export function ResultsUploadPage() {
  const notConnected = useNotConnected();
  return (
    <RecordsPage
      section="upload"
      title="Results Upload"
      subtitle="Upload validated result sheets for the current term."
      actionLabel="Upload results"
      panelTitle="Results Upload"
      rows={resultUploads}
      onAction={() => notConnected('Uploading results')}
      onOpen={() => notConnected('Opening an upload')}
    />
  );
}

export function ResultsReviewPage() {
  const notConnected = useNotConnected();
  return (
    <RecordsPage
      section="review"
      title="Results Review"
      subtitle="Approve completed result sets before they are published."
      actionLabel="Review next set"
      panelTitle="Results Review"
      rows={resultReviews}
      onAction={() => notConnected('Reviewing a result set')}
      onOpen={() => notConnected('Opening a result set')}
    />
  );
}

export function AuditLogPage() {
  const notConnected = useNotConnected();
  return (
    <RecordsPage
      section="audit"
      title="Audit Log"
      subtitle="Review important actions performed across the portal."
      actionLabel="Export log"
      panelTitle="Audit Log"
      rows={auditEntries}
      onAction={() => notConnected('Exporting the audit log')}
      onOpen={() => notConnected('Opening an audit entry')}
    />
  );
}
