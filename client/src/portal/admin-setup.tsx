import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api';
import type { AttendanceStatus, StaffAccount } from '../api';
import { ClassesPanel, SchoolPanel, TermPanel } from './admin-results';
import { FormFooter, Initials, LoadError, Pill, errorText, useLoad, useStaff } from './admin-live';
import { Icon } from './icons';
import { useMessageModal } from './message-modal';
import { AdminPageHeader, AdminShell } from './shells';

/* ------------------------------------------------------------------ */
/* Staff accounts                                                      */
/* ------------------------------------------------------------------ */

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** crypto.getRandomValues, with rejection sampling so no character is more likely than another. */
function generatePassword(length = 14) {
  const limit = 256 - (256 % PASSWORD_ALPHABET.length);
  let result = '';
  while (result.length < length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < limit && result.length < length) result += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
    }
  }
  return result;
}

function StaffPanel() {
  const showMessage = useMessageModal();
  const me = useStaff();
  const staff = useLoad(() => api.listStaff(), []);
  const classes = useLoad(() => api.listClasses(), []);

  const [form, setForm] = useState({ email: '', password: '', role: 'teacher' as 'teacher' | 'superadmin', classIds: [] as number[] });
  const [reveal, setReveal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState<{ id: number; password: string } | null>(null);
  const [editing, setEditing] = useState<{ id: number; classIds: number[] } | null>(null);

  const classList = classes.data?.classes ?? [];
  const className = (id: number) => classList.find((item) => item.id === id)?.name ?? `#${id}`;

  const toggleClass = (current: number[], id: number) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    try {
      await api.createStaff(form);
      showMessage(`Account created for ${form.email}. Share the password with them securely. It can’t be shown again.`);
      setForm({ email: '', password: '', role: 'teacher', classIds: [] });
      setReveal(false);
      staff.reload();
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length) setErrors(caught.fieldErrors);
      else showMessage(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const update = async (account: StaffAccount, change: Parameters<typeof api.updateStaff>[1], confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await api.updateStaff(account.id, change);
      setEditing(null);
      staff.reload();
    } catch (caught) {
      showMessage(errorText(caught));
    }
  };

  const reset = async () => {
    if (!resetting) return;
    try {
      await api.resetStaffPassword(resetting.id, resetting.password);
      showMessage('Password changed. That person has been signed out everywhere and must use the new password.');
      setResetting(null);
    } catch (caught) {
      showMessage(errorText(caught));
    }
  };

  return (
    <section className="ap-panel">
      <div className="ap-panel-head">
        <div><p className="ap-kicker">Access control</p><h3 className="ap-panel-title">Staff accounts</h3><p className="ap-panel-note">Teachers see only the classes assigned to them. Administrators see everything.</p></div>
      </div>

      {staff.error ? <LoadError message={staff.error} onRetry={staff.reload} /> : (
        <ul className="ap-activity" aria-busy={staff.loading}>
          {(staff.data?.staff ?? []).map((account) => (
            <li key={account.id} className="ap-activity-row" style={{ flexWrap: 'wrap' }}>
              <Initials name={account.email} />
              <div className="grow">
                <strong>{account.email}{account.id === me.id ? ' (you)' : ''}</strong>
                <small>{account.role === 'superadmin' ? 'Administrator' : `Teacher · ${account.classIds.length ? account.classIds.map(className).join(', ') : 'no classes assigned'}`}</small>
              </div>
              <Pill tone={account.active ? 'success' : 'muted'}>{account.active ? 'Active' : 'Deactivated'}</Pill>

              {account.role === 'teacher' && account.active && (
                <button type="button" className="ap-text-action" onClick={() => setEditing({ id: account.id, classIds: account.classIds })}>Classes</button>
              )}
              <button type="button" className="ap-text-action" onClick={() => setResetting({ id: account.id, password: '' })}>Reset password</button>
              {account.id !== me.id && (
                <button
                  type="button"
                  className={account.active ? 'ap-text-action danger' : 'ap-text-action'}
                  onClick={() => update(account, { active: !account.active }, account.active ? `Deactivate ${account.email}? They will be signed out immediately.` : undefined)}
                >
                  {account.active ? 'Deactivate' : 'Reactivate'}
                </button>
              )}

              {editing?.id === account.id && (
                <div style={{ flexBasis: '100%' }}>
                  <p className="ap-panel-note">Classes {account.email} can see:</p>
                  {classList.map((item) => (
                    <label key={item.id} className="ap-consent">
                      <input type="checkbox" checked={editing.classIds.includes(item.id)} onChange={() => setEditing({ ...editing, classIds: toggleClass(editing.classIds, item.id) })} />
                      <span>{item.name}</span>
                    </label>
                  ))}
                  <FormFooter>
                    <button type="button" className="ap-button light" onClick={() => setEditing(null)}>Cancel</button>
                    <button type="button" className="ap-button dark" onClick={() => update(account, { classIds: editing.classIds })}>Save classes</button>
                  </FormFooter>
                </div>
              )}

              {resetting?.id === account.id && (
                <div style={{ flexBasis: '100%' }}>
                  <div className="ap-field">
                    <label htmlFor={`reset-${account.id}`}>New password (at least 10 characters)</label>
                    <input id={`reset-${account.id}`} type="text" autoComplete="off" value={resetting.password} onChange={(event) => setResetting({ ...resetting, password: event.target.value })} />
                  </div>
                  <FormFooter>
                    <button type="button" className="ap-button light" onClick={() => setResetting({ ...resetting, password: generatePassword() })}>Generate</button>
                    <button type="button" className="ap-button light" onClick={() => setResetting(null)}>Cancel</button>
                    <button type="button" className="ap-button dark" disabled={resetting.password.length < 10} onClick={reset}>Change password</button>
                  </FormFooter>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="ap-user-form" onSubmit={create} noValidate>
        <p className="ap-kicker">New account</p>
        <div className="ap-form-grid">
          <div className="ap-field">
            <label htmlFor="staff-email">Email address</label>
            <input id="staff-email" type="email" autoComplete="off" value={form.email} aria-invalid={Boolean(errors.email) || undefined} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            {errors.email && <span className="ap-field-error">{errors.email}</span>}
          </div>
          <div className="ap-field">
            <label htmlFor="staff-role">Role</label>
            <span className="ap-select">
              <select id="staff-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as 'teacher' | 'superadmin' })}>
                <option value="teacher">Teacher</option>
                <option value="superadmin">Administrator</option>
              </select>
            </span>
          </div>
          <div className="ap-field">
            <label htmlFor="staff-password">Temporary password (at least 10 characters)</label>
            <input id="staff-password" type={reveal ? 'text' : 'password'} autoComplete="new-password" value={form.password} aria-invalid={Boolean(errors.password) || undefined} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            {errors.password && <span className="ap-field-error">{errors.password}</span>}
            <button type="button" className="ap-text-link" onClick={() => { setForm({ ...form, password: generatePassword() }); setReveal(true); }}>Generate a strong password</button>
          </div>
        </div>

        {form.role === 'teacher' && (
          <div>
            <p className="ap-panel-note">Classes this teacher can see:</p>
            {classList.length === 0 && <p className="ap-panel-note">Add classes first.</p>}
            {classList.map((item) => (
              <label key={item.id} className="ap-consent">
                <input type="checkbox" checked={form.classIds.includes(item.id)} onChange={() => setForm({ ...form, classIds: toggleClass(form.classIds, item.id) })} />
                <span>{item.name}</span>
              </label>
            ))}
          </div>
        )}

        <button type="submit" className="ap-button dark" disabled={busy || !form.email || form.password.length < 10}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
    </section>
  );
}

export function StaffManagementPage() {
  return (
    <AdminShell section="staff" title="Staff Management">
      <div className="ap-page wide">
        <AdminPageHeader title="Staff Management" subtitle="Create staff accounts, assign classes, and manage access." />
        <StaffPanel />
      </div>
    </AdminShell>
  );
}

export function SchoolSetupPage() {
  return (
    <AdminShell section="setup" title="School Setup">
      <div className="ap-page wide">
        <AdminPageHeader title="School Setup" subtitle="Terms, classes, and school details." />
        <TermPanel onChanged={() => undefined} />
        <ClassesPanel onChanged={() => undefined} />
        <SchoolPanel />
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* Attendance register                                                 */
/* ------------------------------------------------------------------ */

const STATUSES: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
];

const today = () => new Date().toLocaleDateString('en-CA');

export function AttendancePage() {
  const navigate = useNavigate();
  const showMessage = useMessageModal();
  const classes = useLoad(() => api.listClasses(), []);
  const [classId, setClassId] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [statuses, setStatuses] = useState<Map<number, AttendanceStatus>>(new Map());
  const [busy, setBusy] = useState(false);

  const classList = classes.data?.classes ?? [];
  const selected = classId ?? classList[0]?.id ?? null;
  const sheet = useLoad(() => (selected ? api.getAttendance(selected, date) : Promise.resolve(null)), [selected, date]);

  // Unmarked students default to present; the teacher only has to flag exceptions.
  useEffect(() => {
    if (sheet.data) setStatuses(new Map(sheet.data.students.map((student) => [student.id, student.status ?? 'present'])));
  }, [sheet.data]);

  const students = sheet.data?.students ?? [];
  const counts = { absent: 0, late: 0 };
  statuses.forEach((status) => {
    if (status === 'absent') counts.absent += 1;
    if (status === 'late') counts.late += 1;
  });

  const save = async () => {
    if (!selected || busy || students.length === 0) return;
    setBusy(true);
    try {
      await api.saveAttendance({ classId: selected, date, entries: students.map((student) => ({ studentId: student.id, status: statuses.get(student.id) ?? 'present' })) });
      showMessage(`Attendance saved for ${date}: ${students.length - counts.absent} present, ${counts.absent} absent.`);
      sheet.reload();
    } catch (caught) {
      showMessage(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell section="attendance" title="Attendance">
      <div className="ap-page narrow">
        <AdminPageHeader title="Attendance register" subtitle="Mark who was absent or late. Everyone else counts as present." />

        {classes.error ? <LoadError message={classes.error} onRetry={classes.reload} /> : classList.length === 0 && !classes.loading ? (
          <section className="ap-empty"><h3>No classes assigned</h3><p>Ask an administrator to assign you to a class.</p></section>
        ) : (
          <section className="ap-card">
            <div className="ap-form-grid">
              <div className="ap-field">
                <label htmlFor="att-class">Class</label>
                <span className="ap-select">
                  <select id="att-class" value={selected ?? ''} onChange={(event) => setClassId(Number(event.target.value))}>
                    {classList.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </span>
              </div>
              <div className="ap-field">
                <label htmlFor="att-date">Date</label>
                <input id="att-date" type="date" value={date} max={today()} onChange={(event) => event.target.value && setDate(event.target.value)} />
              </div>
            </div>

            {sheet.error ? <LoadError message={sheet.error} onRetry={sheet.reload} /> : (
              <>
                {sheet.data?.saved && <p className="ap-panel-note">A register was already saved for this date. Saving again updates it.</p>}
                <ul className="ap-picker" aria-label="Students" aria-busy={sheet.loading}>
                  {!sheet.loading && students.length === 0 && <li className="ap-picker-empty">No active students in this class.</li>}
                  {students.map((student) => (
                    <li key={student.id}>
                      <div className="ap-picker-row">
                        <Initials name={student.name} />
                        <span><strong>{student.name}</strong><small>{student.admissionNumber}</small></span>
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }} role="radiogroup" aria-label={`Attendance for ${student.name}`}>
                          {STATUSES.map((option) => (
                            <label key={option.value} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <input
                                type="radio"
                                name={`att-${student.id}`}
                                checked={(statuses.get(student.id) ?? 'present') === option.value}
                                onChange={() => setStatuses(new Map(statuses).set(student.id, option.value))}
                              />
                              {option.label}
                            </label>
                          ))}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="ap-panel-note">{students.length - counts.absent} present · {counts.late} of them late · {counts.absent} absent</p>

                <FormFooter>
                  <button type="button" className="ap-button light" onClick={() => setStatuses(new Map(students.map((student) => [student.id, 'present'])))}>Mark everyone present</button>
                  <button type="button" className="ap-button dark" disabled={busy || students.length === 0} onClick={save}>
                    {busy ? 'Saving…' : 'Save register'}<Icon name="arrowRight" size={16} />
                  </button>
                </FormFooter>
              </>
            )}
          </section>
        )}
        <button type="button" className="ap-text-link" onClick={() => navigate('/student-management')}>Back to students</button>
      </div>
    </AdminShell>
  );
}
