import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import type { ClassRow, ResultBatch } from '../api';
import { AdminPageHeader, AdminShell } from './shells';

function useRequest<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    load().then((value) => { if (!cancelled) { setData(value); setError(''); } })
      .catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not reach the server.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, busy, reload: () => setTick((n) => n + 1) };
}

function Failure({ error, retry }: { error: string; retry?: () => void }) {
  return <section className="ap-empty" role="alert"><h3>Could not load school data</h3><p>{error}</p>{retry && <button className="ap-button dark" onClick={retry}>Try again</button>}</section>;
}

export function LiveOverviewPage() {
  const state = useRequest(() => api.getOverview());
  return <AdminShell section="overview" title="School Overview"><div className="ap-page wide"><AdminPageHeader title="School overview" subtitle={state.data?.term ? `${state.data.term.name} · ${state.data.term.session}` : 'No current term is configured'} />
    {state.error ? <Failure error={state.error} retry={state.reload} /> : state.busy ? <p>Loading school records…</p> : state.data && <>
      <div className="ap-stat-grid four">{[
        ['Students', state.data.counts.students], ['Active students', state.data.counts.activeStudents], ['Classes', state.data.counts.classes], ['Access codes issued', state.data.counts.codesIssued],
      ].map(([label, value]) => <div className="ap-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <section className="ap-panel"><div className="ap-panel-head"><div><p className="ap-kicker">Current term</p><h3 className="ap-panel-title">Results progress</h3></div></div><p>{state.data.results.draft} draft · {state.data.results.published} published · {state.data.results.notUploaded} classes without uploads</p>
        <h3 className="ap-panel-title">Recent activity</h3>{state.data.recent.length ? state.data.recent.map((entry) => <p key={entry.id}><strong>{entry.title}</strong> · {entry.owner} · {entry.detail} <small>{new Date(entry.at).toLocaleString()}</small></p>) : <p>No recorded activity yet.</p>}</section>
    </>}</div></AdminShell>;
}

export function ResultsUploadLivePage() {
  const classes = useRequest(() => api.listClasses());
  const [classId, setClassId] = useState<number | ''>('');
  const [csv, setCsv] = useState('');
  const [filename, setFilename] = useState('');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof api.previewResults>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function choose(file?: File) {
    if (!file) return;
    setError(''); setMessage(''); setPreview(null); setBusy(true);
    try {
      let text: string;
      if (/\.xlsx?$/i.test(file.name)) {
        const xlsx = await import('xlsx');
        const workbook = xlsx.read(await file.arrayBuffer());
        const first = workbook.SheetNames[0];
        if (!first) throw new Error('The workbook has no sheets.');
        text = xlsx.utils.sheet_to_csv(workbook.Sheets[first]);
      } else if (/\.csv$/i.test(file.name)) text = await file.text();
      else throw new Error('Choose a CSV or Excel workbook.');
      const result = await api.previewResults(Number(classId), text);
      setCsv(text); setFilename(file.name); setPreview(result);
      if (!result.ok) setError(result.errors.join(' '));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not validate this file.'); }
    finally { setBusy(false); }
  }
  async function commit() {
    setBusy(true); setError(''); setMessage('');
    try { const result = await api.uploadResults(Number(classId), csv); setMessage(`Uploaded ${result.rows} subject records for ${result.students} students.`); setPreview(null); setCsv(''); setFilename(''); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not upload results.'); }
    finally { setBusy(false); }
  }
  return <AdminShell section="upload" title="Results Upload"><div className="ap-page narrow"><AdminPageHeader title="Upload results" subtitle="Validate the complete class register before saving a draft result batch." />
    {classes.error && <Failure error={classes.error} retry={classes.reload} />}
    {classes.data && <section className="ap-card"><label className="ap-field"><span>Class</span><span className="ap-select"><select value={classId} onChange={(event) => { setClassId(Number(event.target.value) || ''); setPreview(null); setCsv(''); }}><option value="">Choose a class</option>{classes.data.classes.map((item: ClassRow) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></span></label>
      <p className="ap-card-note">Columns: Admission number, Subject, CA1, CA2, Exam. Optional columns: School days, Days present, Teacher comment.</p>
      <input type="file" accept=".csv,.xlsx,.xls" disabled={!classId || busy} onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
      {filename && <p>{filename}</p>}{busy && <p>Validating…</p>}{error && <p className="ap-field-error block" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
      {preview?.ok && <div className="ap-note-box"><strong>{preview.students} students · {preview.rows} subject rows</strong><span>{preview.missingStudents} active students have no result rows.</span></div>}
      <div className="ap-button-row"><button className="ap-button dark" disabled={!preview?.ok || busy} onClick={() => void commit()}>{busy ? 'Working…' : 'Save draft results'}</button></div>
    </section>}</div></AdminShell>;
}

export function ResultsReviewLivePage() {
  const batches = useRequest(() => api.listResultBatches());
  const [selected, setSelected] = useState<number | null>(null);
  const detail = useRequest(() => selected ? api.getResultBatch(selected) : Promise.resolve(null), [selected]);
  const [error, setError] = useState('');
  async function changeStatus(batch: ResultBatch) {
    setError('');
    try { await api.setBatchPublished(batch.id, batch.status !== 'published'); batches.reload(); detail.reload(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update result status.'); }
  }
  return <AdminShell section="review" title="Results Review"><div className="ap-page wide"><AdminPageHeader title="Results review" subtitle={batches.data?.term ? `${batches.data.term.name} · ${batches.data.term.session}` : 'Configure a current term before reviewing results.'} />
    {batches.error && <Failure error={batches.error} retry={batches.reload} />}{error && <p className="ap-field-error block" role="alert">{error}</p>}
    <section className="ap-panel">{batches.busy ? <p>Loading result batches…</p> : batches.data?.batches.length ? batches.data.batches.map((batch) => <div className="ap-table-row" key={batch.id}><strong>{batch.className}</strong><span>{batch.studentCount} students</span><span>{batch.status}</span><button className="ap-text-action" onClick={() => setSelected(batch.id)}>Inspect</button><button className="ap-text-action" disabled={batch.studentCount === 0} onClick={() => void changeStatus(batch)}>{batch.status === 'published' ? 'Unpublish' : 'Publish'}</button></div>) : <p>No result batches have been uploaded for this term.</p>}</section>
    {selected && detail.data && <section className="ap-panel"><div className="ap-panel-head"><h3>{detail.data.batch.className} · {detail.data.batch.termName} {detail.data.batch.session}</h3><button className="ap-text-action" onClick={() => setSelected(null)}>Close</button></div><p>{detail.data.missing.length} active students missing</p>{detail.data.students.map((student) => <details key={student.studentId}><summary>{student.rank}. {student.name} · average {student.average}</summary>{student.subjects.map((subject) => <p key={subject.subject}>{subject.subject}: {subject.total} ({subject.grade})</p>)}</details>)}</section>}
  </div></AdminShell>;
}

export function AuditLivePage() {
  const audit = useRequest(() => api.listAudit());
  return <AdminShell section="audit" title="Audit Log"><div className="ap-page wide"><AdminPageHeader title="Audit log" subtitle="Recorded administrative changes from the school database." />{audit.error ? <Failure error={audit.error} retry={audit.reload} /> : audit.busy ? <p>Loading audit events…</p> : audit.data?.entries.length ? audit.data.entries.map((entry) => <section className="ap-panel" key={entry.id}><strong>{entry.title}</strong><p>{entry.owner} · {entry.detail}</p><time>{new Date(entry.at).toLocaleString()}</time></section>) : <section className="ap-empty"><h3>No audit events yet</h3></section>}</div></AdminShell>;
}

export function SchoolSetupPage() {
  const terms = useRequest(() => api.getTerms());
  const settings = useRequest(() => api.getSchoolSettings());
  const classes = useRequest(() => api.listClasses());
  const [termName, setTermName] = useState('');
  const [session, setSession] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [makeCurrent, setMakeCurrent] = useState(true);
  const [school, setSchool] = useState({ name: '', email: '', phone: '' });
  const [className, setClassName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (settings.data) setSchool(settings.data.settings); }, [settings.data]);
  async function act(work: () => Promise<unknown>, success: string, reload?: () => void) {
    setBusy(true); setError(''); setMessage('');
    try { await work(); setMessage(success); reload?.(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save changes.'); }
    finally { setBusy(false); }
  }
  return <AdminShell section="setup" title="School Setup"><div className="ap-page wide"><AdminPageHeader title="School setup" subtitle="Configure the school identity, academic terms, and class list used by live records." />
    {error && <p className="ap-field-error block" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <section className="ap-card"><h3 className="ap-card-title">School contact details</h3>{settings.error && <Failure error={settings.error} retry={settings.reload} />}
      <label className="ap-field"><span>School name</span><input value={school.name} maxLength={150} onChange={(event) => setSchool({ ...school, name: event.target.value })} /></label>
      <label className="ap-field"><span>Contact email</span><input type="email" value={school.email} maxLength={255} onChange={(event) => setSchool({ ...school, email: event.target.value })} /></label>
      <label className="ap-field"><span>Phone</span><input value={school.phone} maxLength={50} onChange={(event) => setSchool({ ...school, phone: event.target.value })} /></label>
      <button className="ap-button dark" disabled={busy} onClick={() => void act(() => api.saveSchoolSettings(school), 'School details saved.', settings.reload)}>Save school details</button>
    </section>
    <section className="ap-card"><h3 className="ap-card-title">Academic terms</h3>{terms.data?.terms.map((term) => <p key={term.id}><strong>{term.name} · {term.session}</strong> {term.isCurrent ? '· Current' : <button className="ap-text-action" disabled={busy} onClick={() => void act(() => api.setCurrentTerm(term.id), 'Current term updated.', terms.reload)}>Make current</button>}</p>)}
      <div className="ap-form-grid"><label className="ap-field"><span>Term name</span><input value={termName} onChange={(event) => setTermName(event.target.value)} placeholder="Second term" /></label><label className="ap-field"><span>Session (YYYY/YYYY)</span><input value={session} onChange={(event) => setSession(event.target.value)} placeholder="2026/2027" /></label><label className="ap-field"><span>Next term begins</span><input type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} /></label></div>
      <label><input type="checkbox" checked={makeCurrent} onChange={(event) => setMakeCurrent(event.target.checked)} /> Set as current term</label><p><button className="ap-button dark" disabled={busy || !termName || !session} onClick={() => void act(() => api.createTerm({ name: termName, session, nextTermBegins: nextDate || null, makeCurrent }), 'Academic term created.', terms.reload)}>Add term</button></p>
    </section>
    <section className="ap-card"><h3 className="ap-card-title">Classes</h3>{classes.data?.classes.map((item) => <span className="ap-tag" key={item.id}>{item.name}</span>)}<label className="ap-field"><span>New class</span><input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="JSS 2A" /></label><button className="ap-button dark" disabled={busy || !className.trim()} onClick={() => void act(() => api.createClass(className), 'Class created.', classes.reload)}>Add class</button></section>
  </div></AdminShell>;
}
