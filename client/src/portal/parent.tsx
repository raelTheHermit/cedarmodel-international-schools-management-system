import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrandMark, Icon } from './icons';
import { ParentShell } from './shells';
import {
  gradeFor,
  gradeScale,
  greetingForNow,
  ordinal,
  reportMeta,
  resolveParentStudent,
} from './data';

const SCHOOL_CONTACT = {
  office: 'Greenfield Academy',
  email: 'office@greenfieldacademy.edu',
  phone: '+234 803 555 0142',
};

type ParentLocationState = { parent?: { name?: string; admissionNumber?: string } } | null;

function useParentIdentity() {
  const location = useLocation();
  const parent = (location.state as ParentLocationState)?.parent;
  const resolved = resolveParentStudent(parent?.admissionNumber);
  return { ...resolved, navState: parent ? { parent } : undefined };
}

function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`sk ${className}`.trim()} aria-hidden="true" />;
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export type DashboardView = 'published' | 'awaiting' | 'loading' | 'error';

function DashboardSkeleton() {
  return (
    <div className="pp-page tight" aria-busy="true" aria-label="Loading overview">
      <div className="pp-sk-head">
        <Skeleton className="line w-92" />
        <Skeleton className="block w-430" />
        <Skeleton className="line w-390" />
      </div>

      <div className="pp-grid">
        <div className="pp-col">
          <section className="pp-card">
            <div className="pp-card-head">
              <div className="pp-sk-stack"><Skeleton className="line w-92" /><Skeleton className="block w-210" /></div>
              <Skeleton className="pill w-84" />
            </div>
            <div className="pp-rows">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="pp-row"><Skeleton className="line w-125" /><Skeleton className="line w-110" /></div>
              ))}
            </div>
          </section>

          <section className="pp-card">
            <div className="pp-card-head">
              <div className="pp-sk-stack"><Skeleton className="line w-92" /><Skeleton className="block w-210" /></div>
              <Skeleton className="pill w-112" />
            </div>
            <div className="pp-card-body sk-notice">
              <Skeleton className="circle" />
              <div className="pp-sk-stack grow">
                <Skeleton className="line w-280" />
                <Skeleton className="line w-430" />
                <Skeleton className="line w-260" />
              </div>
            </div>
          </section>
        </div>

        <aside className="pp-col">
          <div className="pp-status-card">
            <Skeleton className="line on-dark w-92" />
            <Skeleton className="block on-dark w-190" />
            <Skeleton className="line on-dark w-220" />
          </div>
          <section className="pp-card pp-help">
            <Skeleton className="line w-92" />
            <Skeleton className="block w-210" />
            <Skeleton className="line full" />
            <Skeleton className="block full tall" />
          </section>
          <section className="pp-card pp-secure">
            <Skeleton className="circle small" />
            <div className="pp-sk-stack grow"><Skeleton className="line w-92" /><Skeleton className="line w-220" /></div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function ParentDashboardPage({ view = 'published' }: { view?: DashboardView }) {
  const navigate = useNavigate();
  const { student, nameKnown, navState } = useParentIdentity();
  const firstName = student.name.split(' ')[0];

  if (view === 'loading') {
    return (
      <ParentShell section="overview" title="Overview" studentName={student.name} navState={navState}>
        <DashboardSkeleton />
      </ParentShell>
    );
  }

  if (view === 'error') {
    return (
      <ParentShell section="overview" title="Overview" studentName={student.name} navState={navState} capsLabel>
        <div className="pp-state-wrap">
          <section className="pp-state-card" role="alert">
            <span className="pp-state-icon error">!</span>
            <p className="pp-state-kicker error">Unable to load dashboard</p>
            <h2 className="pp-state-title">We couldn’t retrieve the dashboard information.</h2>
            <p className="pp-state-text">
              Check your connection and try again. If the problem continues, contact Miracle Schools for assistance.
            </p>
            <div className="pp-state-actions">
              <button type="button" className="pp-button dark" onClick={() => navigate('/parent-dashboard', { state: navState })}>
                Retry
              </button>
            </div>
          </section>
        </div>
      </ParentShell>
    );
  }

  const published = view === 'published';
  const statusLabel = published ? 'Published' : 'Awaiting publication';
  const studentInfo = [
    { label: 'Admission number', value: student.admissionNumber },
    { label: 'Class', value: student.className },
    { label: 'Academic session', value: student.session },
    { label: 'Current term', value: student.term },
  ];

  return (
    <ParentShell section="overview" title="Overview" studentName={student.name} navState={navState}>
      <div className="pp-page">
        <h2 className="pp-greeting">
          {greetingForNow()}{nameKnown ? `, ${firstName}’s parent.` : '.'}
        </h2>
        <p className="pp-greeting-sub">Here is the latest information for the current academic term.</p>

        <div className="pp-grid">
          <div className="pp-col">
            <section className="pp-card">
              <div className="pp-card-head">
                <div>
                  <p className="pp-kicker">Student Information</p>
                  <p className="pp-card-title">{student.name}</p>
                </div>
                <span className="pp-chip">Student profile</span>
              </div>
              <dl className="pp-rows">
                {studentInfo.map((item) => (
                  <div key={item.label} className="pp-row">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="pp-card">
              <div className="pp-card-head">
                <div>
                  <p className="pp-kicker">Current Term</p>
                  <p className="pp-card-title">{student.term} results</p>
                </div>
                <span className={published ? 'pp-pill success' : 'pp-pill warning'}>
                  <i />
                  {statusLabel}
                </span>
              </div>

              {published ? (
                <div className="pp-card-body cta">
                  <div>
                    <p className="pp-callout">The current-term report card is ready.</p>
                    <p className="pp-callout-text">
                      View the school-issued secondary report for {student.name}. This portal provides read-only access.
                    </p>
                  </div>
                  <button type="button" className="pp-button dark" onClick={() => navigate('/parent-results', { state: navState })}>
                    View results
                    <Icon name="arrowRight" size={16} />
                  </button>
                </div>
              ) : (
                <div className="pp-card-body notice">
                  <span className="pp-notice-icon"><Icon name="clock" size={17} /></span>
                  <div>
                    <p className="pp-callout">Results are being processed.</p>
                    <p className="pp-callout-text">
                      The current-term report is awaiting publication. It will become available here only after the school publishes it.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="pp-col">
            <section className={published ? 'pp-status-card' : 'pp-status-card awaiting'}>
              <p className="pp-status-kicker">Results Status</p>
              <p className="pp-status-value"><i />{statusLabel}</p>
              <p className="pp-status-text">Status for {student.term}, {student.session} academic session.</p>
            </section>

            <section className="pp-card pp-help">
              <p className="pp-kicker">Need Assistance?</p>
              <p className="pp-card-title">Contact the school</p>
              <p className="pp-help-text">
                For questions about access or results, contact the {SCHOOL_CONTACT.office} office directly.
              </p>
              <p className="pp-contact">{SCHOOL_CONTACT.email}</p>
              <p className="pp-contact">{SCHOOL_CONTACT.phone}</p>
            </section>

            <section className="pp-card pp-secure">
              <span className="pp-secure-icon"><Icon name="lock" size={15} /></span>
              <div>
                <p className="pp-kicker">Secure Access</p>
                <p className="pp-secure-text">
                  {published
                    ? 'This account is read-only and shows one student’s current-term results.'
                    : 'This account is read-only. Unpublished results remain securely restricted.'}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </ParentShell>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

export type ResultsView = 'published' | 'pending' | 'loading' | 'error';

function performanceLabel(average: number) {
  if (average >= 80) return 'Excellent performance';
  if (average >= 70) return 'Very good performance';
  if (average >= 60) return 'Good performance';
  if (average >= 50) return 'Fair performance';
  return 'Needs improvement';
}

function ReportBanner({
  title,
  right,
  session,
  term,
}: {
  title: string;
  right: ReactNode;
  session: string;
  term: string;
}) {
  return (
    <header className="pp-banner">
      <BrandMark size={48} className="on-dark" />
      <div className="pp-banner-copy">
        <p>Miracle Schools · Senior Secondary</p>
        <h2>{title}</h2>
        <small>{term} · {session} session</small>
      </div>
      {right}
    </header>
  );
}

function ResultsSkeleton() {
  return (
    <div className="pp-report" aria-busy="true" aria-label="Loading report card">
      <header className="pp-banner sk-banner">
        <Skeleton className="square on-dark" />
        <div className="pp-banner-copy">
          <Skeleton className="line on-dark w-90" />
          <Skeleton className="block on-dark w-290" />
          <Skeleton className="line on-dark w-145" />
        </div>
        <Skeleton className="pill on-dark w-145" />
      </header>

      <div className="pp-meta">
        {[0, 1].map((column) => (
          <div key={column} className="pp-meta-col">
            {[0, 1, 2].map((row) => (
              <div key={row} className="pp-meta-row"><Skeleton className="line w-115" /><Skeleton className="line w-105" /></div>
            ))}
          </div>
        ))}
      </div>

      <section className="pp-transcript">
        <div className="pp-transcript-head">
          <div className="pp-sk-stack"><Skeleton className="line w-100" /><Skeleton className="block w-210" /></div>
          <Skeleton className="line w-185" />
        </div>
        <div className="pp-sk-table">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="pp-sk-table-row">
              <Skeleton className="line w-145" />
              <Skeleton className="line w-26" /><Skeleton className="line w-26" /><Skeleton className="line w-26" /><Skeleton className="line w-26" /><Skeleton className="line w-26" />
              <Skeleton className="pill w-52" />
            </div>
          ))}
        </div>
      </section>

      <div className="pp-summary">
        <div className="pp-sk-stack"><Skeleton className="line w-90" /><Skeleton className="block w-105" /><Skeleton className="line w-145" /></div>
        <div className="pp-sk-pairs">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="pp-sk-stack"><Skeleton className="line w-115" /><Skeleton className="line w-70" /></div>
          ))}
        </div>
      </div>

      <div className="pp-details">
        {[0, 1, 2].map((card) => (
          <div key={card} className="pp-detail">
            <Skeleton className="line w-90" />
            <Skeleton className="block w-210" />
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="pp-detail-row"><Skeleton className="line w-115" /><Skeleton className="line w-105" /></div>
            ))}
          </div>
        ))}
      </div>

      <div className="pp-comment sk-comment">
        <div className="pp-sk-stack grow"><Skeleton className="line w-90" /><Skeleton className="line full" /><Skeleton className="line w-260" /><Skeleton className="line w-120" /></div>
        <div className="pp-sk-stack grow"><Skeleton className="line w-90" /><Skeleton className="line full" /><Skeleton className="line w-260" /><Skeleton className="line w-120" /></div>
      </div>

      <footer className="pp-report-footer"><Skeleton className="line on-dark w-110" /><Skeleton className="line on-dark w-220" /></footer>
    </div>
  );
}

export function ParentResultsPage({ view = 'published' }: { view?: ResultsView }) {
  const navigate = useNavigate();
  const { student, results, isSample, nameKnown, navState } = useParentIdentity();
  const capsLabel = view !== 'published';
  const shellProps = { section: 'results' as const, title: 'Results', studentName: student.name, navState, capsLabel };
  const backToOverview = () => navigate('/parent-dashboard', { state: navState });

  const back = (
    <button type="button" className="pp-back" onClick={backToOverview}>
      <Icon name="arrowLeft" size={13} />
      Back to overview
    </button>
  );

  if (view === 'loading') {
    return (
      <ParentShell {...shellProps}>
        <div className="pp-page report">
          {back}
          <ResultsSkeleton />
        </div>
      </ParentShell>
    );
  }

  const metaRows = [
    { label: 'Student', value: student.name },
    { label: 'Admission number', value: student.admissionNumber },
    { label: 'Class', value: isSample ? reportMeta.classLabel : student.className },
    { label: 'Department', value: isSample ? reportMeta.department : '—' },
    { label: 'Academic session', value: student.session },
    { label: 'Term', value: student.term },
  ];

  const meta = (
    <section className="pp-meta" aria-label="Student details">
      <div className="pp-meta-col">
        {[metaRows[0], metaRows[2], metaRows[4]].map((row) => (
          <div key={row.label} className="pp-meta-row"><span>{row.label}</span><strong>{row.value}</strong></div>
        ))}
      </div>
      <div className="pp-meta-col">
        {[metaRows[1], metaRows[3], metaRows[5]].map((row) => (
          <div key={row.label} className="pp-meta-row"><span>{row.label}</span><strong>{row.value}</strong></div>
        ))}
      </div>
    </section>
  );

  if (view === 'error') {
    return (
      <ParentShell {...shellProps}>
        <div className="pp-page report">
          {back}
          <div className="pp-report">
            <ReportBanner
              title="Academic result statement"
              session={student.session}
              term={student.term}
              right={<span className="pp-banner-pill error"><i />Report unavailable</span>}
            />
            <section className="pp-state-panel" role="alert">
              <span className="pp-state-icon error">!</span>
              <p className="pp-state-kicker error">Unable to load report</p>
              <h3 className="pp-state-title small">The report card could not be retrieved.</h3>
              <p className="pp-state-text">
                Check your connection and try again. If the problem continues, contact Miracle Schools for assistance.
              </p>
              <div className="pp-state-actions">
                <button type="button" className="pp-button dark" onClick={() => navigate('/parent-results', { state: navState })}>Retry</button>
                <button type="button" className="pp-button light" onClick={backToOverview}>Return to Parent Dashboard</button>
              </div>
            </section>
            <p className="pp-report-note"><Icon name="lock" size={13} />Your authenticated parent session remains active.</p>
          </div>
        </div>
      </ParentShell>
    );
  }

  if (view === 'pending') {
    return (
      <ParentShell {...shellProps}>
        <div className="pp-page report">
          {back}
          <div className="pp-report">
            <ReportBanner
              title="Current-term results"
              session={student.session}
              term={student.term}
              right={<span className="pp-banner-pill warning"><i />Awaiting publication</span>}
            />
            {meta}
            <section className="pp-state-panel">
              <span className="pp-state-icon warning"><Icon name="clock" size={22} /></span>
              <p className="pp-state-kicker warning">Results are being processed</p>
              <h3 className="pp-state-title small">Current-term results have not yet been published.</h3>
              <p className="pp-state-text">
                The school is still preparing and reviewing this term’s report. Subject scores, grades, and comments will remain unavailable until the completed results are officially published.
              </p>
              <div className="pp-state-actions">
                <button type="button" className="pp-button dark" onClick={backToOverview}>Return to Parent Dashboard</button>
              </div>
            </section>
            <p className="pp-report-note"><Icon name="lock" size={13} />No draft results or incomplete scores are visible in the Parent Portal.</p>
          </div>
        </div>
      </ParentShell>
    );
  }

  /* Published report card */
  const rows = results.map((result) => {
    const total = result.ca1 + result.ca2 + result.exam;
    return { ...result, total, grade: gradeFor(total), earned: total >= 40 };
  });
  const average = rows.reduce((sum, row) => sum + row.total, 0) / Math.max(rows.length, 1);
  const highest = rows.reduce((max, row) => Math.max(max, row.total), 0);
  const creditsEarned = rows.filter((row) => row.earned).length;
  const { schoolDays, present } = reportMeta.attendance;
  const absent = schoolDays - present;
  const attendanceRate = (present / schoolDays) * 100;

  return (
    <ParentShell {...shellProps}>
      <div className="pp-page report">
        {back}
        <div className="pp-report">
          <ReportBanner
            title="Academic result statement"
            session={student.session}
            term={student.term}
            right={<span className="pp-banner-pill"><Icon name="lock" size={12} />Official view-only record</span>}
          />
          {meta}

          <section className="pp-transcript">
            <div className="pp-transcript-head">
              <div>
                <p className="pp-kicker small">Academic transcript</p>
                <h3 className="pp-section-title">Subject result breakdown</h3>
              </div>
              <p className="pp-scale-note">CA 1: 20 · CA 2: 20 · Examination: 60</p>
            </div>

            <div className="pp-table-wrap">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th scope="col">Subject</th>
                    <th scope="col">CA 1</th>
                    <th scope="col">CA 2</th>
                    <th scope="col">Exam</th>
                    <th scope="col">Total</th>
                    <th scope="col">Grade</th>
                    <th scope="col">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.subject}>
                      <th scope="row">{row.subject}</th>
                      <td>{row.ca1}</td>
                      <td>{row.ca2}</td>
                      <td>{row.exam}</td>
                      <td className="total">{row.total}</td>
                      <td><span className={`pp-grade grade-${row.grade.toLowerCase()}`}>{row.grade}</span></td>
                      <td><span className={row.earned ? 'pp-credit earned' : 'pp-credit'}>{row.earned ? 'Earned' : 'Not earned'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pp-summary" aria-label="Summary">
            <div className="pp-average">
              <p className="pp-kicker small">Overall average</p>
              <p className="pp-average-value">{average.toFixed(1)}<span>%</span></p>
              <p className="pp-average-note">{performanceLabel(average)}</p>
            </div>
            <div className="pp-summary-grid">
              <div><span>Class position</span><strong>{ordinal(reportMeta.position.rank)} of {reportMeta.position.of}</strong></div>
              <div><span>Subjects offered</span><strong>{rows.length}</strong></div>
              <div><span>Credits earned</span><strong>{creditsEarned} of {rows.length}</strong></div>
              <div><span>Highest total</span><strong>{highest} / 100</strong></div>
            </div>
          </section>

          <section className="pp-details">
            <div className="pp-detail">
              <p className="pp-kicker small">Attendance record</p>
              <h3 className="pp-section-title small">Term attendance</h3>
              <dl className="pp-detail-list">
                <div><dt>School days</dt><dd>{schoolDays}</dd></div>
                <div><dt>Days present</dt><dd>{present}</dd></div>
                <div><dt>Days absent</dt><dd>{absent}</dd></div>
                <div><dt>Attendance rate</dt><dd>{attendanceRate.toFixed(1)}%</dd></div>
              </dl>
            </div>

            <div className="pp-detail">
              <p className="pp-kicker small">Student record</p>
              <h3 className="pp-section-title small">Conduct and activities</h3>
              <dl className="pp-detail-list">
                <div><dt>Conduct</dt><dd>{reportMeta.record.conduct}</dd></div>
                <div><dt>Punctuality</dt><dd>{reportMeta.record.punctuality}</dd></div>
                <div><dt>House</dt><dd>{reportMeta.record.house}</dd></div>
                <div><dt>Club</dt><dd>{reportMeta.record.club}</dd></div>
              </dl>
            </div>

            <div className="pp-detail">
              <p className="pp-kicker small">Grade key</p>
              <h3 className="pp-section-title small">Secondary grading scale</h3>
              <ul className="pp-grade-key">
                {gradeScale.map((band) => (
                  <li key={band.grade}><b>{band.grade}</b><span>{band.min}-{band.max}</span></li>
                ))}
              </ul>
            </div>
          </section>

          <section className="pp-comment">
            <p className="pp-kicker small">Class teacher’s comment</p>
            <p className="pp-comment-text">
              {isSample && nameKnown ? reportMeta.comment : 'No class teacher’s comment has been recorded for this term.'}
            </p>
            {isSample && <small>{reportMeta.teacher} · Class teacher</small>}
          </section>

          <footer className="pp-report-footer">
            <div>
              <small>Next term begins</small>
              <strong>{reportMeta.nextTermBegins}</strong>
            </div>
            <p><Icon name="lock" size={13} />This result statement is strictly view-only.</p>
          </footer>
        </div>
      </div>
    </ParentShell>
  );
}
