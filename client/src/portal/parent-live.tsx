import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ParentReport } from '../api';
import { ParentShell } from './shells';

export function ParentReportPage({ resultsOnly = false }: { resultsOnly?: boolean }) {
  const [report, setReport] = useState<ParentReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    api.getParentReport().then((value) => { if (!cancelled) setReport(value); })
      .catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load your child’s report.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const name = report?.student.name ?? 'Parent';
  return <ParentShell section={resultsOnly ? 'results' : 'overview'} title={resultsOnly ? 'Student Results' : 'Parent Overview'} studentName={name}>
    <div className="pp-page tight">
      {loading ? <section className="pp-card"><p>Loading verified school records…</p></section>
        : error ? <section className="pp-card" role="alert"><h2>Could not load report</h2><p>{error}</p></section>
          : report && <>
            <header className="pp-page-head"><p className="pp-kicker">{report.school.name || 'School report'}</p><h2>{report.student.name}</h2><p>{report.student.admissionNumber} · {report.student.className}</p>
              {report.term && <p>{report.term.name} · {report.term.session}</p>}</header>
            {report.status === 'pending' ? <section className="pp-card"><h3>No published results yet</h3><p>Your child’s report will appear here after the school publishes results for the current term.</p></section>
              : <>
                <section className="pp-card"><h3>Academic summary</h3><p>Average: <strong>{report.summary?.average}%</strong> · Highest: <strong>{report.summary?.highest}</strong> · Credits: <strong>{report.summary?.creditsEarned}</strong></p><p>Class position: {report.summary?.position.rank} of {report.summary?.position.of}</p>
                  <div className="ap-table"><div className="ap-table-head"><span>Subject</span><span>CA1</span><span>CA2</span><span>Exam</span><span>Total / Grade</span></div>{report.subjects?.map((subject) => <div className="ap-table-row" key={subject.subject}><strong>{subject.subject}</strong><span>{subject.ca1}</span><span>{subject.ca2}</span><span>{subject.exam}</span><span>{subject.total} · {subject.grade}</span></div>)}</div>
                </section>
                {report.attendance && <section className="pp-card"><h3>Attendance</h3><p>{report.attendance.present} of {report.attendance.schoolDays} school days present</p></section>}
                {report.comment && <section className="pp-card"><h3>Class teacher’s comment</h3><p>{report.comment}</p></section>}
              </>}
            <footer className="pp-card"><h3>School contact</h3><p>{report.school.email || '—'} · {report.school.phone || '—'}</p>{report.term?.nextTermBegins && <p>Next term begins {new Date(`${report.term.nextTermBegins}T00:00:00`).toLocaleDateString()}</p>}</footer>
          </>}
    </div>
  </ParentShell>;
}
