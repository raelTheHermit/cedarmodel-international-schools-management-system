import { useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import type { AuditEntry, ClassRow, ResultBatchSummary, UploadSummary } from '../api';
import {
  ClassFilter,
  FormFooter,
  Initials,
  LoadError,
  Pill,
  errorText,
  isAcceptedTableFile,
  readTableFile,
  useLoad,
  useStaff,
} from './admin-live';
import { Icon } from './icons';
import type { IconName } from './icons';
import { useMessageModal } from './message-modal';
import { AdminPageHeader, AdminShell } from './shells';

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, lines: string[]) {
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Overview (stats, term, school profile, classes)                     */
/* ------------------------------------------------------------------ */

function Field({ id, label, children, error }: { id: string; label: string; children: ReactNode; error?: string }) {
  return (
    <div className="ap-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span className="ap-field-error">{error}</span>}
    </div>
  );
}

export function TermPanel({ onChanged }: { onChanged: () => void }) {
  const showMessage = useMessageModal();
  const terms = useLoad(() => api.listTerms(), []);
  const [form, setForm] = useState({ name: 'First term', session: '', nextTermBegins: '', makeCurrent: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    try {
      await api.createTerm({ ...form, nextTermBegins: form.nextTermBegins || null });
      setForm((current) => ({ ...current, session: '', nextTermBegins: '' }));
      terms.reload();
      onChanged();
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length) setErrors(caught.fieldErrors);
      else showMessage(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const makeCurrent = async (id: number) => {
    try {
      await api.setCurrentTerm(id);
      terms.reload();
      onChanged();
    } catch (caught) {
      showMessage(errorText(caught));
    }
  };

  return (
    <section className="ap-panel">
      <div className="ap-panel-head">
        <div><p className="ap-kicker">Setup</p><h3 className="ap-panel-title">Academic terms</h3></div>
      </div>
      {terms.error ? <LoadError message={terms.error} onRetry={terms.reload} /> : (
        <ul className="ap-activity">
          {(terms.data?.terms ?? []).length === 0 && !terms.loading && <li className="ap-table-empty">No terms yet. Add one below to start uploading results.</li>}
          {(terms.data?.terms ?? []).map((term) => (
            <li key={term.id} className="ap-activity-row">
              <div className="grow"><strong>{term.name} · {term.session}</strong><small>{term.nextTermBegins ? `Next term begins ${term.nextTermBegins}` : 'Next-term date not set'}</small></div>
              {term.isCurrent ? <Pill tone="success">Current</Pill> : <button type="button" className="ap-text-action" onClick={() => makeCurrent(term.id)}>Make current</button>}
            </li>
          ))}
        </ul>
      )}
      <form className="ap-user-form" onSubmit={submit} noValidate>
        <div className="ap-form-grid">
          <Field id="term-name" label="Term" error={errors.name}>
            <span className="ap-select"><select id="term-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}><option>First term</option><option>Second term</option><option>Third term</option></select></span>
          </Field>
          <Field id="term-session" label="Session (e.g. 2025/2026)" error={errors.session}>
            <input id="term-session" value={form.session} placeholder="2025/2026" onChange={(event) => setForm({ ...form, session: event.target.value })} />
          </Field>
          <Field id="term-next" label="Next term begins (optional)" error={errors.nextTermBegins}>
            <input id="term-next" type="date" value={form.nextTermBegins} onChange={(event) => setForm({ ...form, nextTermBegins: event.target.value })} />
          </Field>
        </div>
        <label className="ap-consent"><input type="checkbox" checked={form.makeCurrent} onChange={(event) => setForm({ ...form, makeCurrent: event.target.checked })} /><span>Make this the current term</span></label>
        <button type="submit" className="ap-button dark" disabled={busy}>{busy ? 'Saving…' : 'Add term'}</button>
      </form>
    </section>
  );
}

export function SchoolPanel() {
  const showMessage = useMessageModal();
  const settings = useLoad(() => api.getSettings(), []);
  const [draft, setDraft] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const values = draft ?? settings.data?.settings ?? { name: '', email: '', phone: '' };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    try {
      await api.saveSettings(values);
      setDraft(null);
      settings.reload();
      showMessage('School details saved. Parents will see these on their dashboard.');
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length) setErrors(caught.fieldErrors);
      else showMessage(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ap-panel">
      <div className="ap-panel-head">
        <div><p className="ap-kicker">Setup</p><h3 className="ap-panel-title">School details</h3><p className="ap-panel-note">Shown to parents as contact information.</p></div>
      </div>
      {settings.error ? <LoadError message={settings.error} onRetry={settings.reload} /> : (
        <form className="ap-user-form" onSubmit={submit} noValidate>
          <div className="ap-form-grid">
            <Field id="school-name" label="School name" error={errors.name}><input id="school-name" value={values.name} onChange={(event) => setDraft({ ...values, name: event.target.value })} /></Field>
            <Field id="school-email" label="Contact email" error={errors.email}><input id="school-email" type="email" value={values.email} onChange={(event) => setDraft({ ...values, email: event.target.value })} /></Field>
            <Field id="school-phone" label="Contact phone" error={errors.phone}><input id="school-phone" type="tel" value={values.phone} onChange={(event) => setDraft({ ...values, phone: event.target.value })} /></Field>
          </div>
          <button type="submit" className="ap-button dark" disabled={busy || settings.loading}>{busy ? 'Saving…' : 'Save details'}</button>
        </form>
      )}
    </section>
  );
}

export function ClassesPanel({ onChanged }: { onChanged: () => void }) {
  const showMessage = useMessageModal();
  const classes = useLoad(() => api.listClasses(), []);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await api.createClass(name.trim());
      setName('');
      classes.reload();
      onChanged();
    } catch (caught) {
      showMessage(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ap-panel">
      <div className="ap-panel-head">
        <div><p className="ap-kicker">Setup</p><h3 className="ap-panel-title">Classes</h3><p className="ap-panel-note">Classes must exist before students can be added or imported.</p></div>
      </div>
      {classes.error ? <LoadError message={classes.error} onRetry={classes.reload} /> : (
        <p className="ap-panel-note">{(classes.data?.classes ?? []).map((item) => item.name).join(' · ') || 'No classes yet.'}</p>
      )}
      <form className="ap-user-form" onSubmit={submit}>
        <Field id="class-name" label="New class name"><input id="class-name" value={name} placeholder="e.g. JSS 1A" onChange={(event) => setName(event.target.value)} /></Field>
        <button type="submit" className="ap-button dark" disabled={busy || !name.trim()}>{busy ? 'Adding…' : 'Add class'}</button>
      </form>
    </section>
  );
}

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const overview = useLoad(() => api.getOverview(), []);
  const data = overview.data;

  const stats: Array<{ label: string; value: number; note: string; icon: IconName }> = data
    ? [
        { label: 'Students', value: data.counts.activeStudents, note: `${data.counts.students} on record · ${data.counts.classes} classes`, icon: 'users' },
        { label: 'Access codes', value: data.counts.codesIssued, note: `${Math.max(data.counts.activeStudents - data.counts.codesIssued, 0)} still to issue`, icon: 'lock' },
        { label: 'Awaiting approval', value: data.results.draft, note: `${data.results.notUploaded} classes not uploaded yet`, icon: 'doc' },
        { label: 'Published', value: data.results.published, note: 'Visible to parents', icon: 'check' },
      ]
    : [];

  const quickActions: Array<{ title: string; note: string; icon: IconName; to: string }> = [
    { title: 'Add a student', note: 'Create a new school record', icon: 'plus', to: '/student-add' },
    { title: 'Import register', note: 'Upload a CSV or Excel file', icon: 'upload', to: '/student-import' },
    { title: 'Generate class codes', note: 'Issue parent access for a class', icon: 'lock', to: '/access-codes-generate' },
    { title: 'Upload results', note: 'Add result sheets for a class', icon: 'upload', to: '/results-upload' },
    { title: 'Review results', note: 'Approve sets before publishing', icon: 'doc', to: '/results-review' },
    { title: 'Promote a class', note: 'Move students to the next class', icon: 'arrowRight', to: '/student-promote' },
  ];

  return (
    <AdminShell section="overview" title="Overview">
      <div className="ap-page wide">
        <AdminPageHeader
          eyebrow="School dashboard"
          title="School overview"
          subtitle={data?.term ? `${data.term.name} · ${data.term.session} session` : 'No current term set'}
          action={<button type="button" className="ap-button dark" onClick={() => navigate('/results-review')}>Review results<Icon name="arrowRight" size={16} /></button>}
        />

        {overview.error ? <LoadError message={overview.error} onRetry={overview.reload} /> : (
          <>
            {data && !data.term && (
              <div className="ap-info-banner">
                <span className="ap-info-icon"><Icon name="lock" size={15} /></span>
                <div><strong>Set the current term</strong><span>Results and attendance can’t be recorded until a current term exists.{' '}<button type="button" className="ap-text-link" onClick={() => navigate('/school-setup')}>Open School Setup</button></span></div>
              </div>
            )}

            <div className="ap-stat-grid four" aria-busy={overview.loading}>
              {stats.map((stat) => (
                <div key={stat.label} className="ap-stat">
                  <div className="ap-stat-top"><span>{stat.label}</span><span className="ap-stat-icon"><Icon name={stat.icon} size={15} /></span></div>
                  <strong>{stat.value}</strong>
                  <small>{stat.note}</small>
                </div>
              ))}
            </div>

            <section className="ap-panel">
              <div className="ap-panel-head">
                <div><p className="ap-kicker">Recent activity</p><h3 className="ap-panel-title">Latest actions</h3></div>
                <button type="button" className="ap-link" onClick={() => navigate('/audit-log')}>View audit log</button>
              </div>
              <ul className="ap-activity">
                {data && data.recent.length === 0 && <li className="ap-table-empty">No activity recorded yet.</li>}
                {(data?.recent ?? []).map((entry) => (
                  <li key={entry.id} className="ap-activity-row">
                    <span className="ap-activity-icon"><Icon name="history" size={15} /></span>
                    <div className="grow"><strong>{entry.title}</strong><small>{entry.owner} · {entry.detail}</small></div>
                    <span className="ap-activity-time">{formatWhen(entry.at)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="ap-panel">
              <div className="ap-panel-head"><div><p className="ap-kicker">Shortcuts</p><h3 className="ap-panel-title">Quick actions</h3></div></div>
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
          </>
        )}

      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* Results upload                                                      */
/* ------------------------------------------------------------------ */

const TEMPLATE = [
  'Admission number,Subject,CA1,CA2,Exam,School days,Days present,Teacher comment',
  'SS3/001,Mathematics,18,17,53,62,59,"Strong, steady work"',
  'SS3/001,English Language,16,15,50,62,59,"Consistent in class work"',
  'SS3/001,Physics,17,16,49,62,58,"Good problem-solving skills"',
  'SS3/001,Chemistry,15,14,46,62,57,"Needs more revision in balancing equations"',
  'SS3/001,Biology,18,17,52,62,60,"Very good practical understanding"',
  'SS3/001,Economics,13,14,41,62,54,"Improving steadily"',
  'SS3/001,Government,16,15,48,62,58,"Participates well in discussion"',
  'SS3/001,Civic Education,17,16,50,62,59,"Well behaved and reliable"',
  'SS3/001,Computer Studies,19,18,55,62,61,"Excellent digital skills"',
  'SS3/002,Mathematics,15,14,42,62,53,"Works harder with targeted practice"',
  'SS3/002,English Language,14,13,44,62,54,"Clear expression and fair comprehension"',
  'SS3/002,Physics,12,13,40,62,50,"Needs more attention to formulas"',
  'SS3/002,Chemistry,14,15,43,62,52,"Shows good effort in class"',
  'SS3/002,Biology,15,16,47,62,55,"Good scientific explanation"',
  'SS3/002,Economics,11,12,38,62,49,"Improvement needed in application"',
  'SS3/002,Government,13,14,42,62,50,"Good understanding of current events"',
  'SS3/002,Civic Education,15,14,45,62,52,"Shows responsibility and maturity"',
  'SS3/002,Computer Studies,16,15,49,62,57,"Strong practical performance"',
  'SS3/003,Mathematics,17,16,48,62,58,"Good analytical thinking"',
  'SS3/003,English Language,18,17,53,62,59,"Very good writing and comprehension"',
  'SS3/003,Physics,16,15,47,62,56,"Good understanding of concepts"',
  'SS3/003,Chemistry,15,14,45,62,55,"Can improve on written explanations"',
  'SS3/003,Biology,17,17,51,62,60,"Excellent in practical work"',
  'SS3/003,Economics,14,13,39,62,50,"Good effort in class"',
  'SS3/003,Government,16,15,46,62,56,"Steady performance"',
  'SS3/003,Civic Education,17,16,49,62,58,"Reliable and respectful"',
  'SS3/003,Computer Studies,18,17,54,62,60,"Very confident in ICT tasks"',
  'SS3/004,Mathematics,14,13,39,62,49,"Needs more practice in word problems"',
  'SS3/004,English Language,15,14,45,62,52,"Clear and expressive"',
  'SS3/004,Physics,13,12,38,62,48,"Concentrate on solving steps"',
  'SS3/004,Chemistry,12,13,37,62,46,"Can improve with revision"',
  'SS3/004,Biology,14,15,42,62,50,"Good effort and consistency"',
  'SS3/004,Economics,10,11,35,62,44,"Needs more application practice"',
  'SS3/004,Government,12,13,40,62,48,"Steady progress"',
  'SS3/004,Civic Education,14,13,43,62,50,"Shows good conduct"',
  'SS3/004,Computer Studies,15,14,46,62,54,"Works well with classroom tasks"',
  'SS3/005,Mathematics,19,18,57,62,61,"Excellent performance"',
  'SS3/005,English Language,17,16,49,62,59,"Strong reading and writing"',
  'SS3/005,Physics,18,17,53,62,60,"Very good reasoning"',
  'SS3/005,Chemistry,16,15,48,62,58,"Good scientific explanations"',
  'SS3/005,Biology,18,17,54,62,61,"Outstanding practical understanding"',
  'SS3/005,Economics,15,14,45,62,54,"Strong participation"',
  'SS3/005,Government,17,16,50,62,58,"Excellent civic reasoning"',
  'SS3/005,Civic Education,18,17,52,62,60,"Very disciplined"',
  'SS3/005,Computer Studies,19,18,56,62,61,"Excellent ICT skills"',
  'SS3/006,Mathematics,13,12,37,62,48,"Needs more confidence"',
  'SS3/006,English Language,14,13,43,62,52,"Good spoken and written work"',
  'SS3/006,Physics,11,12,36,62,45,"More practice on calculations"',
  'SS3/006,Chemistry,13,14,40,62,49,"Reasonable progress"',
  'SS3/006,Biology,15,14,44,62,52,"Good observation skills"',
  'SS3/006,Economics,12,13,40,62,48,"Needs more conceptual clarity"',
  'SS3/006,Government,14,13,42,62,50,"Approaching expectations"',
  'SS3/006,Civic Education,15,14,46,62,53,"Steady and responsible"',
  'SS3/006,Computer Studies,14,13,43,62,51,"Good effort in practical tasks"',
  'SS3/007,Mathematics,16,15,46,62,56,"Good understanding with room to improve"',
  'SS3/007,English Language,15,14,45,62,53,"Clear and fluent"',
  'SS3/007,Physics,14,13,41,62,50,"Needs focused revision"',
  'SS3/007,Chemistry,15,14,44,62,52,"Improving steadily"',
  'SS3/007,Biology,16,15,47,62,57,"Solid practical participation"',
  'SS3/007,Economics,13,12,39,62,48,"Can improve with more reading"',
  'SS3/007,Government,15,14,45,62,53,"Good political awareness"',
  'SS3/007,Civic Education,16,15,48,62,56,"Very cooperative in class"',
  'SS3/007,Computer Studies,17,16,50,62,58,"Good and consistent use of ICT tools"',
];

export function ResultsUploadPage() {
  const showMessage = useMessageModal();
  const inputRef = useRef<HTMLInputElement>(null);
  const classes = useLoad(() => api.listClasses(), []);
  const batches = useLoad(() => api.listResultBatches(), []);

  const [classId, setClassId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof readTableFile>> | null>(null);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const classList: ClassRow[] = classes.data?.classes ?? [];
  const selected = classId ?? classList[0]?.id ?? null;
  const term = batches.data?.term ?? null;
  const batchFor = (id: number): ResultBatchSummary | undefined => batches.data?.batches.find((batch) => batch.classId === id);
  const selectedBatch = selected ? batchFor(selected) : undefined;
  const locked = selectedBatch?.status === 'published';

  const reset = () => {
    setFile(null);
    setPayload(null);
    setSummary(null);
    setError('');
  };

  const choose = async (candidate: File | undefined) => {
    if (!candidate || !selected) return;
    reset();

    const problem = isAcceptedTableFile(candidate);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    try {
      const input = await readTableFile(candidate);
      setSummary(await api.uploadResults({ ...input, classId: selected, dryRun: true }));
      setFile(candidate);
      setPayload(input);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!payload || !selected || busy) return;
    setBusy(true);
    try {
      await api.uploadResults({ ...payload, classId: selected, dryRun: false });
      showMessage('Results uploaded. They stay hidden from parents until an administrator publishes them.');
      reset();
      batches.reload();
    } catch (caught) {
      if (caught instanceof ApiError) setError(caught.message);
      else setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell section="upload" title="Results Upload">
      <div className="ap-page wide">
        <AdminPageHeader
          title="Results Upload"
          subtitle={term ? `Upload result sheets for ${term.name}, ${term.session}.` : 'Upload validated result sheets for the current term.'}
        />

        {batches.error ? <LoadError message={batches.error} onRetry={batches.reload} /> : !batches.loading && !term ? (
          <section className="ap-empty">
            <h3>No current term</h3>
            <p>An administrator needs to set the current term before results can be uploaded.</p>
          </section>
        ) : (
          <>
            <section className="ap-card">
              <p className="ap-kicker">Upload</p>
              <h3 className="ap-card-title">Upload a class result sheet</h3>
              <p className="ap-card-note">
                One row per student per subject. Use this long-format layout: Admission number, Subject, CA1 (0–20), CA2 (0–20), Exam (0–60). Optional: School days, Days present, Teacher comment.
                The example below is a full template for seven SS3 students across the major subjects. Uploading again replaces the earlier draft for that class.{' '}
                <button type="button" className="ap-text-link" onClick={() => downloadCsv('ss3-results-template.csv', TEMPLATE)}>Download a template</button>
              </p>

              <div className="ap-field spaced">
                <label htmlFor="results-class">Class</label>
                <span className="ap-select">
                  <select id="results-class" value={selected ?? ''} onChange={(event) => { setClassId(Number(event.target.value)); reset(); }}>
                    {classList.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </span>
              </div>

              {locked && <p className="ap-callout-warning">These results are published. An administrator must unpublish them before you can upload again.</p>}

              <div className={file ? 'ap-dropzone has-file' : 'ap-dropzone'}>
                <span className="ap-dropzone-icon"><Icon name={file ? 'check' : 'upload'} size={18} /></span>
                <p className="ap-dropzone-title">{file ? file.name : 'Choose a result sheet'}</p>
                <p className="ap-dropzone-note">{busy ? 'Checking file…' : 'CSV or Excel (.xlsx) up to 2 MB'}</p>
                <button type="button" className="ap-text-link" disabled={busy || locked || !selected} onClick={() => inputRef.current?.click()}>{file ? 'Choose a different file' : 'Browse files'}</button>
                <input ref={inputRef} type="file" accept=".csv,.xlsx" hidden onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
              </div>

              {error && <p className="ap-field-error block" role="alert">{error}</p>}

              {summary && (
                <div className="ap-note-box">
                  {summary.ok ? (
                    <>
                      <strong>Ready to upload results for {summary.students} students ({summary.rows} subject rows)</strong>
                      {summary.missingStudents > 0 && <span>{summary.missingStudents} active students in this class have no results in the file.</span>}
                    </>
                  ) : (
                    <>
                      <strong>{summary.totalErrors} problem{summary.totalErrors === 1 ? '' : 's'} found. Nothing has been uploaded.</strong>
                      {summary.errors.slice(0, 8).map((message) => <span key={message}>{message}</span>)}
                      {summary.totalErrors > 8 && <span>…and {summary.totalErrors - 8} more.</span>}
                    </>
                  )}
                </div>
              )}

              <FormFooter>
                <button type="button" className="ap-button light" onClick={reset}>Clear</button>
                <button type="button" className="ap-button dark" disabled={!summary?.ok || busy || locked} onClick={commit}>
                  {busy ? 'Working…' : 'Upload results'}<Icon name="arrowRight" size={16} />
                </button>
              </FormFooter>
            </section>

            <section className="ap-panel" aria-busy={batches.loading}>
              <div className="ap-panel-head"><div><p className="ap-kicker">This term</p><h3 className="ap-panel-title">Upload status by class</h3></div></div>
              <ul className="ap-records">
                {classList.map((item, index) => {
                  const batch = batchFor(item.id);
                  return (
                    <li key={item.id}>
                      <div className="ap-record">
                        <span className="ap-record-index">{String(index + 1).padStart(2, '0')}</span>
                        <strong>{item.name}</strong>
                        <span>{batch ? `${batch.studentCount} students` : '—'}</span>
                        <span>{batch ? `Uploaded ${formatWhen(batch.uploadedAt)}` : 'Not uploaded'}</span>
                        <span className="ap-tag">{batch ? (batch.status === 'published' ? 'Published' : 'Awaiting approval') : 'Not uploaded'}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* Results review                                                      */
/* ------------------------------------------------------------------ */

export function ResultsReviewPage() {
  const navigate = useNavigate();
  const batches = useLoad(() => api.listResultBatches(), []);
  const rows = batches.data?.batches ?? [];

  return (
    <AdminShell section="review" title="Results Review">
      <div className="ap-page wide">
        <AdminPageHeader
          title="Results Review"
          subtitle={batches.data?.term ? `Approve completed result sets for ${batches.data.term.name}, ${batches.data.term.session}.` : 'Approve completed result sets before they are published.'}
          backLabel="Back to overview"
          onBack={() => navigate('/admin-overview')}
        />

        {batches.error ? <LoadError message={batches.error} onRetry={batches.reload} /> : (
          <section className="ap-panel records" aria-busy={batches.loading}>
            <div className="ap-panel-head"><div><p className="ap-kicker">Result sets</p><h3 className="ap-panel-title">Uploaded by class</h3></div></div>
            <ul className="ap-records">
              {!batches.loading && rows.length === 0 && <li className="ap-table-empty">No results have been uploaded for this term yet.</li>}
              {rows.map((batch, index) => (
                <li key={batch.id}>
                  <button type="button" className="ap-record" onClick={() => navigate(`/results-review/${batch.id}`)} aria-label={`Open ${batch.className}`}>
                    <span className="ap-record-index">{String(index + 1).padStart(2, '0')}</span>
                    <strong>{batch.className}</strong>
                    <span>{batch.uploader ?? 'Unknown uploader'}</span>
                    <span>{batch.studentCount} students · {formatWhen(batch.uploadedAt)}</span>
                    <span className="ap-tag">{batch.status === 'published' ? 'Published' : 'Awaiting approval'}</span>
                    <Icon name="arrowRight" size={15} className="ap-record-arrow" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AdminShell>
  );
}

export function ResultBatchPage() {
  const navigate = useNavigate();
  const showMessage = useMessageModal();
  const staff = useStaff();
  const id = Number(useParams().id);
  const detail = useLoad(() => api.getResultBatch(id), [id]);
  const [busy, setBusy] = useState(false);
  const data = detail.data;
  const published = data?.batch.status === 'published';

  const change = async (action: 'publish' | 'unpublish') => {
    if (!data || busy) return;
    const message = action === 'publish'
      ? `Publish ${data.batch.className} results? Parents will be able to see them immediately.`
      : `Unpublish ${data.batch.className} results? Parents will no longer be able to see them.`;
    if (!window.confirm(message)) return;

    setBusy(true);
    try {
      await (action === 'publish' ? api.publishResults(id) : api.unpublishResults(id));
      detail.reload();
    } catch (caught) {
      showMessage(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell section="review" title="Results Review">
      <div className="ap-page wide">
        <AdminPageHeader
          title={data ? `${data.batch.className} · ${data.batch.termName}` : 'Result set'}
          subtitle={data ? `${data.batch.session} session · ${data.students.length} students` : ''}
          backLabel="Back to results review"
          onBack={() => navigate('/results-review')}
          action={data && staff.role === 'superadmin' ? (
            published
              ? <button type="button" className="ap-button light" disabled={busy} onClick={() => change('unpublish')}>Unpublish</button>
              : <button type="button" className="ap-button dark" disabled={busy || data.students.length === 0} onClick={() => change('publish')}>Approve and publish</button>
          ) : undefined}
        />

        {detail.error ? <LoadError message={detail.error} onRetry={detail.reload} /> : (
          <>
            {data && <div className="ap-stat-grid three">
              <div className="ap-stat plain"><span className="ap-stat-label">Status</span><strong className="serif">{published ? 'Published' : 'Draft'}</strong><small>{published ? 'Visible to parents' : 'Hidden from parents'}</small></div>
              <div className="ap-stat plain"><span className="ap-stat-label">Students with results</span><strong className="serif">{data.students.length}</strong><small>{data.missing.length} without results</small></div>
              <div className="ap-stat plain"><span className="ap-stat-label">Class average</span><strong className="serif">{data.students.length ? (data.students.reduce((sum, student) => sum + student.average, 0) / data.students.length).toFixed(1) : '—'}</strong><small>Mean of student averages</small></div>
            </div>}

            {data && data.missing.length > 0 && (
              <div className="ap-warning" role="note">
                <span className="ap-warning-icon">!</span>
                <div><strong>{data.missing.length} active students have no results</strong><p>{data.missing.slice(0, 10).map((student) => student.name).join(', ')}{data.missing.length > 10 ? '…' : ''}</p></div>
              </div>
            )}

            <section className="ap-panel" aria-busy={detail.loading}>
              <div className="ap-panel-head"><div><p className="ap-kicker">Check before publishing</p><h3 className="ap-panel-title">Student results</h3></div></div>
              <div className="ap-table-wrap">
                <table>
                  <thead><tr><th>Position</th><th>Student</th><th>Subjects</th><th>Average</th><th>Attendance</th><th>Comment</th></tr></thead>
                  <tbody>
                    {(data?.students ?? []).map((student) => (
                      <tr key={student.studentId}>
                        <td>{student.rank}</td>
                        <td>{student.name}<br /><small>{student.admissionNumber}</small></td>
                        <td>{student.subjects.map((subject) => `${subject.subject} ${subject.total} (${subject.grade})`).join(', ')}</td>
                        <td>{student.average}</td>
                        <td>{student.schoolDays !== null && student.daysPresent !== null ? `${student.daysPresent}/${student.schoolDays}` : '—'}</td>
                        <td>{student.comment ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

const PAGE = 50;

export function AuditLogPage() {
  const navigate = useNavigate();
  const showMessage = useMessageModal();
  const first = useLoad(() => api.listAudit(0, PAGE), []);
  const [more, setMore] = useState<AuditEntry[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  const all = useMemo(() => [...(first.data?.entries ?? []), ...more], [first.data, more]);
  const needle = query.trim().toLowerCase();
  const visible = all.filter((entry) => !needle || `${entry.title} ${entry.owner} ${entry.detail}`.toLowerCase().includes(needle));
  const canLoadMore = !exhausted && (first.data?.entries.length ?? 0) === PAGE;

  const loadMore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await api.listAudit(all.length, PAGE);
      setMore((current) => [...current, ...next.entries]);
      if (next.entries.length < PAGE) setExhausted(true);
    } catch (caught) {
      showMessage(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell section="audit" title="Audit Log">
      <div className="ap-page wide">
        <AdminPageHeader
          title="Audit Log"
          subtitle="Review important actions performed across the portal."
          backLabel="Back to overview"
          onBack={() => navigate('/admin-overview')}
          action={<button type="button" className="ap-button dark" disabled={all.length === 0} onClick={() => downloadCsv('audit-log.csv', ['When,Action,Subject,By', ...all.map((e) => [formatWhen(e.at), e.title, e.owner, e.detail].map(csvCell).join(','))])}>Export loaded entries</button>}
        />

        {first.error ? <LoadError message={first.error} onRetry={first.reload} /> : (
          <section className="ap-panel records" aria-busy={first.loading}>
            <div className="ap-panel-head">
              <div><p className="ap-kicker">Recent records</p><h3 className="ap-panel-title">Audit Log</h3></div>
              <label className="ap-inline-search"><Icon name="search" size={15} /><input type="search" value={query} placeholder="Search records" aria-label="Search records" onChange={(event) => setQuery(event.target.value)} /></label>
            </div>
            <ul className="ap-records">
              {!first.loading && visible.length === 0 && <li className="ap-table-empty">No records match.</li>}
              {visible.map((entry, index) => (
                <li key={entry.id}>
                  <div className="ap-record">
                    <span className="ap-record-index">{String(index + 1).padStart(2, '0')}</span>
                    <strong>{entry.title}</strong>
                    <span>{entry.owner}</span>
                    <span>{entry.detail}</span>
                    <span className="ap-tag">{formatWhen(entry.at)}</span>
                  </div>
                </li>
              ))}
            </ul>
            {canLoadMore && <FormFooter><button type="button" className="ap-button light" disabled={busy} onClick={loadMore}>{busy ? 'Loading…' : 'Load older entries'}</button></FormFooter>}
          </section>
        )}
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* Promote a class                                                     */
/* ------------------------------------------------------------------ */

export function PromoteStudentsPage() {
  const navigate = useNavigate();
  const showMessage = useMessageModal();
  const classes = useLoad(() => api.listClasses(), []);
  const [fromId, setFromId] = useState<number | 'all'>('all');
  const [toId, setToId] = useState<number | ''>('');
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const students = useLoad(
    () => (fromId === 'all' ? Promise.resolve({ students: [], total: 0 }) : api.listStudents({ classId: fromId, status: 'active' })),
    [fromId],
  );
  const list = students.data?.students ?? [];
  const chosen = list.filter((student) => !excluded.has(student.id));
  const toName = (classes.data?.classes ?? []).find((item) => item.id === toId)?.name;

  const toggle = (studentId: number) => setExcluded((current) => {
    const next = new Set(current);
    if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
    return next;
  });

  const submit = async () => {
    if (fromId === 'all' || toId === '' || busy) return;
    setBusy(true);
    try {
      const result = await api.promoteStudents({ fromClassId: fromId, toClassId: toId, studentIds: chosen.map((student) => student.id) });
      showMessage(`${result.moved} students moved to ${toName}.`);
      navigate('/student-management');
    } catch (caught) {
      showMessage(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell section="students" title="Student Management">
      <div className="ap-page narrow">
        <AdminPageHeader title="Promote a class" subtitle="Move active students from one class to another, for example at the end of a session." backLabel="Back to student management" onBack={() => navigate('/student-management')} />

        {classes.error ? <LoadError message={classes.error} onRetry={classes.reload} /> : (
          <section className="ap-card">
            <div className="ap-form-grid">
              <div className="ap-field">
                <label htmlFor="promote-from">Move students from</label>
                <ClassFilter classes={classes.data?.classes ?? []} value={fromId} onChange={(next) => { setFromId(next); setExcluded(new Set()); setConfirmed(false); }} />
              </div>
              <div className="ap-field">
                <label htmlFor="promote-to">Move students to</label>
                <span className="ap-select">
                  <select id="promote-to" value={toId} onChange={(event) => { setToId(event.target.value ? Number(event.target.value) : ''); setConfirmed(false); }}>
                    <option value="">Select class</option>
                    {(classes.data?.classes ?? []).filter((item) => item.id !== fromId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </span>
              </div>
            </div>

            {fromId !== 'all' && (
              <ul className="ap-picker" aria-label="Students to move" aria-busy={students.loading}>
                {!students.loading && list.length === 0 && <li className="ap-picker-empty">No active students in this class.</li>}
                {list.map((student) => (
                  <li key={student.id}>
                    <label className="ap-picker-row">
                      <input type="checkbox" checked={!excluded.has(student.id)} onChange={() => toggle(student.id)} />
                      <Initials name={`${student.firstName} ${student.lastName}`} />
                      <span><strong>{student.firstName} {student.lastName}</strong><small>{student.admissionNumber}</small></span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <label className="ap-consent">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>I understand these students will be moved to {toName ?? 'the new class'}. Their earlier published results stay in the record.</span>
            </label>

            <FormFooter>
              <button type="button" className="ap-button light" onClick={() => navigate('/student-management')}>Cancel</button>
              <button type="button" className="ap-button dark" disabled={!confirmed || toId === '' || chosen.length === 0 || busy} onClick={submit}>
                {busy ? 'Moving…' : `Move ${chosen.length} students`}<Icon name="arrowRight" size={16} />
              </button>
            </FormFooter>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
