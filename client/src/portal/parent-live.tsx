import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { ParentReport } from '../api';
import { useLoad } from './admin-live';
import { greetingForNow, ordinal } from './data';
import { BrandMark, Icon } from './icons';
import { ParentShell } from './shells';

function performanceLabel(average: number) {
  if (average >= 80) return 'Excellent performance';
  if (average >= 70) return 'Very good performance';
  if (average >= 60) return 'Good performance';
  if (average >= 50) return 'Fair performance';
  return 'Needs improvement';
}

function useReport() {
  return useLoad(() => api.getParentReport(), []);
}

function ErrorCard({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack?: () => void }) {
  return (
    <div className="pp-state-wrap">
      <section className="pp-state-card" role="alert">
        <span className="pp-state-icon error">!</span>
        <p className="pp-state-kicker error">Unable to load</p>
        <h2 className="pp-state-title">We couldn’t retrieve this information.</h2>
        <p className="pp-state-text">{message}</p>
        <div className="pp-state-actions">
          <button type="button" className="pp-button dark" onClick={onRetry}>Retry</button>
          {onBack && <button type="button" className="pp-button light" onClick={onBack}>Return to Parent Dashboard</button>}
        </div>
      </section>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="pp-state-wrap" aria-busy="true" aria-label={label}>
      <section className="pp-state-card"><p className="pp-state-text">Loading…</p></section>
    </div>
  );
}

function contactLines(report: ParentReport): ReactNode {
  const { email, phone } = report.school;
  if (!email && !phone) return <p className="pp-contact">Please contact the school office.</p>;
  return (
    <>
      {email && <p className="pp-contact">{email}</p>}
      {phone && <p className="pp-contact">{phone}</p>}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export function ParentDashboardPage() {
  const navigate = useNavigate();
  const report = useReport();
  const data = report.data;
  const shell = { section: 'overview' as const, title: 'Overview', studentName: data?.student.name ?? 'Student', schoolName: data?.school.name };

  if (report.loading && !data) return <ParentShell {...shell}><Loading label="Loading overview" /></ParentShell>;
  if (!data) return <ParentShell {...shell}><ErrorCard message={report.error || 'Check your connection and try again.'} onRetry={report.reload} /></ParentShell>;

  const published = data.status === 'published';
  const termLabel = data.term ? `${data.term.name} · ${data.term.session}` : 'No current term';
  const schoolName = data.school.name || 'the school';
  const firstName = data.student.name.split(' ')[0];

  const info = [
    { label: 'Admission number', value: data.student.admissionNumber },
    { label: 'Class', value: data.student.className },
    { label: 'Academic session', value: data.term?.session ?? '—' },
    { label: 'Current term', value: data.term?.name ?? '—' },
  ];

  return (
    <ParentShell {...shell}>
      <div className="pp-page">
        <h2 className="pp-greeting">{greetingForNow()}, {firstName}’s parent.</h2>
        <p className="pp-greeting-sub">Here is the latest information for the current academic term.</p>

        <div className="pp-grid">
          <div className="pp-col">
            <section className="pp-card">
              <div className="pp-card-head">
                <div><p className="pp-kicker">Student Information</p><p className="pp-card-title">{data.student.name}</p></div>
                <span className="pp-chip">Student profile</span>
              </div>
              <dl className="pp-rows">
                {info.map((item) => (
                  <div key={item.label} className="pp-row"><dt>{item.label}</dt><dd>{item.value}</dd></div>
                ))}
              </dl>
            </section>

            <section className="pp-card">
              <div className="pp-card-head">
                <div><p className="pp-kicker">Current Term</p><p className="pp-card-title">{data.term ? `${data.term.name} results` : 'Results'}</p></div>
                <span className={published ? 'pp-pill success' : 'pp-pill warning'}><i />{published ? 'Published' : 'Awaiting publication'}</span>
              </div>

              {published ? (
                <div className="pp-card-body cta">
                  <div>
                    <p className="pp-callout">The current-term report card is ready.</p>
                    <p className="pp-callout-text">View the school-issued report for {data.student.name}. This portal provides read-only access.</p>
                  </div>
                  <button type="button" className="pp-button dark" onClick={() => navigate('/parent-results')}>View results<Icon name="arrowRight" size={16} /></button>
                </div>
              ) : (
                <div className="pp-card-body notice">
                  <span className="pp-notice-icon"><Icon name="clock" size={17} /></span>
                  <div>
                    <p className="pp-callout">Results are being processed.</p>
                    <p className="pp-callout-text">The current-term report is awaiting publication. It will become available here only after {schoolName} publishes it.</p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="pp-col">
            <section className={published ? 'pp-status-card' : 'pp-status-card awaiting'}>
              <p className="pp-status-kicker">Results Status</p>
              <p className="pp-status-value"><i />{published ? 'Published' : 'Awaiting publication'}</p>
              <p className="pp-status-text">Status for {termLabel}.</p>
            </section>

            <section className="pp-card pp-help">
              <p className="pp-kicker">Need Assistance?</p>
              <p className="pp-card-title">Contact the school</p>
              <p className="pp-help-text">For questions about access or results, contact {schoolName} directly.</p>
              {contactLines(data)}
            </section>

            <section className="pp-card pp-secure">
              <span className="pp-secure-icon"><Icon name="lock" size={15} /></span>
              <div>
                <p className="pp-kicker">Secure Access</p>
                <p className="pp-secure-text">{published ? 'This account is read-only and shows one student’s current-term results.' : 'This account is read-only. Unpublished results remain securely restricted.'}</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </ParentShell>
  );
}

/* ------------------------------------------------------------------ */
/* Report card                                                         */
/* ------------------------------------------------------------------ */

function Banner({ report, title, right }: { report: ParentReport; title: string; right: ReactNode }) {
  return (
    <header className="pp-banner">
      <BrandMark size={48} className="on-dark" />
      <div className="pp-banner-copy">
        <p>{report.school.name || 'School results'}</p>
        <h2>{title}</h2>
        <small>{report.term ? `${report.term.name} · ${report.term.session} session` : ''}</small>
      </div>
      {right}
    </header>
  );
}

export function ParentResultsPage() {
  const navigate = useNavigate();
  const report = useReport();
  const data = report.data;
  const shell = { section: 'results' as const, title: 'Results', studentName: data?.student.name ?? 'Student', schoolName: data?.school.name };
  const backToOverview = () => navigate('/parent-dashboard');

  const back = (
    <button type="button" className="pp-back" onClick={backToOverview}><Icon name="arrowLeft" size={13} />Back to overview</button>
  );

  if (report.loading && !data) return <ParentShell {...shell}><div className="pp-page report">{back}<Loading label="Loading report card" /></div></ParentShell>;
  if (!data) return <ParentShell {...shell}><div className="pp-page report">{back}<ErrorCard message={report.error || 'Check your connection and try again.'} onRetry={report.reload} onBack={backToOverview} /></div></ParentShell>;

  const meta = (
    <section className="pp-meta" aria-label="Student details">
      <div className="pp-meta-col">
        <div className="pp-meta-row"><span>Student</span><strong>{data.student.name}</strong></div>
        <div className="pp-meta-row"><span>Class</span><strong>{data.student.className}</strong></div>
        <div className="pp-meta-row"><span>Academic session</span><strong>{data.term?.session ?? '—'}</strong></div>
      </div>
      <div className="pp-meta-col">
        <div className="pp-meta-row"><span>Admission number</span><strong>{data.student.admissionNumber}</strong></div>
        <div className="pp-meta-row"><span>Term</span><strong>{data.term?.name ?? '—'}</strong></div>
      </div>
    </section>
  );

  if (data.status !== 'published' || !data.subjects || !data.summary) {
    return (
      <ParentShell {...shell} capsLabel>
        <div className="pp-page report">
          {back}
          <div className="pp-report">
            <Banner report={data} title="Current-term results" right={<span className="pp-banner-pill warning"><i />Awaiting publication</span>} />
            {meta}
            <section className="pp-state-panel">
              <span className="pp-state-icon warning"><Icon name="clock" size={22} /></span>
              <p className="pp-state-kicker warning">Results are being processed</p>
              <h3 className="pp-state-title small">Current-term results have not yet been published.</h3>
              <p className="pp-state-text">The school is still preparing and reviewing this term’s report. Scores, grades, and comments stay unavailable until the results are officially published.</p>
              <div className="pp-state-actions"><button type="button" className="pp-button dark" onClick={backToOverview}>Return to Parent Dashboard</button></div>
            </section>
            <p className="pp-report-note"><Icon name="lock" size={13} />No draft results or incomplete scores are visible in the Parent Portal.</p>
          </div>
        </div>
      </ParentShell>
    );
  }

  const { subjects, summary, attendance, comment } = data;
  const absent = attendance ? attendance.schoolDays - attendance.present : 0;

  return (
    <ParentShell {...shell}>
      <div className="pp-page report">
        {back}
        <div className="pp-report">
          <Banner report={data} title="Academic result statement" right={<span className="pp-banner-pill"><Icon name="lock" size={12} />Official view-only record</span>} />
          {meta}

          <section className="pp-transcript">
            <div className="pp-transcript-head">
              <div><p className="pp-kicker small">Academic transcript</p><h3 className="pp-section-title">Subject result breakdown</h3></div>
              <p className="pp-scale-note">CA 1: 20 · CA 2: 20 · Examination: 60</p>
            </div>
            <div className="pp-table-wrap">
              <table className="pp-table">
                <thead>
                  <tr><th scope="col">Subject</th><th scope="col">CA 1</th><th scope="col">CA 2</th><th scope="col">Exam</th><th scope="col">Total</th><th scope="col">Grade</th><th scope="col">Credit</th></tr>
                </thead>
                <tbody>
                  {subjects.map((row) => (
                    <tr key={row.subject}>
                      <th scope="row">{row.subject}</th>
                      <td>{row.ca1}</td><td>{row.ca2}</td><td>{row.exam}</td>
                      <td className="total">{row.total}</td>
                      <td><span className={`pp-grade grade-${row.grade.toLowerCase()}`}>{row.grade}</span></td>
                      <td><span className={row.credit ? 'pp-credit earned' : 'pp-credit'}>{row.credit ? 'Earned' : 'Not earned'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pp-summary" aria-label="Summary">
            <div className="pp-average">
              <p className="pp-kicker small">Overall average</p>
              <p className="pp-average-value">{summary.average.toFixed(1)}<span>%</span></p>
              <p className="pp-average-note">{performanceLabel(summary.average)}</p>
            </div>
            <div className="pp-summary-grid">
              <div><span>Class position</span><strong>{ordinal(summary.position.rank)} of {summary.position.of}</strong></div>
              <div><span>Subjects offered</span><strong>{summary.subjectCount}</strong></div>
              <div><span>Credits earned</span><strong>{summary.creditsEarned} of {summary.subjectCount}</strong></div>
              <div><span>Highest total</span><strong>{summary.highest} / 100</strong></div>
            </div>
          </section>

          <section className="pp-details">
            {attendance && (
              <div className="pp-detail">
                <p className="pp-kicker small">Attendance record</p>
                <h3 className="pp-section-title small">Term attendance</h3>
                <dl className="pp-detail-list">
                  <div><dt>School days</dt><dd>{attendance.schoolDays}</dd></div>
                  <div><dt>Days present</dt><dd>{attendance.present}</dd></div>
                  <div><dt>Days absent</dt><dd>{absent}</dd></div>
                  <div><dt>Attendance rate</dt><dd>{attendance.schoolDays ? ((attendance.present / attendance.schoolDays) * 100).toFixed(1) : '0.0'}%</dd></div>
                </dl>
              </div>
            )}

            <div className="pp-detail">
              <p className="pp-kicker small">Grade key</p>
              <h3 className="pp-section-title small">Grading scale</h3>
              <ul className="pp-grade-key">
                {(data.gradeScale ?? []).map((band) => (
                  <li key={band.grade}><b>{band.grade}</b><span>{band.min}-{band.max}</span></li>
                ))}
              </ul>
            </div>
          </section>

          {comment && (
            <section className="pp-comment">
              <p className="pp-kicker small">Class teacher’s comment</p>
              <p className="pp-comment-text">{comment}</p>
            </section>
          )}

          <footer className="pp-report-footer">
            <div><small>Next term begins</small><strong>{data.term?.nextTermBegins ?? 'To be announced'}</strong></div>
            <p><Icon name="lock" size={13} />This result statement is strictly view-only.</p>
          </footer>
        </div>
      </div>
    </ParentShell>
  );
}
