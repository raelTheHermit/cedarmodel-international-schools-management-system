import { useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import brandIcon from './assets/icons/logo.png';
import './portal/portal.css';
import { AccessCodeManagementPage, AdminOverviewPage, AuditLogPage, GenerateClassCodesPage, GenerateIndividualCodePage, ResultsReviewPage, ResultsUploadPage, StudentAddPage, StudentImportPage, StudentManagementPage } from './portal/admin';
import { LandingPage, ParentLoginPage, StaffLoginPage } from './portal/auth';
import { MessageModal, MessageModalContext, useMessageModal } from './portal/message-modal';
import { ParentDashboardPage, ParentResultsPage } from './portal/parent';

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

const defaultUserForm = {
  name: '',
  email: '',
  password: '',
  accountRole: 'superadmin' as AccountRole,
  admissionNumber: '',
  accessCode: '',
};

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

function StaffDashboardPage() {
  const navigate = useNavigate();
  const showMessage = useMessageModal();
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

    showMessage(`Upload queued for ${uploadedFile.name}. Register import is not connected yet.`);
    event.target.value = '';
  };

  const handleAddUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newUserForm.name.trim()) {
      showMessage('Please enter a full name before saving the account.');
      return;
    }

    if (newUserForm.accountRole === 'parent') {
      const admissionNumber = newUserForm.admissionNumber.trim();
      const accessCode = newUserForm.accessCode.trim();
      if (!admissionNumber || !accessCode) {
        showMessage('Parent accounts need an admission number and access code.');
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
      showMessage('Parent account added.');
      return;
    }

    const email = newUserForm.email.trim();
    const password = newUserForm.password.trim();
    if (!email || !password) {
      showMessage('Staff accounts need both email and password.');
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
    showMessage('Staff account added.');
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

const legacyPaths = new Set([
  '/staff-dashboard',
  '/dashboard-awaiting-publication',
  '/dashboard-variant-one',
  '/dashboard-variant-two',
  '/dashboard-variant-three',
  '/results-screen-report',
  '/results-screen-secondary',
  '/results-screen-tertiary',
]);

function AppRoutes() {
  const { pathname } = useLocation();
  // Screens built from the Figma frames are full-bleed; the older pages keep the padded page shell.
  const className = legacyPaths.has(pathname) ? 'page-shell' : 'page-shell bleed';

  return (
    <main className={className}>
      <Routes>
        {/* Sign in */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin-login" element={<StaffLoginPage />} />
        <Route path="/staff-login" element={<StaffLoginPage />} />
        <Route path="/parent-login" element={<ParentLoginPage />} />

        {/* Parent portal */}
        <Route path="/parent-dashboard" element={<ParentDashboardPage />} />
        <Route path="/parent-dashboard-awaiting" element={<ParentDashboardPage view="awaiting" />} />
        <Route path="/parent-dashboard-loading" element={<ParentDashboardPage view="loading" />} />
        <Route path="/parent-dashboard-error" element={<ParentDashboardPage view="error" />} />
        <Route path="/parent-results" element={<ParentResultsPage />} />
        <Route path="/parent-results-pending" element={<ParentResultsPage view="pending" />} />
        <Route path="/parent-results-loading" element={<ParentResultsPage view="loading" />} />
        <Route path="/parent-results-error" element={<ParentResultsPage view="error" />} />

        {/* Admin portal */}
        <Route path="/admin-overview" element={<AdminOverviewPage />} />
        <Route path="/admin-overview-loading" element={<AdminOverviewPage view="loading" />} />
        <Route path="/student-management" element={<StudentManagementPage />} />
        <Route path="/student-empty" element={<StudentManagementPage view="empty" />} />
        <Route path="/student-import" element={<StudentImportPage />} />
        <Route path="/student-add" element={<StudentAddPage />} />
        <Route path="/access-codes" element={<AccessCodeManagementPage />} />
        <Route path="/access-codes-generate" element={<GenerateClassCodesPage />} />
        <Route path="/access-codes-individual" element={<GenerateIndividualCodePage />} />
        <Route path="/results-upload" element={<ResultsUploadPage />} />
        <Route path="/results-review" element={<ResultsReviewPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />

        {/* Earlier pages that are not part of the Figma set */}
        <Route path="/staff-dashboard" element={<StaffDashboardPage />} />
        <Route path="/dashboard-awaiting-publication" element={<AwaitingPublicationPage />} />
        <Route path="/dashboard-variant-one" element={<DashboardVariantPage variant="one" />} />
        <Route path="/dashboard-variant-two" element={<DashboardVariantPage variant="two" />} />
        <Route path="/dashboard-variant-three" element={<DashboardVariantPage variant="three" />} />
        <Route path="/results-screen-report" element={<ResultsVariantPage variant="report" />} />
        <Route path="/results-screen-secondary" element={<ResultsVariantPage variant="secondary" />} />
        <Route path="/results-screen-tertiary" element={<ResultsVariantPage variant="tertiary" />} />

        <Route path="*" element={<LandingPage />} />
      </Routes>
    </main>
  );
}

function App() {
  const [message, setMessage] = useState('');

  return (
    <BrowserRouter>
      <MessageModalContext.Provider value={setMessage}>
        <div className="app-shell">
          <header className="topbar">
            <h1>Cedar Model Schools Portal</h1>
          </header>

          <AppRoutes />
        </div>
        <MessageModal message={message} onClose={() => setMessage('')} />
      </MessageModalContext.Provider>
    </BrowserRouter>
  );
}

export default App;
