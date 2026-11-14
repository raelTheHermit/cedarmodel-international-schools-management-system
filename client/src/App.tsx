import { useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api';
import brandIcon from './assets/icons/logo.png';
import lockIcon from './assets/icons/lock icon2.svg';
import parentIcon from './assets/icons/parent login.svg';
import adminIcon from './assets/icons/admin login.svg';

function AssetIcon({ src, alt = '', className = '' }: { src: string; alt?: string; className?: string }) {
  return <img src={src} alt={alt} className={className} />;
}

type Role = 'superadmin' | 'teacher';
type AccountRole = 'superadmin' | 'teacher' | 'parent';
type StaffAccount = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

function AuthSplitLayout({
  children,
  rightContent,
}: {
  children: React.ReactNode;
  rightContent: React.ReactNode;
}) {
  return (
    <div className="auth-shell">
      <section className="auth-panel">{children}</section>
      <aside className="auth-hero">{rightContent}</aside>
    </div>
  );
}

type StudentRecord = {
  id: number;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  className: string;
  parentPhone: string;
  active: boolean;
  attendance: number;
  eligibleForPromotion: boolean;
};

const initialStudents: StudentRecord[] = [
  { id: 1, firstName: 'Ada', lastName: 'Okafor', admissionNumber: 'ADM-0001', className: 'Primary 4', parentPhone: '08031234567', active: true, attendance: 96, eligibleForPromotion: true },
  { id: 2, firstName: 'Femi', lastName: 'Bello', admissionNumber: 'ADM-0002', className: 'Primary 4', parentPhone: '08036543210', active: true, attendance: 91, eligibleForPromotion: true },
  { id: 3, firstName: 'Tosin', lastName: 'Adeyemi', admissionNumber: 'ADM-0003', className: 'Primary 5', parentPhone: '07023456789', active: true, attendance: 88, eligibleForPromotion: false },
  { id: 4, firstName: 'Ruth', lastName: 'Nwosu', admissionNumber: 'ADM-0004', className: 'Primary 4', parentPhone: '08123456789', active: true, attendance: 94, eligibleForPromotion: true },
  { id: 5, firstName: 'Nnamdi', lastName: 'Ahaneku', admissionNumber: 'ADM-0005', className: 'JSS 1', parentPhone: '09034567890', active: true, attendance: 85, eligibleForPromotion: false },
  { id: 6, firstName: 'Chinelo', lastName: 'Eze', admissionNumber: 'ADM-0006', className: 'Primary 5', parentPhone: '08049876543', active: true, attendance: 90, eligibleForPromotion: false },
  { id: 7, firstName: 'Musa', lastName: 'Ibrahim', admissionNumber: 'ADM-0007', className: 'Primary 4', parentPhone: '08111223344', active: false, attendance: 82, eligibleForPromotion: true },
];

const seededSuperadmins: StaffAccount[] = [
  { name: 'Vice Principal', email: 'viceprincipal@cedarmodel.local', password: 'VicePrincipal123!', role: 'superadmin' },
  { name: 'School Administrator', email: 'administrator@cedarmodel.local', password: 'SchoolAdmin123!', role: 'superadmin' },
  { name: 'Developer', email: 'developer@cedarmodel.local', password: 'Developer123!', role: 'superadmin' },
];

const seededParents = [
  { name: 'Aisha Adebayo', admissionNumber: 'ADM-0001', accessCode: 'CODE1234' },
  { name: 'Femi Bello', admissionNumber: 'ADM-0002', accessCode: 'CODE2345' },
  { name: 'Tosin Adeyemi', admissionNumber: 'ADM-0003', accessCode: 'CODE3456' },
];

const publishedParentResults: Record<string, Array<{ subject: string; score: string; grade: string }>> = {
  'ADM-0001': [
    { subject: 'English', score: '92', grade: 'A1' },
    { subject: 'Mathematics', score: '88', grade: 'A1' },
    { subject: 'Science', score: '90', grade: 'A1' },
    { subject: 'Social Studies', score: '87', grade: 'A1' },
  ],
  'ADM-0002': [
    { subject: 'English', score: '81', grade: 'B2' },
    { subject: 'Mathematics', score: '86', grade: 'A2' },
    { subject: 'Science', score: '79', grade: 'B3' },
    { subject: 'Computer Studies', score: '90', grade: 'A1' },
  ],
  'ADM-0003': [
    { subject: 'English', score: '76', grade: 'B3' },
    { subject: 'Mathematics', score: '80', grade: 'B2' },
    { subject: 'Biology', score: '82', grade: 'B2' },
    { subject: 'Civic Education', score: '78', grade: 'B3' },
  ],
};

const defaultUserForm = {
  name: '',
  email: '',
  password: '',
  accountRole: 'superadmin' as AccountRole,
  admissionNumber: '',
  accessCode: '',
};

function LandingPage() {
  const navigate = useNavigate();

  return (
    <AuthSplitLayout
      rightContent={(
        <>
          <div className="auth-hero-badge">
            <AssetIcon src={lockIcon} className="hero-icon" alt="" />
            <span>Secure school access</span>
          </div>
          <h2>One portal.<br />The right access for you.</h2>
          <p>Results and school administration, protected by role-based access.</p>
        </>
      )}
    >
      <div className="role-select-header">
        <button type="button" className="portal-back-link" onClick={() => navigate('/')} aria-label="Choose access type">
          Choose access type
        </button>
        <div className="brand-mark dark" aria-hidden="true"><AssetIcon src={brandIcon} alt="" /></div>
      </div>

      <div className="brand-block">
        <div className="brand-name">MIRACLE SCHOOLS</div>
      </div>

      <div className="welcome-copy">
        <h1>Welcome to the<br />School Results Portal</h1>
        <p>Choose how you want to access the portal.</p>
      </div>

      <div className="portal-choice-grid">
        <button type="button" className="portal-choice" onClick={() => navigate('/parent-login')}>
          <span className="portal-choice-icon"><AssetIcon src={parentIcon} alt="" /></span>
          <div className="portal-choice-copy">
            <span className="portal-tag">Parent login</span>
            <small>View your child’s current results securely.</small>
          </div>
          <span className="portal-arrow">→</span>
        </button>

        <button type="button" className="portal-choice" onClick={() => navigate('/admin-login')}>
          <span className="portal-choice-icon"><AssetIcon src={adminIcon} alt="" /></span>
          <div className="portal-choice-copy">
            <span className="portal-tag">Admin login</span>
            <small>Authorised school administrators only.</small>
          </div>
          <span className="portal-arrow">→</span>
        </button>
      </div>
    </AuthSplitLayout>
  );
}

function StaffLoginPage() {
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '').trim();

    try {
      const result = await api.loginStaff({ email, password });
      navigate('/staff-dashboard', {
        state: {
          role: result.user.role,
          name: result.user.email,
        },
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Invalid credentials. Please use a valid school account.');
    }
  };

  return (
    <AuthSplitLayout
      rightContent={(
        <>
          <div className="auth-hero-badge">
            <AssetIcon src={lockIcon} className="hero-icon" alt="" />
            <span>Authorised administrators</span>
          </div>
          <h2>Manage results.<br />Support every learner.</h2>
          <p>Secure access to the Miracle Schools administration portal.</p>
        </>
      )}
    >
      <div className="role-select-header">
        <button type="button" className="portal-back-link" onClick={() => navigate('/')} aria-label="Choose access type">
          Choose access type
        </button>
      </div>

      <div className="brand-mark dark login-mark" aria-hidden="true"><AssetIcon src={brandIcon} alt="" /></div>
      <div className="brand-block">
        <div className="brand-name">MIRACLE SCHOOLS</div>
      </div>

      <div className="welcome-copy compact">
        <h1>Admin login</h1>
        <p>Sign in with your authorised school administrator account.</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          <span>Email address</span>
          <input type="email" name="email" placeholder="Email address" />
        </label>
        <label>
          <span>Password</span>
          <div className="password-field">
            <input type="password" name="password" placeholder="Password" />
            <span className="password-toggle" aria-hidden="true">◉</span>
          </div>
        </label>
        <button type="submit" className="primary-login-button">Log in</button>
      </form>

      <p className="access-note">Access is limited to authorised administrators.<br />Contact the school if you need assistance.</p>
    </AuthSplitLayout>
  );
}

function ParentLoginPage() {
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const admissionNumber = String(formData.get('admissionNumber') ?? '').trim();
    const accessCode = String(formData.get('accessCode') ?? '').trim();

    try {
      const result = await api.loginParent({ admissionNumber, accessCode });
      const selectedParent = seededParents.find((account) => account.admissionNumber === result.user.admissionNumber) ?? {
        name: 'Parent',
        admissionNumber: result.user.admissionNumber,
        accessCode,
      };

      navigate('/parent-dashboard', { state: { parent: selectedParent } });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Invalid credentials. Please use a valid parent account.');
    }
  };

  return (
    <div className="parent-login-shell">
      <section className="parent-login-panel">
        <button type="button" className="parent-login-back" onClick={() => navigate('/')}>
          ← Choose access type
        </button>

        <div className="parent-login-brand" aria-hidden="true"><AssetIcon src={brandIcon} alt="" /></div>

        <h1 className="parent-login-title">Parent login</h1>

        <form className="parent-login-form" onSubmit={handleSubmit}>
          <label>
            <span>Admission number</span>
            <input type="text" name="admissionNumber" defaultValue="123456789" placeholder="123456789" />
          </label>

          <label>
            <span>Access code</span>
            <div className="password-lockup">
              <input type="password" name="accessCode" defaultValue="CODE1234" placeholder="Access code" />
              <span className="eye-icon" aria-hidden="true">◌</span>
            </div>
          </label>

          <button type="submit" className="parent-login-button">Log in</button>
        </form>

        <div className="parent-disclaimer">
          <span>Having trouble accessing your account?</span>
          <span>Please contact your child’s school.</span>
        </div>
      </section>

      <aside className="parent-login-hero">
        <h2>Your child’s results, safely in your hands.</h2>

        <div className="hero-label-row">
          <span className="lock-mini"><AssetIcon src={lockIcon} alt="" /></span>
          <span>Secure parent access</span>
        </div>

        <div className="term-card">
          <div className="term-card-header">ACADEMIC PROGRESS</div>
          <div className="term-card-title">Second term</div>
          <div className="term-card-meta">• Published</div>

          <div className="term-graph" aria-hidden="true">
            <span className="curve" />
          </div>

          <div className="term-scale">
            <span>1ST</span>
            <span>2ND</span>
            <span>3RD</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ParentDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const parent = (location.state as { parent?: { name: string; admissionNumber: string } } | null)?.parent;
  const studentName = 'Amina Okafor';
  const admissionNumber = parent?.admissionNumber ?? 'SCH/2025/0142';
  const [status] = useState<'published' | 'processing' | 'error'>('published');

  const studentInfo = [
    { label: 'Admission number', value: admissionNumber },
    { label: 'Class', value: 'JSS 2A' },
    { label: 'Academic session', value: '2025/2026' },
    { label: 'Current term', value: 'Second term' },
  ];

  return (
    <div className="parent-portal-shell">
      <aside className="parent-sidebar">
        <div className="parent-brand">
          <div className="brand-badge"><AssetIcon src={brandIcon} alt="" /></div>
          <div className="brand-copy">
            <span className="brand-title">MIRACLE SCHOOL</span>
            <small>Parent Portal</small>
          </div>
        </div>

        <nav className="parent-nav" aria-label="Parent navigation">
          <button type="button" className="parent-nav-item active">
            <span className="nav-icon">⌂</span>
            Overview
          </button>
          <button type="button" className="parent-nav-item" onClick={() => navigate('/parent-results')}>
            <span className="nav-icon">▣</span>
            Results
          </button>
        </nav>

        <button type="button" className="parent-logout" onClick={() => navigate('/')}>
          <span>↩</span>
          Log out
        </button>
      </aside>

      <main className="parent-main-panel">
        <header className="parent-topbar">
          <div className="parent-portal-label">Parent Portal</div>
          <button type="button" className="parent-avatar" aria-label="User profile">AO</button>
        </header>

        <div className="parent-page-content">
          <h1 className="parent-title">Good morning, {parent?.name ? `${parent.name.split(' ')[0]}'s parent.` : 'Amina\'s parent.'}</h1>
          <p className="parent-subtitle">Here is the latest information for the current academic term.</p>

          <div className="parent-grid">
            <div className="parent-main-column">
              <section className="parent-card form-card">
                <div className="card-header compact-header">
                  <span>Student Information</span>
                  <span className="inline-tag">Student profile</span>
                </div>

                <div className="student-name-row">{studentName}</div>

                <div className="data-list">
                  {studentInfo.map((item) => (
                    <div key={item.label} className="data-row">
                      <span className="data-label">{item.label}</span>
                      <span className="data-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="parent-card results-panel">
                <div className="card-header compact-header">
                  <span>Current Term</span>
                  {status === 'published' && <span className="status-pill success">Published</span>}
                  {status === 'processing' && <span className="status-pill warning">Awaiting publication</span>}
                  {status === 'error' && <span className="status-pill error">Unavailable</span>}
                </div>

                <h2 className="results-title">Second term results</h2>

                {status === 'published' && (
                  <div className="result-cta-box">
                    <div className="callout-text">The current-term report card is ready.</div>
                    <p>
                      View the school-issued secondary report for Amina Okafor. This portal provides read-only access.
                    </p>
                    <button type="button" className="dark-button" onClick={() => navigate('/parent-results')}>
                      View results
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                )}

                {status === 'processing' && (
                  <div className="result-cta-box processing">
                    <div className="processing-icon">◌</div>
                    <div className="callout-text">Results are being processed.</div>
                    <p>
                      The current-term report is awaiting publication. It will become available here only after the school publishes it.
                    </p>
                  </div>
                )}

                {status === 'error' && (
                  <div className="error-box">
                    <div className="error-badge">!</div>
                    <div className="callout-text error-title">Unable to load dashboard</div>
                    <p>
                      We couldn’t retrieve the dashboard information. Check your connection and try again.
                    </p>
                    <button type="button" className="dark-button small-button" onClick={() => navigate('/parent-dashboard')}>
                      Retry
                    </button>
                  </div>
                )}
              </section>
            </div>

            <aside className="parent-side-column">
              <div className="status-card dark-card">
                <h3>Results Status</h3>
                <div className="status-line">
                  <span className="dot" />
                  <span>{status === 'published' ? 'Published' : status === 'processing' ? 'Awaiting publication' : 'Unavailable'}</span>
                </div>
                <p>
                  {status === 'published'
                    ? 'Status for second term, 2025/2026 academic session.'
                    : status === 'processing'
                      ? 'Status for second term, 2025/2026 academic session.'
                      : 'Status for second term, 2025/2026 academic session.'}
                </p>
              </div>

              <div className="help-card">
                <h4>Need Assistance?</h4>
                <div className="help-title">Contact the school</div>
                <p>For questions about access or results, contact the Greenfield Academy office directly.</p>
                <div className="contact-box">office@greenfieldacademy.edu</div>
                <div className="contact-box">+234 803 555 0142</div>
              </div>

              <div className="help-card secure-card">
                <div className="secure-header">
                  <span className="lock-icon"><AssetIcon src={lockIcon} alt="" /></span>
                  <span>Secure Access</span>
                </div>
                <p>This account is read-only. Unpublished results remain securely restricted.</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function ParentResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const parent = (location.state as { parent?: { name: string; admissionNumber: string } } | null)?.parent;
  const studentName = parent?.name ?? 'Amina Okafor';
  const admissionNumber = parent?.admissionNumber ?? 'SCH/2025/0142';
  const results = publishedParentResults[admissionNumber] ?? [
    { subject: 'English Language', score: '87', grade: 'A' },
    { subject: 'General Mathematics', score: '93', grade: 'A' },
    { subject: 'Biology', score: '85', grade: 'A' },
    { subject: 'Chemistry', score: '83', grade: 'A' },
    { subject: 'Physics', score: '81', grade: 'A' },
    { subject: 'Further Mathematics', score: '74', grade: 'B' },
    { subject: 'Economics', score: '79', grade: 'B' },
    { subject: 'Civic Education', score: '86', grade: 'A' },
    { subject: 'Computer Studies', score: '92', grade: 'A' },
  ];

  return (
    <div className="results-shell">
      <div className="results-sidebar">
        <div className="results-brand">
          <div className="results-brand-mark">MS</div>
          <div className="results-brand-copy">
            <div className="results-brand-title">MIRACLE SCHOOL</div>
            <small>School Results</small>
          </div>
        </div>

        <nav className="results-nav" aria-label="Results navigation">
          <button type="button" className="results-nav-item active" onClick={() => navigate('/parent-dashboard')}>
            <span>◫</span> Overview
          </button>
          <button type="button" className="results-nav-item" onClick={() => navigate('/parent-results')}>
            <span>▣</span> Results
          </button>
        </nav>

        <button type="button" className="results-logout" onClick={() => navigate('/')}>
          <span>↩</span> Log out
        </button>
      </div>

      <div className="results-main">
        <header className="results-topbar">
          <button type="button" className="results-back-link" onClick={() => navigate('/parent-dashboard')}>
            ← Back to overview
          </button>
          <button type="button" className="results-user-avatar" aria-label="Profile">AO</button>
        </header>

        <div className="results-content">
          <section className="result-banner">
            <div className="result-banner-left">
              <div className="result-brand-inline">MIRACLE SCHOOLS · SENIOR SECONDARY</div>
              <div className="result-title-row">
                <span className="result-title-icon" aria-hidden="true"><AssetIcon src={brandIcon} alt="" /></span>
                <h2>Academic result statement</h2>
              </div>
              <div className="result-subtitle">Second term · 2025/2026 session</div>
            </div>
            <div className="result-banner-right">
              <span className="verified-dot" aria-hidden="true">◉</span>
              Official view only record
            </div>
          </section>

          <section className="result-meta-grid">
            <div className="meta-entry">
              <span>Student</span>
              <strong>{studentName}</strong>
            </div>
            <div className="meta-entry">
              <span>Admission number</span>
              <strong>{admissionNumber}</strong>
            </div>
            <div className="meta-entry">
              <span>Class</span>
              <strong>SS 2 Science</strong>
            </div>
            <div className="meta-entry">
              <span>Department</span>
              <strong>Science</strong>
            </div>
            <div className="meta-entry">
              <span>Academic session</span>
              <strong>2025/2026</strong>
            </div>
            <div className="meta-entry">
              <span>Term</span>
              <strong>Second term</strong>
            </div>
          </section>

          <section className="score-panel">
            <div className="score-panel-header">
              <span>Subject result breakdown</span>
              <span>CA 1, CA 2, Exam, Total</span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>CA 1</th>
                    <th>CA 2</th>
                    <th>Exam</th>
                    <th>Total</th>
                    <th>Grade</th>
                    <th>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.subject}>
                      <td>{result.subject}</td>
                      <td>17</td>
                      <td>16</td>
                      <td>54</td>
                      <td>{result.score}</td>
                      <td>{result.grade}</td>
                      <td>Earned</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="stats-strip">
            <div className="metric-box">
              <div className="metric-label">Overall average</div>
              <div className="metric-value">84.4%</div>
              <small>Excellent performance</small>
            </div>

            <div className="metric-box">
              <div className="metric-label">Class position</div>
              <div className="metric-value">3rd of 28</div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Credits earned</div>
              <div className="metric-value">9 of 9</div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Subjects offered</div>
              <div className="metric-value">9</div>
            </div>
          </section>

          <section className="details-grid">
            <div className="detail-card">
              <div className="detail-title">Attendance record</div>
              <div className="detail-list">
                <div><span>School days</span><strong>62</strong></div>
                <div><span>Days present</span><strong>59</strong></div>
                <div><span>Days absent</span><strong>3</strong></div>
                <div><span>Attendance rate</span><strong>95.2%</strong></div>
              </div>
            </div>

            <div className="detail-card">
              <div className="detail-title">Student record</div>
              <div className="detail-list">
                <div><span>Conduct and activities</span><strong>Excellent</strong></div>
                <div><span>Punctuality</span><strong>Very good</strong></div>
                <div><span>House</span><strong>Emerald</strong></div>
                <div><span>Club</span><strong>Science &amp; Technology</strong></div>
              </div>
            </div>

            <div className="detail-card">
              <div className="detail-title">Grade key</div>
              <div className="grade-grid">
                <span>A 80-100</span>
                <span>B 70-79</span>
                <span>C 60-69</span>
                <span>D 50-59</span>
                <span>E 40-49</span>
                <span>F 0-39</span>
              </div>
            </div>
          </section>

          <section className="comment-box">
            <div className="comment-label">CLASS TEACHER’S COMMENT</div>
            <p>
              Amina demonstrates strong analytical ability and consistent commitment across her science subjects. She should sustain her revision routine and participate more in group discussions.
            </p>
            <small>Mr T. Balogun · Class teacher</small>
          </section>
        </div>

        <footer className="results-footer">
          <div className="footer-left">Next term begins: 28 April 2026</div>
          <div className="footer-right">This result statement is strictly view-only.</div>
        </footer>
      </div>
    </div>
  );
}

function ParentResultsLoadingPage() {
  const navigate = useNavigate();

  return (
    <div className="results-shell results-shell-loading">
      <aside className="results-sidebar">
        <div className="results-brand">
          <div className="results-brand-mark">MS</div>
          <div className="results-brand-copy">
            <div className="results-brand-title">MIRACLE SCHOOL</div>
            <small>Parent Portal</small>
          </div>
        </div>

        <nav className="results-nav" aria-label="Results navigation">
          <button type="button" className="results-nav-item active" onClick={() => navigate('/parent-dashboard')}>
            <span>⌂</span> Overview
          </button>
          <button type="button" className="results-nav-item" onClick={() => navigate('/parent-results-pending')}>
            <span>▣</span> Results
          </button>
        </nav>

        <button type="button" className="results-logout" onClick={() => navigate('/')}>
          <span>↩</span> Log out
        </button>
      </aside>

      <div className="results-main">
        <header className="results-topbar">
          <div className="results-top-label">Parent Portal</div>
          <button type="button" className="results-user-avatar" aria-label="Profile">AO</button>
        </header>

        <div className="results-content">
          <div className="loading-block loading-block-wide" />

          <div className="loading-layout">
            <div className="loading-panel">
              <div className="loading-line loading-line-long" />
              <div className="loading-line" />
              <div className="loading-line" />
              <div className="loading-line loading-line-medium" />
            </div>

            <div className="loading-side-stack">
              <div className="loading-card">
                <div className="loading-line loading-line-short" />
                <div className="loading-line" />
                <div className="loading-line loading-line-medium" />
              </div>
              <div className="loading-card">
                <div className="loading-line loading-line-short" />
                <div className="loading-line" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ParentResultsPendingPage() {
  const navigate = useNavigate();

  return (
    <div className="results-shell">
      <aside className="results-sidebar">
        <div className="results-brand">
          <div className="results-brand-mark">MS</div>
          <div className="results-brand-copy">
            <div className="results-brand-title">MIRACLE SCHOOL</div>
            <small>Parent Portal</small>
          </div>
        </div>

        <nav className="results-nav" aria-label="Results navigation">
          <button type="button" className="results-nav-item active" onClick={() => navigate('/parent-dashboard')}>
            <span>◫</span> Overview
          </button>
          <button type="button" className="results-nav-item" onClick={() => navigate('/parent-results-pending')}>
            <span>▣</span> Results
          </button>
        </nav>

        <button type="button" className="results-logout" onClick={() => navigate('/')}>
          <span>↩</span> Log out
        </button>
      </aside>

      <div className="results-main">
        <header className="results-topbar">
          <button type="button" className="results-back-link" onClick={() => navigate('/parent-dashboard')}>
            ← Back to overview
          </button>
          <button type="button" className="results-user-avatar" aria-label="Profile">AO</button>
        </header>

        <div className="results-content">
          <section className="result-banner">
            <div className="result-banner-left">
              <div className="result-brand-inline">MIRACLE SCHOOLS · SENIOR SECONDARY</div>
              <div className="result-title-row">
                <span className="result-title-icon" aria-hidden="true">◉</span>
                <h2>Current-term results</h2>
              </div>
              <div className="result-subtitle">Second term · 2025/2026 session</div>
            </div>
            <div className="result-banner-right">
              <span className="verified-dot" aria-hidden="true">◉</span>
              Awaiting publication
            </div>
          </section>

          <section className="result-meta-grid">
            <div className="meta-entry">
              <span>Student</span>
              <strong>Amina Okafor</strong>
            </div>
            <div className="meta-entry">
              <span>Admission number</span>
              <strong>SCH/2025/0142</strong>
            </div>
            <div className="meta-entry">
              <span>Class</span>
              <strong>SS 2 Science</strong>
            </div>
            <div className="meta-entry">
              <span>Department</span>
              <strong>Science</strong>
            </div>
            <div className="meta-entry">
              <span>Academic session</span>
              <strong>2025/2026</strong>
            </div>
            <div className="meta-entry">
              <span>Term</span>
              <strong>Second term</strong>
            </div>
          </section>

          <section className="result-pending-panel">
            <div className="pending-clock" aria-hidden="true">◌</div>
            <div className="pending-header">RESULTS ARE BEING PROCESSED</div>
            <h3>Current-term results have not yet been published.</h3>
            <p>
              The school is still preparing and reviewing this term&apos;s report. Subject scores, grades, and comments will remain unavailable until the completed results are officially published.
            </p>
            <button type="button" className="dark-button" onClick={() => navigate('/parent-dashboard')}>
              Return to Parent Dashboard
            </button>
          </section>

          <div className="results-note">
            <span aria-hidden="true">◌</span>
            No draft results or incomplete scores are visible in the Parent Portal.
          </div>
        </div>

        <footer className="results-footer">
          <div className="footer-left">Next term begins: 28 April 2026</div>
          <div className="footer-right">This result statement is strictly view-only.</div>
        </footer>
      </div>
    </div>
  );
}

function DashboardVariantPage({ variant }: { variant: 'one' | 'two' | 'three' }) {
  const navigate = useNavigate();

  const copyByVariant = {
    one: {
      title: 'School overview',
      subtitle: 'Academic performance summary',
      accent: 'Published results',
      stats: [
        { label: 'Students', value: '428', detail: 'Across 11 classes' },
        { label: 'Classes', value: '11', detail: 'Active this term' },
        { label: 'Published', value: '21', detail: 'Result batches' },
        { label: 'Pending', value: '04', detail: 'Awaiting review' },
      ],
    },
    two: {
      title: 'Results review',
      subtitle: 'Ready for approval',
      accent: 'Needs attention',
      stats: [
        { label: 'Marks uploaded', value: '1,236', detail: 'Current term' },
        { label: 'Awaiting sign-off', value: '18', detail: 'Student batches' },
        { label: 'Edited this week', value: '26', detail: 'Audit log' },
        { label: 'Flagged records', value: '03', detail: 'Needs review' },
      ],
    },
    three: {
      title: 'House and attendance',
      subtitle: 'School-wide monitoring',
      accent: 'Live overview',
      stats: [
        { label: 'Attendance', value: '94%', detail: 'Weekly average' },
        { label: 'Present', value: '382', detail: 'Students' },
        { label: 'Absent', value: '46', detail: 'Students' },
        { label: 'Promotions', value: '126', detail: 'Eligible' },
      ],
    },
  } as const;

  const active = copyByVariant[variant];

  return (
    <div className="admin-portal-shell">
      <aside className="admin-portal-sidebar">
        <div className="admin-portal-brand">
          <div className="admin-portal-logo">▣</div>
          <div>
            <div className="admin-portal-title">Greenfield</div>
            <small>School Results Portal</small>
          </div>
        </div>

        <div className="admin-portal-section-label">Administration</div>
        <nav className="admin-portal-nav" aria-label="Admin navigation">
          <button type="button" className="admin-portal-item active" onClick={() => navigate('/staff-dashboard')}>Overview</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/student-management')}>Student Management</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/access-codes')}>Access Codes</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Upload</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Review</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Audit Log</button>
        </nav>

        <div className="admin-portal-user">
          <div className="admin-portal-user-avatar">AO</div>
          <div>
            <strong>Admin Office</strong>
            <small>Administrator</small>
          </div>
        </div>

        <button type="button" className="admin-portal-logout" onClick={() => navigate('/')}>↩ Log out</button>
      </aside>

      <main className="admin-portal-main">
        <header className="admin-portal-topbar">
          <div className="admin-portal-label">Admin Portal</div>
          <div className="admin-portal-search-wrap">
            <span className="admin-portal-search-icon">⌕</span>
            <input type="text" placeholder="Search portal" />
            <button type="button" className="admin-portal-shortcut">⌘</button>
            <button type="button" className="admin-portal-avatar" aria-label="User profile">AO</button>
          </div>
        </header>

        <div className="admin-portal-content">
          <div className="admin-page-header-block">
            <div className="admin-breadcrumb">School dashboard</div>
            <h1>{active.title}</h1>
          </div>

          <section className="admin-variant-hero">
            <div className="admin-variant-copy">
              <div className="status-pill success">{active.accent}</div>
              <h2>{active.subtitle}</h2>
              <p>Secure result management for the term, with class-level monitoring, approval steps, and access tracking in one place.</p>
            </div>
            <div className="admin-variant-metric">
              <span>Term status</span>
              <strong>2nd Term</strong>
              <small>2025 / 2026</small>
            </div>
          </section>

          <div className="admin-access-stats admin-variant-stats">
            {active.stats.map((stat) => (
              <div key={stat.label} className="admin-stat-block">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.detail}</small>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function ResultsVariantPage({ variant }: { variant: 'report' | 'secondary' | 'tertiary' }) {
  const navigate = useNavigate();

  const variantCopy = {
    report: {
      title: 'Academic result statement',
      tag: 'Official view only record',
      tableTitle: 'Subject result breakdown',
      footer: 'This result statement is strictly view-only.',
    },
    secondary: {
      title: 'Term result summary',
      tag: 'Published result sheet',
      tableTitle: 'Subject performance',
      footer: 'Parents can view this report only after publication.',
    },
    tertiary: {
      title: 'Student progress report',
      tag: 'Updated for current term',
      tableTitle: 'Assessment overview',
      footer: 'Report card data is read-only for guardians.',
    },
  } as const;

  const content = variantCopy[variant];
  const rows = [
    { subject: 'English Language', score: '88', grade: 'A' },
    { subject: 'General Mathematics', score: '90', grade: 'A' },
    { subject: 'Biology', score: '84', grade: 'A' },
    { subject: 'Physics', score: '80', grade: 'A' },
    { subject: 'Economics', score: '79', grade: 'B' },
  ];

  return (
    <div className="results-shell">
      <div className="results-sidebar">
        <div className="results-brand">
          <div className="results-brand-mark">MS</div>
          <div className="results-brand-copy">
            <div className="results-brand-title">MIRACLE SCHOOL</div>
            <small>School Results</small>
          </div>
        </div>

        <nav className="results-nav" aria-label="Results navigation">
          <button type="button" className="results-nav-item active" onClick={() => navigate('/parent-dashboard')}>
            <span>◫</span> Overview
          </button>
          <button type="button" className="results-nav-item" onClick={() => navigate('/parent-results')}>
            <span>▣</span> Results
          </button>
        </nav>

        <button type="button" className="results-logout" onClick={() => navigate('/')}>
          <span>↩</span> Log out
        </button>
      </div>

      <div className="results-main">
        <header className="results-topbar">
          <button type="button" className="results-back-link" onClick={() => navigate('/parent-dashboard')}>
            ← Back to overview
          </button>
          <button type="button" className="results-user-avatar" aria-label="Profile">AO</button>
        </header>

        <div className="results-content">
          <section className="result-banner">
            <div className="result-banner-left">
              <div className="result-brand-inline">MIRACLE SCHOOLS · SENIOR SECONDARY</div>
              <div className="result-title-row">
                <span className="result-title-icon" aria-hidden="true">◉</span>
                <h2>{content.title}</h2>
              </div>
              <div className="result-subtitle">Second term · 2025/2026 session</div>
            </div>
            <div className="result-banner-right">
              <span className="verified-dot" aria-hidden="true">◉</span>
              {content.tag}
            </div>
          </section>

          <section className="result-meta-grid">
            <div className="meta-entry"><span>Student</span><strong>Amina Okafor</strong></div>
            <div className="meta-entry"><span>Admission number</span><strong>SCH/2025/0142</strong></div>
            <div className="meta-entry"><span>Class</span><strong>SS 2 Science</strong></div>
            <div className="meta-entry"><span>Department</span><strong>Science</strong></div>
            <div className="meta-entry"><span>Academic session</span><strong>2025/2026</strong></div>
            <div className="meta-entry"><span>Term</span><strong>Second term</strong></div>
          </section>

          <section className="score-panel">
            <div className="score-panel-header">
              <span>{content.tableTitle}</span>
              <span>CA 1, CA 2, Exam, Total</span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>CA 1</th>
                    <th>CA 2</th>
                    <th>Exam</th>
                    <th>Total</th>
                    <th>Grade</th>
                    <th>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((result) => (
                    <tr key={result.subject}>
                      <td>{result.subject}</td>
                      <td>18</td>
                      <td>17</td>
                      <td>53</td>
                      <td>{result.score}</td>
                      <td>{result.grade}</td>
                      <td>Earned</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="stats-strip">
            <div className="metric-box">
              <div className="metric-label">Overall average</div>
              <div className="metric-value">84.4%</div>
              <small>Excellent performance</small>
            </div>

            <div className="metric-box">
              <div className="metric-label">Class position</div>
              <div className="metric-value">3rd of 28</div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Credits earned</div>
              <div className="metric-value">9 of 9</div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Subjects offered</div>
              <div className="metric-value">9</div>
            </div>
          </section>
        </div>

        <footer className="results-footer">
          <div className="footer-left">Next term begins: 28 April 2026</div>
          <div className="footer-right">{content.footer}</div>
        </footer>
      </div>
    </div>
  );
}

function GenerateClassCodesPage() {
  const navigate = useNavigate();

  return (
    <div className="admin-portal-shell">
      <aside className="admin-portal-sidebar">
        <div className="admin-portal-brand">
          <div className="admin-portal-logo">▣</div>
          <div>
            <div className="admin-portal-title">Greenfield</div>
            <small>School Results Portal</small>
          </div>
        </div>

        <div className="admin-portal-section-label">Administration</div>
        <nav className="admin-portal-nav" aria-label="Admin navigation">
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Overview</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/student-management')}>Student Management</button>
          <button type="button" className="admin-portal-item active" onClick={() => navigate('/access-codes')}>Access Codes</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Upload</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Review</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Audit Log</button>
        </nav>

        <div className="admin-portal-user">
          <div className="admin-portal-user-avatar">AO</div>
          <div>
            <strong>Admin Office</strong>
            <small>Administrator</small>
          </div>
        </div>

        <button type="button" className="admin-portal-logout" onClick={() => navigate('/')}>↩ Log out</button>
      </aside>

      <main className="admin-portal-main">
        <header className="admin-portal-topbar">
          <div className="admin-portal-label">Admin Portal</div>
          <div className="admin-portal-search-wrap">
            <span className="admin-portal-search-icon">⌕</span>
            <input type="text" placeholder="Search portal" />
            <button type="button" className="admin-portal-shortcut">⌘</button>
            <button type="button" className="admin-portal-avatar" aria-label="User profile">AO</button>
          </div>
        </header>

        <div className="admin-portal-content admin-portal-content-wide">
          <button type="button" className="admin-portal-back" onClick={() => navigate('/access-codes')}>← Back to Access Code Management</button>

          <div className="class-code-title-block">
            <h1>Generate Class Codes</h1>
            <p>Issue new parent portal credentials for an entire class.</p>
          </div>

          <section className="class-code-generator">
            <div className="class-code-icon">◌</div>
            <div className="class-code-header-row">
              <div className="class-code-label">Class-wide generation</div>
            </div>

            <div className="class-code-form">
              <label className="class-code-field">
                <span>Class assignment</span>
                <select defaultValue="JSS 1C">
                  <option>JSS 1C</option>
                  <option>Primary 4</option>
                  <option>Primary 5</option>
                  <option>JSS 2A</option>
                </select>
              </label>

              <div className="class-code-metrics">
                <div className="class-code-metric">
                  <span>Students receiving new codes</span>
                  <strong>2</strong>
                </div>
                <div className="class-code-metric">
                  <span>Existing codes being replaced</span>
                  <strong>0</strong>
                </div>
              </div>

              <div className="class-code-warning">
                <span className="warning-symbol">!</span>
                <div>
                  <strong>This action issues new login credentials</strong>
                  <p>Any existing access code for a student in JSS 1C will stop working. The new codes will be displayed once after generation.</p>
                </div>
              </div>

              <div className="class-code-checklist">
                <p>Before you continue</p>
                <ul>
                  <li>All students in JSS 1C are included.</li>
                  <li>Existing codes for this class are replaced, not duplicated.</li>
                  <li>New codes will not appear later in the audit log.</li>
                </ul>
              </div>

              <label className="class-code-consent">
                <input type="checkbox" />
                <span>I understand that this will replace existing credentials and that the new codes are shown only once.</span>
              </label>
            </div>

            <div className="class-code-actions">
              <button type="button" className="admin-secondary-light" onClick={() => navigate('/access-codes')}>Cancel</button>
              <button type="button" className="admin-primary-dark">Generate Codes →</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StudentManagementPage() {
  const navigate = useNavigate();

  return (
    <div className="admin-portal-shell">
      <aside className="admin-portal-sidebar">
        <div className="admin-portal-brand">
          <div className="admin-portal-logo">▣</div>
          <div>
            <div className="admin-portal-title">Greenfield</div>
            <small>School Results Portal</small>
          </div>
        </div>

        <div className="admin-portal-section-label">Administration</div>
        <nav className="admin-portal-nav" aria-label="Admin navigation">
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Overview</button>
          <button type="button" className="admin-portal-item active" onClick={() => navigate('/student-management')}>Student Management</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/access-codes')}>Access Codes</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Upload</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Review</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Audit Log</button>
        </nav>

        <div className="admin-portal-user">
          <div className="admin-portal-user-avatar">AO</div>
          <div>
            <strong>Admin Office</strong>
            <small>Administrator</small>
          </div>
        </div>

        <button type="button" className="admin-portal-logout" onClick={() => navigate('/')}>↩ Log out</button>
      </aside>

      <main className="admin-portal-main">
        <header className="admin-portal-topbar">
          <div className="admin-portal-label">Admin Portal</div>
          <div className="admin-portal-search-wrap">
            <span className="admin-portal-search-icon">⌕</span>
            <input type="text" placeholder="Search portal" />
            <button type="button" className="admin-portal-shortcut">⌘</button>
            <button type="button" className="admin-portal-avatar" aria-label="User profile">AO</button>
          </div>
        </header>

        <div className="admin-portal-content">
          <button type="button" className="admin-portal-back" onClick={() => navigate('/staff-dashboard')}>← back to student management</button>

          <div className="admin-page-header-block">
            <h1>Import student register</h1>
            <p>Add existing student records from a CSV or Excel register.</p>
          </div>

          <section className="admin-upload-card">
            <div className="admin-upload-label">Bulk import</div>
            <h2>Upload your student register</h2>
            <p>Include columns for full name, admission number, class, date of birth, gender and account status.</p>

            <div className="admin-upload-dropzone">
              <div className="admin-upload-icon">⇪</div>
              <div className="admin-upload-copy">
                <div>Choose a register to upload</div>
                <small>CSV or Excel files up to 10 MB</small>
              </div>
              <button type="button" className="admin-upload-button">Browse files</button>
            </div>

            <div className="admin-upload-note">
              <strong>Before you import</strong>
              <span>Duplicate admission numbers will be skipped. You can edit imported student records after the upload is complete.</span>
            </div>

            <div className="admin-upload-actions">
              <button type="button" className="admin-secondary-light">Cancel</button>
              <button type="button" className="admin-primary-dark">Import register →</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StudentAddPage() {
  const navigate = useNavigate();

  return (
    <div className="admin-portal-shell">
      <aside className="admin-portal-sidebar">
        <div className="admin-portal-brand">
          <div className="admin-portal-logo">▣</div>
          <div>
            <div className="admin-portal-title">Greenfield</div>
            <small>School Results Portal</small>
          </div>
        </div>

        <div className="admin-portal-section-label">Administration</div>
        <nav className="admin-portal-nav" aria-label="Admin navigation">
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Overview</button>
          <button type="button" className="admin-portal-item active" onClick={() => navigate('/student-management')}>Student Management</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/access-codes')}>Access Codes</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Upload</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Review</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Audit Log</button>
        </nav>

        <div className="admin-portal-user">
          <div className="admin-portal-user-avatar">AO</div>
          <div>
            <strong>Admin Office</strong>
            <small>Administrator</small>
          </div>
        </div>

        <button type="button" className="admin-portal-logout" onClick={() => navigate('/')}>↩ Log out</button>
      </aside>

      <main className="admin-portal-main">
        <header className="admin-portal-topbar">
          <div className="admin-portal-label">Admin Portal</div>
          <div className="admin-portal-search-wrap">
            <span className="admin-portal-search-icon">⌕</span>
            <input type="text" placeholder="Search portal" />
            <button type="button" className="admin-portal-shortcut">⌘</button>
            <button type="button" className="admin-portal-avatar" aria-label="User profile">AO</button>
          </div>
        </header>

        <div className="admin-portal-content">
          <button type="button" className="admin-portal-back" onClick={() => navigate('/student-management')}>← back</button>

          <div className="admin-page-header-block">
            <div className="admin-breadcrumb">Student management</div>
            <h1>Add new student</h1>
          </div>

          <section className="student-form-shell">
            <div className="student-form-card">
              <div className="student-form-header">
                <div>
                  <div className="admin-breadcrumb">Profile</div>
                  <h2>Student details</h2>
                </div>
                <button type="button" className="admin-primary-dark">Save record</button>
              </div>

              <div className="student-form-grid">
                <label>
                  <span>First name</span>
                  <input type="text" placeholder="Enter first name" />
                </label>
                <label>
                  <span>Last name</span>
                  <input type="text" placeholder="Enter last name" />
                </label>
                <label>
                  <span>Admission number</span>
                  <input type="text" placeholder="ADM-0008" />
                </label>
                <label>
                  <span>Class</span>
                  <select defaultValue="">
                    <option value="" disabled>Select class</option>
                    <option>Primary 4</option>
                    <option>Primary 5</option>
                    <option>JSS 1</option>
                    <option>JSS 2A</option>
                    <option>SS 1A</option>
                  </select>
                </label>
                <label>
                  <span>Date of birth</span>
                  <input type="date" />
                </label>
                <label>
                  <span>Gender</span>
                  <select defaultValue="">
                    <option value="" disabled>Select gender</option>
                    <option>Female</option>
                    <option>Male</option>
                  </select>
                </label>
                <label>
                  <span>Parent/guardian phone</span>
                  <input type="tel" placeholder="0802 000 0000" />
                </label>
                <label>
                  <span>Parent/guardian name</span>
                  <input type="text" placeholder="Enter parent name" />
                </label>
              </div>

              <div className="student-form-footer">
                <button type="button" className="admin-secondary-light">Cancel</button>
                <button type="button" className="admin-primary-dark">Create student</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function EmptyStudentPage() {
  const navigate = useNavigate();

  return (
    <div className="admin-portal-shell">
      <aside className="admin-portal-sidebar">
        <div className="admin-portal-brand">
          <div className="admin-portal-logo">▣</div>
          <div>
            <div className="admin-portal-title">Greenfield</div>
            <small>School Results Portal</small>
          </div>
        </div>

        <div className="admin-portal-section-label">Administration</div>
        <nav className="admin-portal-nav" aria-label="Admin navigation">
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Overview</button>
          <button type="button" className="admin-portal-item active" onClick={() => navigate('/student-empty')}>Student Management</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/access-codes')}>Access Codes</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Upload</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Review</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Audit Log</button>
        </nav>

        <div className="admin-portal-user">
          <div className="admin-portal-user-avatar">AO</div>
          <div>
            <strong>Admin Office</strong>
            <small>Administrator</small>
          </div>
        </div>

        <button type="button" className="admin-portal-logout" onClick={() => navigate('/')}>↩ Log out</button>
      </aside>

      <main className="admin-portal-main">
        <header className="admin-portal-topbar">
          <div className="admin-portal-label">Admin Portal</div>
          <div className="admin-portal-search-wrap">
            <span className="admin-portal-search-icon">⌕</span>
            <input type="text" placeholder="Search portal" />
            <button type="button" className="admin-portal-shortcut">⌘</button>
            <button type="button" className="admin-portal-avatar" aria-label="User profile">AO</button>
          </div>
        </header>

        <div className="admin-portal-content">
          <div className="admin-page-header-block">
            <div className="admin-breadcrumb">Student register</div>
            <h1>Manage students</h1>
          </div>

          <section className="empty-state-panel">
            <div className="empty-state-icon">◌</div>
            <h2>No students added yet</h2>
            <p>Start by importing your school register or add a new student manually.</p>
            <div className="empty-state-actions">
              <button type="button" className="admin-secondary-light" onClick={() => navigate('/student-management')}>Import register</button>
              <button type="button" className="admin-primary-dark" onClick={() => navigate('/student-add')}>Add student</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function AwaitingPublicationPage() {
  const navigate = useNavigate();

  return (
    <div className="admin-portal-shell">
      <aside className="admin-portal-sidebar">
        <div className="admin-portal-brand">
          <div className="admin-portal-logo">▣</div>
          <div>
            <div className="admin-portal-title">Greenfield</div>
            <small>School Results Portal</small>
          </div>
        </div>

        <div className="admin-portal-section-label">Administration</div>
        <nav className="admin-portal-nav" aria-label="Admin navigation">
          <button type="button" className="admin-portal-item active" onClick={() => navigate('/dashboard-awaiting-publication')}>Overview</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/student-management')}>Student Management</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/access-codes')}>Access Codes</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Upload</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Review</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Audit Log</button>
        </nav>

        <div className="admin-portal-user">
          <div className="admin-portal-user-avatar">AO</div>
          <div>
            <strong>Admin Office</strong>
            <small>Administrator</small>
          </div>
        </div>

        <button type="button" className="admin-portal-logout" onClick={() => navigate('/')}>↩ Log out</button>
      </aside>

      <main className="admin-portal-main">
        <header className="admin-portal-topbar">
          <div className="admin-portal-label">Admin Portal</div>
          <div className="admin-portal-search-wrap">
            <span className="admin-portal-search-icon">⌕</span>
            <input type="text" placeholder="Search portal" />
            <button type="button" className="admin-portal-shortcut">⌘</button>
            <button type="button" className="admin-portal-avatar" aria-label="User profile">AO</button>
          </div>
        </header>

        <div className="admin-portal-content">
          <div className="admin-page-header-block">
            <div className="admin-breadcrumb">School dashboard</div>
            <h1>Awaiting publication</h1>
          </div>

          <section className="status-hero-panel">
            <div className="status-hero-copy">
              <div className="status-pill warning">Pending review</div>
              <h2>Current results are being checked before they go live.</h2>
              <p>Review the uploaded marks, confirm final entries, and publish once the school approves the batch.</p>
            </div>
            <div className="status-hero-metric">
              <span>Files waiting</span>
              <strong>03</strong>
              <small>Primary 4 • Primary 5 • JSS 2A</small>
            </div>
          </section>

          <div className="admin-access-stats">
            <div className="admin-stat-block">
              <span>Draft batches</span>
              <strong>12</strong>
              <small>Across all classes</small>
            </div>
            <div className="admin-stat-block">
              <span>Published</span>
              <strong>07</strong>
              <small>Visible to parents</small>
            </div>
            <div className="admin-stat-block">
              <span>Awaiting review</span>
              <strong>03</strong>
              <small>Needs approval</small>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AccessCodeManagementPage() {
  const navigate = useNavigate();

  const accessRows = [
    { name: 'Amina Okafor', admissionNumber: 'SCH/2025/0142', className: 'JSS 2A', status: 'Generated', lastGenerated: '18 Mar 2026' },
    { name: 'David Eze', admissionNumber: 'SCH/2025/0156', className: 'JSS 2A', status: 'Generated', lastGenerated: '18 Mar 2026' },
    { name: 'Nkeka Ibe', admissionNumber: 'SCH/2025/0181', className: 'JSS 3B', status: 'Generated', lastGenerated: '18 Mar 2026' },
    { name: 'Tobi Martins', admissionNumber: 'SCH/2025/0204', className: 'SS 1A', status: 'Not generated', lastGenerated: '-' },
    { name: 'Zainab Musa', admissionNumber: 'SCH/2025/0227', className: 'JSS 1C', status: 'Not generated', lastGenerated: '-' },
    { name: 'Chidera Nwosu', admissionNumber: 'SCH/2025/0119', className: 'SS 2C', status: 'Not generated', lastGenerated: '-' },
    { name: 'Ifeoluwa Adeyemi', admissionNumber: 'SCH/2025/0241', className: 'JSS 1C', status: 'Not generated', lastGenerated: '-' },
    { name: 'Samuel Effiong', admissionNumber: 'SCH/2025/0096', className: 'SS 2C', status: 'Not generated', lastGenerated: '-' },
  ];

  return (
    <div className="admin-portal-shell">
      <aside className="admin-portal-sidebar">
        <div className="admin-portal-brand">
          <div className="admin-portal-logo">▣</div>
          <div>
            <div className="admin-portal-title">Greenfield</div>
            <small>School Results Portal</small>
          </div>
        </div>

        <div className="admin-portal-section-label">Administration</div>
        <nav className="admin-portal-nav" aria-label="Admin navigation">
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Overview</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/student-management')}>Student Management</button>
          <button type="button" className="admin-portal-item active" onClick={() => navigate('/access-codes')}>Access Codes</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Upload</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Results Review</button>
          <button type="button" className="admin-portal-item" onClick={() => navigate('/staff-dashboard')}>Audit Log</button>
        </nav>

        <div className="admin-portal-user">
          <div className="admin-portal-user-avatar">AO</div>
          <div>
            <strong>Admin Office</strong>
            <small>Administrator</small>
          </div>
        </div>

        <button type="button" className="admin-portal-logout" onClick={() => navigate('/')}>↩ Log out</button>
      </aside>

      <main className="admin-portal-main">
        <header className="admin-portal-topbar">
          <div className="admin-portal-label">Admin Portal</div>
          <div className="admin-portal-search-wrap">
            <span className="admin-portal-search-icon">⌕</span>
            <input type="text" placeholder="Search portal" />
            <button type="button" className="admin-portal-shortcut">⌘</button>
            <button type="button" className="admin-portal-avatar" aria-label="User profile">AO</button>
          </div>
        </header>

        <div className="admin-access-content">
          <div className="admin-page-header-block access-header-row">
            <div>
              <div className="admin-breadcrumb">Parent Portal Access</div>
              <h1>Access Code Management</h1>
            </div>
            <button type="button" className="admin-primary-dark" onClick={() => navigate('/access-codes-generate')}>Generate class codes</button>
          </div>

          <div className="admin-access-stats">
            <div className="admin-stat-block">
              <span>Total students</span>
              <strong>8</strong>
              <small>Across 5 classes</small>
            </div>
            <div className="admin-stat-block">
              <span>Codes generated</span>
              <strong>3</strong>
              <small>Active this term</small>
            </div>
            <div className="admin-stat-block">
              <span>Not generated</span>
              <strong>5</strong>
              <small>Students still require access</small>
            </div>
          </div>

          <div className="access-inline-info">
            <span className="info-badge">i</span>
            <span>Codes remain private; only a parent in this student record can access their child’s results.</span>
          </div>

          <section className="access-table-panel">
            <div className="access-table-header">
              <div>
                <div className="admin-breadcrumb">Student access</div>
                <h3>Access-code status</h3>
              </div>

              <div className="access-table-controls">
                <div className="search-inline">
                  <span>⌕</span>
                  <input type="text" placeholder="Search name or admission number" />
                </div>
                <select defaultValue="All classes">
                  <option>All classes</option>
                  <option>JSS 2A</option>
                  <option>JSS 3B</option>
                  <option>SS 1A</option>
                </select>
              </div>
            </div>

            <div className="access-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Admission number</th>
                    <th>Assigned class</th>
                    <th>Access-code status</th>
                    <th>Last generated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {accessRows.map((row) => (
                    <tr key={row.admissionNumber}>
                      <td>
                        <div className="access-student-name">
                          <span className="access-avatar">{row.name.split(' ').map((name) => name[0]).slice(0, 2).join('').toUpperCase()}</span>
                          {row.name}
                        </div>
                      </td>
                      <td>{row.admissionNumber}</td>
                      <td>{row.className}</td>
                      <td>
                        <span className={row.status === 'Generated' ? 'status-badge success' : 'status-badge muted'}>
                          {row.status}
                        </span>
                      </td>
                      <td>{row.lastGenerated}</td>
                      <td>
                        <button type="button" className={row.status === 'Generated' ? 'admin-table-button' : 'admin-table-button primary'}>
                          {row.status === 'Generated' ? 'Regenerate' : 'Generate code'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StaffDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const role: Role = (location.state as { role?: Role } | null)?.role ?? 'superadmin';
  const fullName = (location.state as { name?: string } | null)?.name ?? 'School Administrator';
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents);
  const [superadminAccounts, setSuperadminAccounts] = useState(seededSuperadmins);
  const [parentAccounts, setParentAccounts] = useState(seededParents);
  const [selectedNav, setSelectedNav] = useState<'students' | 'promotions' | 'attendance' | 'users'>('students');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<keyof StudentRecord>('lastName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [attendanceWeek, setAttendanceWeek] = useState('Week 1');

  const teacherClass = 'Primary 4';

  const visibleStudents = useMemo(() => {
    const filtered = students.filter((student) => {
      const matchesRole = role === 'teacher' ? student.className === teacherClass : true;
      const matchesClass = classFilter === 'All' || student.className === classFilter;
      const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' ? student.active : !student.active);
      const haystack = `${student.firstName} ${student.lastName} ${student.admissionNumber} ${student.className} ${student.parentPhone}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      return matchesRole && matchesClass && matchesStatus && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const left = a[sortField];
      const right = b[sortField];

      if (typeof left === 'string' && typeof right === 'string') {
        return sortDirection === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
      }

      return sortDirection === 'asc'
        ? Number(left) - Number(right)
        : Number(right) - Number(left);
    });
  }, [students, role, teacherClass, classFilter, statusFilter, search, sortField, sortDirection]);

  const stats = useMemo(() => {
    const visible = role === 'teacher' ? students.filter((student) => student.className === teacherClass) : students;
    return {
      total: visible.length,
      active: visible.filter((student) => student.active).length,
      attendance: Math.round(visible.reduce((sum, student) => sum + student.attendance, 0) / Math.max(visible.length, 1)),
      promotions: visible.filter((student) => student.eligibleForPromotion).length,
    };
  }, [students, role, teacherClass]);

  const promotionCandidates = useMemo(() => {
    const pool = role === 'teacher' ? students.filter((student) => student.className === teacherClass) : students;
    return pool.filter((student) => student.eligibleForPromotion);
  }, [students, role, teacherClass]);

  const attendanceSummary = useMemo(() => {
    const pool = role === 'teacher' ? visibleStudents : students;
    return pool.reduce((total, student) => total + student.attendance, 0) / Math.max(pool.length, 1);
  }, [students, visibleStudents, role]);

  const classOptions = ['All', ...new Set(students.map((student) => student.className))];

  const [newUserForm, setNewUserForm] = useState(defaultUserForm);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) {
      return;
    }

    alert(`Upload queued for ${uploadedFile.name}. In the real app this would parse the register and validate each row.`);
    event.target.value = '';
  };

  const handleAddUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newUserForm.name.trim()) {
      alert('Please enter a full name before saving the account.');
      return;
    }

    if (newUserForm.accountRole === 'parent') {
      const admissionNumber = newUserForm.admissionNumber.trim();
      const accessCode = newUserForm.accessCode.trim();
      if (!admissionNumber || !accessCode) {
        alert('Parent accounts need an admission number and access code.');
        return;
      }

      setParentAccounts((current) => [
        ...current,
        {
          name: newUserForm.name.trim(),
          admissionNumber,
          accessCode,
        },
      ]);
      setNewUserForm(defaultUserForm);
      return;
    }

    const email = newUserForm.email.trim();
    const password = newUserForm.password.trim();
    if (!email || !password) {
      alert('Staff accounts need both email and password.');
      return;
    }

    const nextAccount: (typeof seededSuperadmins)[number] = {
      name: newUserForm.name.trim(),
      email,
      password,
      role: newUserForm.accountRole === 'teacher' ? 'teacher' : 'superadmin',
    };

    setSuperadminAccounts((current) => [
      ...current,
      nextAccount,
    ]);
    setNewUserForm(defaultUserForm);
  };

  const handleApprovePromotion = (studentId: number) => {
    setStudents((current) => current.map((student) => (
      student.id === studentId ? { ...student, eligibleForPromotion: false, active: true } : student
    )));
  };

  const handleApproveAllPromotions = () => {
    setStudents((current) => current.map((student) => (
      student.eligibleForPromotion ? { ...student, eligibleForPromotion: false, active: true } : student
    )));
  };

  const handleAttendanceChange = (studentId: number, nextValue: number) => {
    setStudents((current) => current.map((student) => (
      student.id === studentId ? { ...student, attendance: Math.min(100, Math.max(0, nextValue)) } : student
    )));
  };

  const visibleSidebar = role === 'superadmin'
    ? [
        { key: 'students', label: 'Student records' },
        { key: 'promotions', label: 'Promotions' },
        { key: 'attendance', label: 'Attendance' },
        { key: 'users', label: 'Manage users' },
      ]
    : [
        { key: 'students', label: 'My class records' },
        { key: 'promotions', label: 'Promotions' },
        { key: 'attendance', label: 'Attendance' },
      ];

  return (
    <div className="admin-dashboard-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark"><AssetIcon src={brandIcon} alt="" /></span>
          <div>
            <strong>MIRACLE SCHOOL</strong>
            <small>{role === 'superadmin' ? 'Admin portal' : 'Teacher portal'}</small>
          </div>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Sidebar navigation">
          {visibleSidebar.map((item) => (
            <button
              key={item.key}
              type="button"
              className={selectedNav === item.key ? 'admin-nav-item active' : 'admin-nav-item'}
              onClick={() => setSelectedNav(item.key as typeof selectedNav)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" className="admin-logout" onClick={() => navigate('/')}>Log out</button>
      </aside>

      <main className="admin-main-panel">
        <header className="admin-topbar">
          <div>
            <p className="admin-kicker">School dashboard</p>
            <h1>{role === 'superadmin' ? `School overview · ${fullName}` : `Class dashboard · ${teacherClass}`}</h1>
          </div>

          <div className="admin-top-actions">
            <button type="button" className="admin-secondary" onClick={() => document.getElementById('student-upload')?.click()}>
              Upload records
            </button>
            <input id="student-upload" type="file" accept=".csv,.xlsx" hidden onChange={handleUpload} />
            <button type="button" className="admin-primary" onClick={() => navigate('/student-add')}>Add student</button>
          </div>
        </header>

        <section className="admin-stats-grid">
          <article className="admin-stat-card">
            <span>Total students</span>
            <strong>{stats.total}</strong>
            <small>{role === 'superadmin' ? 'Across all classes' : teacherClass}</small>
          </article>
          <article className="admin-stat-card">
            <span>Active</span>
            <strong>{stats.active}</strong>
            <small>Currently active</small>
          </article>
          <article className="admin-stat-card">
            <span>Attendance</span>
            <strong>{stats.attendance}%</strong>
            <small>Term average</small>
          </article>
          <article className="admin-stat-card">
            <span>Promotion list</span>
            <strong>{stats.promotions}</strong>
            <small>Ready to approve</small>
          </article>
        </section>

        {selectedNav === 'students' && (
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="admin-panel-tag">Records</p>
                <h3>Student register</h3>
              </div>
              <button type="button" className="admin-mini-button">Export</button>
            </div>

            <div className="admin-filter-bar">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, admission or phone"
              />

              <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
                {classOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <select value={sortField} onChange={(event) => setSortField(event.target.value as keyof StudentRecord)}>
                <option value="lastName">Sort by surname</option>
                <option value="firstName">Sort by first name</option>
                <option value="admissionNumber">Sort by admission</option>
                <option value="className">Sort by class</option>
                <option value="attendance">Sort by attendance</option>
              </select>

              <button type="button" className="admin-ghost" onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}>
                {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>

            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Admission</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Parent phone</th>
                    <th>Status</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((student) => (
                    <tr key={student.id}>
                      <td>{student.admissionNumber}</td>
                      <td>{student.firstName} {student.lastName}</td>
                      <td>{student.className}</td>
                      <td>{student.parentPhone}</td>
                      <td>{student.active ? 'Active' : 'Inactive'}</td>
                      <td>{student.attendance}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {selectedNav === 'promotions' && (
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="admin-panel-tag">Approval</p>
                <h3>Promotion candidates</h3>
              </div>
              <button type="button" className="admin-primary" onClick={handleApproveAllPromotions}>Approve all</button>
            </div>

            <div className="admin-tier-list">
              {promotionCandidates.length === 0 ? (
                <div className="admin-empty-state">No promotion requests are currently waiting for approval.</div>
              ) : (
                promotionCandidates.map((student) => (
                  <div key={student.id} className="admin-promotion-card">
                    <div>
                      <strong>{student.firstName} {student.lastName}</strong>
                      <span>{student.admissionNumber} · {student.className}</span>
                    </div>
                    <button type="button" className="admin-mini-button" onClick={() => handleApprovePromotion(student.id)}>
                      Approve
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {selectedNav === 'attendance' && (
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="admin-panel-tag">Weekly input</p>
                <h3>Attendance register</h3>
              </div>
              <select value={attendanceWeek} onChange={(event) => setAttendanceWeek(event.target.value)}>
                <option value="Week 1">Week 1</option>
                <option value="Week 2">Week 2</option>
                <option value="Week 3">Week 3</option>
                <option value="Week 4">Week 4</option>
              </select>
            </div>

            <div className="admin-attendance-grid">
              {visibleStudents.map((student) => (
                <div key={student.id} className="admin-attendance-card">
                  <div>
                    <strong>{student.firstName} {student.lastName}</strong>
                    <span>{student.admissionNumber}</span>
                  </div>
                  <label>
                    Attendance %
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={student.attendance}
                      onChange={(event) => handleAttendanceChange(student.id, Number(event.target.value))}
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="admin-attendance-summary">
              <span>{attendanceWeek}</span>
              <strong>{Math.round(attendanceSummary)}%</strong>
            </div>
          </section>
        )}

        {selectedNav === 'users' && role === 'superadmin' && (
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="admin-panel-tag">Access control</p>
                <h3>Manage accounts</h3>
              </div>
              <button type="button" className="admin-mini-button">Add user</button>
            </div>

            <form className="admin-user-form" onSubmit={handleAddUser}>
              <div className="admin-user-form-grid">
                <label>
                  Full name
                  <input
                    type="text"
                    value={newUserForm.name}
                    onChange={(event) => setNewUserForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Enter full name"
                  />
                </label>

                <label>
                  Account type
                  <select
                    value={newUserForm.accountRole}
                    onChange={(event) => setNewUserForm((current) => ({ ...current, accountRole: event.target.value as AccountRole }))}
                  >
                    <option value="superadmin">Superadmin</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                  </select>
                </label>

                {newUserForm.accountRole !== 'parent' && (
                  <>
                    <label>
                      Email
                      <input
                        type="email"
                        value={newUserForm.email}
                        onChange={(event) => setNewUserForm((current) => ({ ...current, email: event.target.value }))}
                        placeholder="name@school.local"
                      />
                    </label>

                    <label>
                      Password
                      <input
                        type="text"
                        value={newUserForm.password}
                        onChange={(event) => setNewUserForm((current) => ({ ...current, password: event.target.value }))}
                        placeholder="Set password"
                      />
                    </label>
                  </>
                )}

                {newUserForm.accountRole === 'parent' && (
                  <>
                    <label>
                      Admission number
                      <input
                        type="text"
                        value={newUserForm.admissionNumber}
                        onChange={(event) => setNewUserForm((current) => ({ ...current, admissionNumber: event.target.value }))}
                        placeholder="ADM-0008"
                      />
                    </label>

                    <label>
                      Access code
                      <input
                        type="text"
                        value={newUserForm.accessCode}
                        onChange={(event) => setNewUserForm((current) => ({ ...current, accessCode: event.target.value }))}
                        placeholder="CODE9999"
                      />
                    </label>
                  </>
                )}
              </div>

              <button type="submit" className="admin-primary">Add account</button>
            </form>

            <div className="admin-user-list">
              {superadminAccounts.map((account) => (
                <div key={account.email} className="admin-user-card">
                  <div>
                    <strong>{account.name}</strong>
                    <span>{account.role}</span>
                  </div>
                  <button type="button" className="admin-mini-button">View</button>
                </div>
              ))}

              {parentAccounts.map((account) => (
                <div key={account.admissionNumber} className="admin-user-card">
                  <div>
                    <strong>{account.name}</strong>
                    <span>Parent · {account.admissionNumber}</span>
                  </div>
                  <button type="button" className="admin-mini-button">Access</button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <h1>Cedar Model Schools Portal</h1>
        </header>

        <main className="page-shell">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/admin-login" element={<StaffLoginPage />} />
            <Route path="/staff-login" element={<StaffLoginPage />} />
            <Route path="/parent-login" element={<ParentLoginPage />} />
            <Route path="/parent-dashboard" element={<ParentDashboardPage />} />
            <Route path="/parent-results" element={<ParentResultsPage />} />
            <Route path="/staff-dashboard" element={<StaffDashboardPage />} />
            <Route path="/student-management" element={<StudentManagementPage />} />
            <Route path="/student-add" element={<StudentAddPage />} />
            <Route path="/student-empty" element={<EmptyStudentPage />} />
            <Route path="/dashboard-awaiting-publication" element={<AwaitingPublicationPage />} />
            <Route path="/dashboard-variant-one" element={<DashboardVariantPage variant="one" />} />
            <Route path="/dashboard-variant-two" element={<DashboardVariantPage variant="two" />} />
            <Route path="/dashboard-variant-three" element={<DashboardVariantPage variant="three" />} />
            <Route path="/access-codes" element={<AccessCodeManagementPage />} />
            <Route path="/access-codes-generate" element={<GenerateClassCodesPage />} />
            <Route path="/parent-results-pending" element={<ParentResultsPendingPage />} />
            <Route path="/parent-results-loading" element={<ParentResultsLoadingPage />} />
            <Route path="/results-screen-report" element={<ResultsVariantPage variant="report" />} />
            <Route path="/results-screen-secondary" element={<ResultsVariantPage variant="secondary" />} />
            <Route path="/results-screen-tertiary" element={<ResultsVariantPage variant="tertiary" />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
