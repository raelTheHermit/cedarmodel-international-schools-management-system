import { createContext, useContext, useMemo, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api';
import brandIcon from './assets/icons/logo.png';
import parentIcon from './assets/icons/parent login.svg';
import adminIcon from './assets/icons/admin login.svg';
import './extra.css'

/* -------------------------------------------------------------------------- */
/*  Branding / placeholder copy (single place to change)                       */
/* -------------------------------------------------------------------------- */

// The admin screens in the designs say "Greenfield"; the parent screens and the
// crest say "Miracle School". Both are kept as designed, but isolated here.
const ADMIN_BRAND = 'Greenfield';
const SCHOOL_CONTACT = {
  name: 'Greenfield Academy',
  email: 'office@greenfieldacademy.edu',
  phone: '+234 803 555 0142',
};

/* -------------------------------------------------------------------------- */
/*  Message modal                                                              */
/* -------------------------------------------------------------------------- */

const MessageModalContext = createContext<(message: string) => void>(() => undefined);

function useMessageModal() {
  return useContext(MessageModalContext);
}

function MessageModal({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;

  return (
    <div className="message-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="message-modal" role="dialog" aria-modal="true" aria-labelledby="message-modal-title">
        <span className="message-modal-mark" aria-hidden="true">!</span>
        <h2 id="message-modal-title">Portal message</h2>
        <p>{message}</p>
        <button type="button" className="message-modal-button" onClick={onClose} autoFocus>Okay</button>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Icons and marks                                                            */
/* -------------------------------------------------------------------------- */

function AssetIcon({ src, alt = '', className = '' }: { src: string; alt?: string; className?: string }) {
  return <img src={src} alt={alt} className={className} />;
}

type IconName =
  | 'home' | 'users' | 'lock' | 'upload' | 'doc' | 'history' | 'search' | 'bell'
  | 'plus' | 'logout' | 'eye' | 'eye-off' | 'alert' | 'arrow-left' | 'arrow-right' | 'clock';

const iconPaths: Record<IconName, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.4c1.9.8 3 2.6 3 5.6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  doc: (
    <>
      <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M9.5 13h6M9.5 17h6M9.5 9h2" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 8v4l3 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 21h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  logout: <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9" />,
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M3 3l18 18" />
      <path d="M6.6 6.7C3.9 8.5 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4-.9M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" />
    </>
  ),
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {iconPaths[name]}
    </svg>
  );
}

/** The dark rounded square with a white dot used on auth screens and the results banner. */
function BrandMark({ width = 36 }: { width?: number }) {
  return (
    <svg className="brand-dot" width={width} height={(width * 32) / 36} viewBox="0 0 36 32" aria-hidden="true">
      <rect width="36" height="32" rx="9" fill="#161614" />
      <circle cx="18" cy="16" r="6" fill="#fff" />
    </svg>
  );
}

function AdminLogo() {
  return (
    <svg className="admin-logo-svg" width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
      <rect width="38" height="38" rx="9" fill="#14263a" />
      <rect x="9" y="19" width="4" height="10" rx="1" fill="#fff" opacity="0.7" />
      <rect x="17" y="11" width="4" height="18" rx="1" fill="#fff" />
      <rect x="25" y="16" width="4" height="13" rx="1" fill="#fff" opacity="0.85" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Types and mock data                                                        */
/* -------------------------------------------------------------------------- */

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

type ParentAccount = {
  name: string;
  studentName?: string;
  admissionNumber: string;
  accessCode: string;
};

/** What the parent screens need to know. Never includes the access code. */
type ParentSession = {
  name: string;
  studentName?: string;
  admissionNumber: string;
};

/** Student register as shown on the admin Student Management / Access Codes screens. */
type RegisterStudent = {
  name: string;
  admissionNumber: string;
  className: string;
  active: boolean;
  codeGeneratedOn: string | null;
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

const registerStudents: RegisterStudent[] = [
  { name: 'Amina Okafor', admissionNumber: 'SCH/2025/0142', className: 'JSS 2A', active: true, codeGeneratedOn: '18 Mar 2026' },
  { name: 'David Eze', admissionNumber: 'SCH/2025/0158', className: 'JSS 2A', active: true, codeGeneratedOn: '18 Mar 2026' },
  { name: 'Nneka Ibe', admissionNumber: 'SCH/2025/0181', className: 'JSS 3B', active: true, codeGeneratedOn: '18 Mar 2026' },
  { name: 'Tobi Martins', admissionNumber: 'SCH/2025/0204', className: 'SS 1A', active: true, codeGeneratedOn: null },
  { name: 'Zainab Musa', admissionNumber: 'SCH/2025/0227', className: 'JSS 1C', active: true, codeGeneratedOn: null },
  { name: 'Chidera Nwosu', admissionNumber: 'SCH/2024/0119', className: 'SS 2C', active: false, codeGeneratedOn: null },
  { name: 'Fiyinfoluwa Adeyemi', admissionNumber: 'SCH/2025/0241', className: 'JSS 1C', active: true, codeGeneratedOn: null },
  { name: 'Samuel Effiong', admissionNumber: 'SCH/2024/0096', className: 'SS 2C', active: true, codeGeneratedOn: null },
];

const CLASS_OPTIONS = ['Primary 4', 'Primary 5', 'JSS 1', 'JSS 1A', 'JSS 1C', 'JSS 2A', 'JSS 3B', 'SS 1A', 'SS 2C'];

const seededSuperadmins: StaffAccount[] = [
  { name: 'Vice Principal', email: 'viceprincipal@cedarmodel.local', password: 'VicePrincipal123!', role: 'superadmin' },
  { name: 'School Administrator', email: 'administrator@cedarmodel.local', password: 'SchoolAdmin123!', role: 'superadmin' },
  { name: 'Developer', email: 'developer@cedarmodel.local', password: 'Developer123!', role: 'superadmin' },
];

const seededParents: ParentAccount[] = [
  { name: 'Aisha Adebayo', studentName: 'Ada Okafor', admissionNumber: 'ADM-0001', accessCode: 'CODE1234' },
  { name: 'Femi Bello', studentName: 'Femi Bello', admissionNumber: 'ADM-0002', accessCode: 'CODE2345' },
  { name: 'Tosin Adeyemi', studentName: 'Tosin Adeyemi', admissionNumber: 'ADM-0003', accessCode: 'CODE3456' },
];

const DEMO_PARENT: ParentSession = {
  name: 'Parent',
  studentName: 'Amina Okafor',
  admissionNumber: 'SCH/2025/0142',
};

/* Results ------------------------------------------------------------------ */

type ResultRow = { subject: string; ca1: number; ca2: number; exam: number };

// CA 1 and CA 2 are out of 20, the exam is out of 60 (see the results header).
// For the seeded ADM-* accounts only a total was stored, so the split below is a
// placeholder derivation. Replace with real CA/exam data from the API.
const fromTotals = (rows: Array<[string, number]>): ResultRow[] => rows.map(([subject, total]) => {
  const ca = Math.round(total * 0.2);
  return { subject, ca1: ca, ca2: ca, exam: total - ca * 2 };
});

const defaultResults: ResultRow[] = [
  { subject: 'English Language', ca1: 17, ca2: 16, exam: 54 },
  { subject: 'General Mathematics', ca1: 18, ca2: 19, exam: 56 },
  { subject: 'Biology', ca1: 16, ca2: 17, exam: 52 },
  { subject: 'Chemistry', ca1: 17, ca2: 16, exam: 50 },
  { subject: 'Physics', ca1: 15, ca2: 17, exam: 49 },
  { subject: 'Further Mathematics', ca1: 14, ca2: 15, exam: 45 },
  { subject: 'Economics', ca1: 16, ca2: 15, exam: 48 },
  { subject: 'Civic Education', ca1: 18, ca2: 17, exam: 51 },
  { subject: 'Computer Studies', ca1: 19, ca2: 18, exam: 55 },
];

const publishedParentResults: Record<string, ResultRow[]> = {
  'ADM-0001': fromTotals([['English', 92], ['Mathematics', 88], ['Science', 90], ['Social Studies', 87]]),
  'ADM-0002': fromTotals([['English', 81], ['Mathematics', 86], ['Science', 79], ['Computer Studies', 90]]),
  'ADM-0003': fromTotals([['English', 76], ['Mathematics', 80], ['Biology', 82], ['Civic Education', 78]]),
};

const GRADE_SCALE = [
  { grade: 'A', min: 80, label: '80-100' },
  { grade: 'B', min: 70, label: '70-79' },
  { grade: 'C', min: 60, label: '60-69' },
  { grade: 'D', min: 50, label: '50-59' },
  { grade: 'E', min: 40, label: '40-49' },
  { grade: 'F', min: 0, label: '0-39' },
];

// F is the only failing band on the scale shown, so a credit is earned from E up.
const CREDIT_PASS_MARK = 40;

const gradeFor = (total: number) => (GRADE_SCALE.find((band) => total >= band.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1]).grade;

const performanceLabel = (average: number) => {
  if (average >= 80) return 'Excellent performance';
  if (average >= 70) return 'Very good performance';
  if (average >= 60) return 'Good performance';
  if (average >= 50) return 'Fair performance';
  return 'Needs improvement';
};

// Placeholder report data until the API supplies it.
const REPORT_META = {
  className: 'SS 2 Science',
  department: 'Science',
  session: '2025/2026',
  term: 'Second term',
  classPosition: '3rd of 28',
  schoolDays: 62,
  daysPresent: 59,
  conduct: 'Excellent',
  punctuality: 'Very good',
  house: 'Emerald',
  club: 'Science & Technology',
  teacherName: 'Mr T. Balogun',
  nextTermBegins: '28 April 2026',
};

const defaultUserForm = {
  name: '',
  email: '',
  password: '',
  accountRole: 'superadmin' as AccountRole,
  admissionNumber: '',
  accessCode: '',
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const initialsOf = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => part[0])
  .slice(0, 2)
  .join('')
  .toUpperCase();

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

/** A rejected fetch surfaces as a TypeError; anything else is treated as bad credentials. */
const loginFailureMessage = (error: unknown, credentialMessage: string) => (
  error instanceof TypeError
    ? 'We couldn’t reach the server. Check your connection and try again.'
    : credentialMessage
);

function useParentSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const parent = (location.state as { parent?: ParentSession } | null)?.parent ?? DEMO_PARENT;
  const go = (path: string) => navigate(path, { state: { parent } });
  return { parent, go };
}

/** Staff identity carried through router state. UI only: the backend must enforce roles itself. */
function useStaffSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { role?: Role; name?: string } | null;
  const role: Role = state?.role ?? 'superadmin';
  const name = state?.name ?? 'School Administrator';
  const go = (path: string) => navigate(path, { state: { role, name } });
  return { role, name, go };
}

/* -------------------------------------------------------------------------- */
/*  Auth screens                                                               */
/* -------------------------------------------------------------------------- */

function AuthSplitLayout({
  children,
  rightContent,
}: {
  children: ReactNode;
  rightContent: ReactNode;
}) {
  return (
    <div className="auth-shell">
      <section className="auth-panel">{children}</section>
      <aside className="auth-hero">{rightContent}</aside>
    </div>
  );
}

type FormErrorState = { message: string; fields: string[] };

function AuthField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  invalid = false,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  const isSecret = type === 'password';

  return (
    <label className={invalid ? 'auth-field is-invalid' : 'auth-field'}>
      <span className="auth-field-label">{label}</span>
      <input
        name={name}
        type={isSecret && visible ? 'text' : type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
      />
      {isSecret && (
        <button
          type="button"
          className="auth-field-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={18} />
        </button>
      )}
    </label>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <p className="auth-error" role="alert">
      <Icon name="alert" size={16} />
      <span>{message}</span>
    </p>
  );
}

function LandingPage() {
  const navigate = useNavigate();

  return (
    <AuthSplitLayout
      rightContent={(
        <>
          <div className="auth-hero-badge">
            <Icon name="lock" size={14} className="hero-icon" />
            <span>Secure school access</span>
          </div>
          <h2>One portal.<br />The right access for you.</h2>
          <p>Results and school administration, protected by role-based access.</p>
        </>
      )}
    >
      <div className="auth-logo"><BrandMark /></div>

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
          <span className="portal-arrow"><Icon name="arrow-right" size={16} /></span>
        </button>

        <button type="button" className="portal-choice" onClick={() => navigate('/admin-login')}>
          <span className="portal-choice-icon"><AssetIcon src={adminIcon} alt="" /></span>
          <div className="portal-choice-copy">
            <span className="portal-tag">Admin login</span>
            <small>Authorised school administrators only.</small>
          </div>
          <span className="portal-arrow"><Icon name="arrow-right" size={16} /></span>
        </button>
      </div>
    </AuthSplitLayout>
  );
}

function StaffLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<FormErrorState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError({ message: 'Enter a valid email address.', fields: ['email'] });
      return;
    }

    if (cleanPassword.length < 8) {
      setError({ message: 'Password must contain at least 8 characters.', fields: ['password'] });
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = await api.loginStaff({ email: cleanEmail, password: cleanPassword });
      navigate('/staff-dashboard', {
        state: {
          role: result.user.role,
          name: result.user.email,
        },
      });
    } catch (caught) {
      setError({
        message: loginFailureMessage(caught, 'The email address or password is incorrect.'),
        fields: ['email', 'password'],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      rightContent={(
        <>
          <div className="auth-hero-badge">
            <Icon name="lock" size={14} className="hero-icon" />
            <span>Authorised administrators</span>
          </div>
          <h2>Manage results.<br />Support every learner.</h2>
          <p>Secure access to the Miracle Schools administration portal.</p>
        </>
      )}
    >
      <div className="auth-top-row">
        <button type="button" className="portal-back-link" onClick={() => navigate('/')}>
          <Icon name="arrow-left" size={12} />
          <span>Choose access type</span>
        </button>
      </div>

      <div className="auth-logo"><BrandMark /></div>
      <div className="brand-block">
        <div className="brand-name">MIRACLE SCHOOLS</div>
      </div>

      <div className="welcome-copy compact">
        <h1>Admin login</h1>
        <p>Sign in with your authorised school administrator account.</p>
      </div>

      <form className="login-form auth-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Email address"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="username"
          invalid={error?.fields.includes('email')}
        />
        <AuthField
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          invalid={error?.fields.includes('password')}
        />
        {error && <AuthError message={error.message} />}
        <button type="submit" className="primary-login-button" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      <p className="access-note">Access is limited to authorised administrators.<br />Contact the school if you need assistance.</p>
    </AuthSplitLayout>
  );
}

function TermChart() {
  return (
    <svg className="term-chart" viewBox="0 0 232 84" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="term-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 66 C32 66 52 64 84 44 S150 6 232 6 V84 H0 Z" fill="url(#term-fill)" />
      <path
        d="M0 66 C32 66 52 64 84 44 S150 6 232 6"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ParentLoginPage() {
  const navigate = useNavigate();
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<FormErrorState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const cleanAdmission = admissionNumber.trim();
    const cleanCode = accessCode.trim();

    if (!cleanAdmission || !cleanCode) {
      setError({
        message: 'Enter your admission number and access code.',
        fields: [!cleanAdmission && 'admissionNumber', !cleanCode && 'accessCode'].filter(Boolean) as string[],
      });
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = await api.loginParent({ admissionNumber: cleanAdmission, accessCode: cleanCode });
      const match = seededParents.find((account) => account.admissionNumber === result.user.admissionNumber);
      // Deliberately leave the access code out of router state (it ends up in history.state).
      const session: ParentSession = match
        ? { name: match.name, studentName: match.studentName, admissionNumber: match.admissionNumber }
        : { name: 'Parent', admissionNumber: result.user.admissionNumber };

      navigate('/parent-dashboard', { state: { parent: session } });
    } catch (caught) {
      setError({
        message: loginFailureMessage(caught, 'The admission number or access code is incorrect.'),
        fields: ['admissionNumber', 'accessCode'],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="parent-login-shell">
      <section className="parent-login-panel">
        <button type="button" className="parent-login-back" onClick={() => navigate('/')}>
          <Icon name="arrow-left" size={14} />
          <span>Choose access type</span>
        </button>

        <div className="auth-logo"><BrandMark /></div>

        <h1 className="parent-login-title">Parent login</h1>

        <form className="parent-login-form auth-form" onSubmit={handleSubmit} noValidate>
          <AuthField
            label="Admission number"
            name="admissionNumber"
            value={admissionNumber}
            onChange={setAdmissionNumber}
            autoComplete="username"
            invalid={error?.fields.includes('admissionNumber')}
          />
          <AuthField
            label="Access code"
            name="accessCode"
            type="password"
            value={accessCode}
            onChange={setAccessCode}
            autoComplete="current-password"
            invalid={error?.fields.includes('accessCode')}
          />
          {error && <AuthError message={error.message} />}
          <button type="submit" className="parent-login-button" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <div className="parent-disclaimer">
          <span>Having trouble accessing your account?</span>
          <span>Please contact your child’s school.</span>
        </div>
      </section>

      <aside className="parent-login-hero">
        <h2>Your child’s results, safely in your hands.</h2>

        <div className="hero-label-row">
          <span className="lock-mini"><Icon name="lock" size={13} /></span>
          <span>Secure parent access</span>
        </div>

        <div className="term-card">
          <div className="term-card-header">ACADEMIC PROGRESS</div>
          <div className="term-card-title">Second term</div>
          <div className="term-card-meta">• Published</div>

          <div className="term-graph">
            <TermChart />
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

/* -------------------------------------------------------------------------- */
/*  Parent portal                                                              */
/* -------------------------------------------------------------------------- */

function ParentShell({
  active,
  title,
  children,
}: {
  active: 'overview' | 'results';
  title: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { parent, go } = useParentSession();
  const initials = initialsOf(parent.studentName ?? parent.name);

  return (
    <div className="parent-portal-shell">
      <aside className="parent-sidebar">
        <div className="parent-brand">
          <AssetIcon src={brandIcon} alt="Miracle School" className="parent-brand-logo" />
        </div>

        <nav className="parent-nav" aria-label="Parent navigation">
          <button
            type="button"
            className={active === 'overview' ? 'parent-nav-item active' : 'parent-nav-item'}
            onClick={() => go('/parent-dashboard')}
          >
            <Icon name="home" />
            Overview
          </button>
          <button
            type="button"
            className={active === 'results' ? 'parent-nav-item active' : 'parent-nav-item'}
            onClick={() => go('/parent-results')}
          >
            <Icon name="doc" />
            Results
          </button>
        </nav>

        <button type="button" className="parent-logout" onClick={() => navigate('/')}>
          <Icon name="logout" />
          Log out
        </button>
      </aside>

      <main className="parent-main-panel">
        <header className="parent-topbar">
          <div className="topbar-heading">
            <small className="parent-portal-label">Parent Portal</small>
            <span className="topbar-title">{title}</span>
          </div>
          <button type="button" className="parent-avatar" aria-label="User profile">{initials}</button>
        </header>

        {children}
      </main>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="parent-page-content" aria-busy="true" aria-label="Loading overview">
      <div className="skeleton skeleton-line skeleton-eyebrow" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line skeleton-sub" />

      <div className="parent-grid">
        <div className="parent-main-column">
          <section className="parent-card skeleton-card">
            <div className="skeleton-split">
              <div className="skeleton-stack">
                <div className="skeleton skeleton-line skeleton-short" />
                <div className="skeleton skeleton-block" />
              </div>
              <div className="skeleton skeleton-pill" />
            </div>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="skeleton-split skeleton-row">
                <div className="skeleton skeleton-line skeleton-short" />
                <div className="skeleton skeleton-line skeleton-short" />
              </div>
            ))}
          </section>

          <section className="parent-card skeleton-card">
            <div className="skeleton-split">
              <div className="skeleton-stack">
                <div className="skeleton skeleton-line skeleton-short" />
                <div className="skeleton skeleton-block" />
              </div>
              <div className="skeleton skeleton-pill" />
            </div>
            <div className="skeleton-split skeleton-row">
              <div className="skeleton skeleton-circle" />
              <div className="skeleton-stack skeleton-grow">
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line skeleton-short" />
              </div>
            </div>
          </section>
        </div>

        <aside className="parent-side-column">
          <div className="status-card dark-card skeleton-card">
            <div className="skeleton skeleton-line skeleton-short" />
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-line" />
          </div>
          <div className="help-card skeleton-card">
            <div className="skeleton skeleton-line skeleton-short" />
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-block" />
          </div>
          <div className="help-card skeleton-card">
            <div className="skeleton-split">
              <div className="skeleton skeleton-circle" />
              <div className="skeleton-stack skeleton-grow">
                <div className="skeleton skeleton-line skeleton-short" />
                <div className="skeleton skeleton-line" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

type OverviewStatus = 'loading' | 'published' | 'processing' | 'error';

function ParentDashboardPage({ status = 'published' }: { status?: OverviewStatus }) {
  const { parent, go } = useParentSession();
  const studentName = parent.studentName ?? 'Student record';
  const firstName = parent.studentName?.split(' ')[0];
  const admissionNumber = parent.admissionNumber;

  const studentInfo = [
    { label: 'Admission number', value: admissionNumber },
    { label: 'Class', value: 'JSS 2A' },
    { label: 'Academic session', value: REPORT_META.session },
    { label: 'Current term', value: REPORT_META.term },
  ];

  if (status === 'loading') {
    return (
      <ParentShell active="overview" title="Overview">
        <OverviewSkeleton />
      </ParentShell>
    );
  }

  const statusLabel = status === 'published' ? 'Published' : status === 'processing' ? 'Awaiting publication' : 'Unavailable';

  return (
    <ParentShell active="overview" title="Overview">
      <div className="parent-page-content">
        <h1 className="parent-title">{firstName ? `${greeting()}, ${firstName}’s parent.` : `${greeting()}.`}</h1>
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

              <h2 className="results-title">{REPORT_META.term} results</h2>

              {status === 'published' && (
                <div className="result-cta-box">
                  <div className="callout-text">The current-term report card is ready.</div>
                  <p>
                    View the school-issued secondary report for {studentName}. This portal provides read-only access.
                  </p>
                  <button type="button" className="dark-button" onClick={() => go('/parent-results')}>
                    View results
                    <Icon name="arrow-right" size={16} />
                  </button>
                </div>
              )}

              {status === 'processing' && (
                <div className="result-cta-box processing">
                  <div className="processing-icon"><Icon name="clock" size={20} /></div>
                  <div className="processing-copy">
                    <div className="callout-text">Results are being processed.</div>
                    <p>
                      The current-term report is awaiting publication. It will become available here only after the school publishes it.
                    </p>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="error-box">
                  <div className="error-badge">!</div>
                  <div className="callout-text error-title">Unable to load dashboard</div>
                  <p>
                    We couldn’t retrieve the dashboard information. Check your connection and try again.
                  </p>
                  <button type="button" className="dark-button small-button" onClick={() => go('/parent-dashboard')}>
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
                <span>{statusLabel}</span>
              </div>
              <p>Status for {REPORT_META.term.toLowerCase()}, {REPORT_META.session} academic session.</p>
            </div>

            <div className="help-card">
              <h4>Need Assistance?</h4>
              <div className="help-title">Contact the school</div>
              <p>For questions about access or results, contact the {SCHOOL_CONTACT.name} office directly.</p>
              <div className="contact-box">{SCHOOL_CONTACT.email}</div>
              <div className="contact-box">{SCHOOL_CONTACT.phone}</div>
            </div>

            <div className="help-card secure-card">
              <div className="secure-header">
                <span className="lock-icon"><Icon name="lock" size={16} /></span>
                <span>Secure Access</span>
              </div>
              <p>This account is read-only. Unpublished results remain securely restricted.</p>
            </div>
          </aside>
        </div>
      </div>
    </ParentShell>
  );
}

function ParentResultsPage({ status = 'published' }: { status?: 'published' | 'processing' }) {
  const { parent, go } = useParentSession();
  const studentName = parent.studentName ?? 'Student';
  const firstName = studentName.split(' ')[0];
  const admissionNumber = parent.admissionNumber;
  const published = status === 'published';

  // Unpublished results are never computed or rendered.
  const rows = useMemo(() => (published ? (publishedParentResults[admissionNumber] ?? defaultResults) : [])
    .map((row) => {
      const total = row.ca1 + row.ca2 + row.exam;
      return { ...row, total, grade: gradeFor(total) };
    }), [published, admissionNumber]);

  const average = rows.length ? rows.reduce((sum, row) => sum + row.total, 0) / rows.length : 0;
  const highest = rows.length ? Math.max(...rows.map((row) => row.total)) : 0;
  const credits = rows.filter((row) => row.total >= CREDIT_PASS_MARK).length;
  const absent = REPORT_META.schoolDays - REPORT_META.daysPresent;
  const attendanceRate = ((REPORT_META.daysPresent / REPORT_META.schoolDays) * 100).toFixed(1);

  return (
    <ParentShell active="results" title="Results">
      <div className="results-content">
        <button type="button" className="results-back-link" onClick={() => go('/parent-dashboard')}>
          <Icon name="arrow-left" size={14} />
          <span>Back to overview</span>
        </button>

        <section className="result-banner">
          <div className="result-banner-left">
            <div className="result-brand-inline">MIRACLE SCHOOLS · SENIOR SECONDARY</div>
            <div className="result-title-row">
              <span className="result-title-icon" aria-hidden="true"><BrandMark width={48} /></span>
              <h2>{published ? 'Academic result statement' : 'Current-term results'}</h2>
            </div>
            <div className="result-subtitle">{REPORT_META.term} · {REPORT_META.session} session</div>
          </div>
          <div className="result-banner-right">
            <Icon name={published ? 'lock' : 'clock'} size={14} />
            {published ? 'Official view-only record' : 'Awaiting publication'}
          </div>
        </section>

        <section className="result-meta-grid">
          <div className="meta-entry"><span>Student</span><strong>{studentName}</strong></div>
          <div className="meta-entry"><span>Admission number</span><strong>{admissionNumber}</strong></div>
          <div className="meta-entry"><span>Class</span><strong>{REPORT_META.className}</strong></div>
          <div className="meta-entry"><span>Department</span><strong>{REPORT_META.department}</strong></div>
          <div className="meta-entry"><span>Academic session</span><strong>{REPORT_META.session}</strong></div>
          <div className="meta-entry"><span>Term</span><strong>{REPORT_META.term}</strong></div>
        </section>

        {!published && (
          <>
            <section className="result-pending-panel">
              <div className="pending-clock"><Icon name="clock" size={22} /></div>
              <div className="pending-header">RESULTS ARE BEING PROCESSED</div>
              <h3>Current-term results have not yet been published.</h3>
              <p>
                The school is still preparing and reviewing this term&apos;s report. Subject scores, grades, and comments will remain unavailable until the completed results are officially published.
              </p>
              <button type="button" className="dark-button" onClick={() => go('/parent-dashboard-pending')}>
                Return to overview
              </button>
            </section>

            <div className="results-note">
              <Icon name="lock" size={14} />
              No draft results or incomplete scores are visible in the Parent Portal.
            </div>
          </>
        )}

        {published && (
          <>
            <section className="score-panel">
              <div className="score-panel-header">
                <div>
                  <div className="sr-eyebrow">Academic transcript</div>
                  <h3 className="sr-section-title">Subject result breakdown</h3>
                </div>
                <span className="score-panel-note">CA 1: 20 · CA 2: 20 · Examination: 60</span>
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
                    {rows.map((row) => (
                      <tr key={row.subject}>
                        <td>{row.subject}</td>
                        <td>{row.ca1}</td>
                        <td>{row.ca2}</td>
                        <td>{row.exam}</td>
                        <td><strong>{row.total}</strong></td>
                        <td><span className="grade-chip">{row.grade}</span></td>
                        <td>
                          {row.total >= CREDIT_PASS_MARK
                            ? <span className="status-badge success">Earned</span>
                            : <span className="status-badge muted">Not earned</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="stats-strip">
              <div className="sr-stat-primary">
                <div className="metric-label">Overall average</div>
                <div className="sr-stat-figure">{average.toFixed(1)}<span>%</span></div>
                <small className="sr-stat-note">{performanceLabel(average)}</small>
              </div>

              <div className="sr-stat-grid">
                <div className="metric-box">
                  <div className="metric-label">Class position</div>
                  <div className="metric-value">{REPORT_META.classPosition}</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Subjects offered</div>
                  <div className="metric-value">{rows.length}</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Credits earned</div>
                  <div className="metric-value">{credits} of {rows.length}</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Highest total</div>
                  <div className="metric-value">{highest} / 100</div>
                </div>
              </div>
            </section>

            <section className="details-grid">
              <div className="detail-card">
                <div className="sr-eyebrow">Attendance record</div>
                <div className="detail-title">Term attendance</div>
                <div className="detail-list">
                  <div><span>School days</span><strong>{REPORT_META.schoolDays}</strong></div>
                  <div><span>Days present</span><strong>{REPORT_META.daysPresent}</strong></div>
                  <div><span>Days absent</span><strong>{absent}</strong></div>
                  <div><span>Attendance rate</span><strong>{attendanceRate}%</strong></div>
                </div>
              </div>

              <div className="detail-card">
                <div className="sr-eyebrow">Student record</div>
                <div className="detail-title">Conduct and activities</div>
                <div className="detail-list">
                  <div><span>Conduct</span><strong>{REPORT_META.conduct}</strong></div>
                  <div><span>Punctuality</span><strong>{REPORT_META.punctuality}</strong></div>
                  <div><span>House</span><strong>{REPORT_META.house}</strong></div>
                  <div><span>Club</span><strong>{REPORT_META.club}</strong></div>
                </div>
              </div>

              <div className="detail-card">
                <div className="sr-eyebrow">Grade key</div>
                <div className="detail-title">Secondary grading scale</div>
                <div className="grade-grid">
                  {GRADE_SCALE.map((band) => (
                    <div key={band.grade} className="grade-key-item">
                      <span className="grade-chip">{band.grade}</span>
                      <span>{band.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="comment-box">
              <div className="comment-label">CLASS TEACHER’S COMMENT</div>
              <p>
                {firstName} demonstrates strong analytical ability and consistent commitment across her science subjects. She should sustain her revision routine and participate more in group discussions.
              </p>
              <small>{REPORT_META.teacherName} · Class teacher</small>
            </section>
          </>
        )}
      </div>

      <footer className="results-footer">
        <div className="footer-left">
          <small>Next term begins</small>
          <strong>{REPORT_META.nextTermBegins}</strong>
        </div>
        <div className="footer-right">
          <Icon name="lock" size={14} />
          This result statement is strictly view-only.
        </div>
      </footer>
    </ParentShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Admin shell                                                                */
/* -------------------------------------------------------------------------- */

type AdminNavKey = 'overview' | 'students' | 'access-codes' | 'results-upload' | 'results-review' | 'audit-log';

const adminNavItems: Array<{ key: AdminNavKey; label: string; icon: IconName; path: string }> = [
  { key: 'overview', label: 'Overview', icon: 'home', path: '/staff-dashboard' },
  { key: 'students', label: 'Student Management', icon: 'users', path: '/student-management' },
  { key: 'access-codes', label: 'Access Codes', icon: 'lock', path: '/access-codes' },
  { key: 'results-upload', label: 'Results Upload', icon: 'upload', path: '/staff-dashboard' },
  { key: 'results-review', label: 'Results Review', icon: 'doc', path: '/staff-dashboard' },
  { key: 'audit-log', label: 'Audit Log', icon: 'history', path: '/staff-dashboard' },
];

const TEACHER_NAV: AdminNavKey[] = ['overview', 'results-upload', 'results-review'];

function AdminShell({
  active,
  title,
  contentClassName = 'admin-portal-content',
  children,
}: {
  active: AdminNavKey;
  title: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { role, name, go } = useStaffSession();
  const items = role === 'teacher' ? adminNavItems.filter((item) => TEACHER_NAV.includes(item.key)) : adminNavItems;

  if (!items.some((item) => item.key === active)) {
    return <Navigate to="/staff-dashboard" replace state={{ role, name }} />;
  }

  return (
    <div className="admin-portal-shell">
      <aside className="admin-portal-sidebar">
        <div className="admin-portal-brand">
          <AdminLogo />
          <div>
            <div className="admin-portal-title">{ADMIN_BRAND}</div>
            <small>School Results Portal</small>
          </div>
        </div>

        <div className="admin-portal-section-label">Administration</div>
        <nav className="admin-portal-nav" aria-label="Admin navigation">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === active ? 'admin-portal-item active' : 'admin-portal-item'}
              onClick={() => go(item.path)}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-portal-user">
          <div className="admin-portal-user-avatar">{role === 'teacher' ? 'TE' : 'AO'}</div>
          <div>
            <strong>{role === 'teacher' ? 'Teacher' : 'Admin Office'}</strong>
            <small>{role === 'teacher' ? 'Class access' : 'Administrator'}</small>
          </div>
        </div>

        <button type="button" className="admin-portal-logout" onClick={() => navigate('/')}>
          <Icon name="logout" />
          Log out
        </button>
      </aside>

      <main className="admin-portal-main">
        <header className="admin-portal-topbar">
          <div className="admin-topbar-heading">
            <small className="admin-portal-label">Admin Portal</small>
            <span className="admin-topbar-title">{title}</span>
          </div>

          <div className="admin-portal-topbar-actions">
            <div className="admin-portal-search-wrap">
              <span className="admin-portal-search-icon"><Icon name="search" size={16} /></span>
              <input type="text" placeholder="Search portal" aria-label="Search portal" />
              <span className="admin-portal-shortcut" aria-hidden="true">⌘ K</span>
            </div>
            <button type="button" className="admin-portal-bell" aria-label="Notifications">
              <Icon name="bell" size={17} />
              <span className="admin-portal-bell-dot" aria-hidden="true" />
            </button>
            <button type="button" className="admin-portal-avatar" aria-label="User profile">AO</button>
          </div>
        </header>

        <div className={contentClassName}>{children}</div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Admin: student management                                                  */
/* -------------------------------------------------------------------------- */

function StudentManagementPage({ initial = registerStudents }: { initial?: RegisterStudent[] }) {
  const { go: navigate } = useStaffSession();
  const showMessage = useMessageModal();
  const [students, setStudents] = useState(initial);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All classes');

  const classes = useMemo(() => [...new Set(students.map((student) => student.className))].sort(), [students]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => (
      (classFilter === 'All classes' || student.className === classFilter)
      && (!query || student.name.toLowerCase().includes(query) || student.admissionNumber.toLowerCase().includes(query))
    ));
  }, [students, search, classFilter]);

  const handleDeactivate = (student: RegisterStudent) => {
    if (!window.confirm(`Deactivate ${student.name}? They will no longer appear as an active student.`)) return;
    setStudents((current) => current.map((entry) => (
      entry.admissionNumber === student.admissionNumber ? { ...entry, active: false } : entry
    )));
  };

  return (
    <AdminShell active="students" title="Student Management" contentClassName="admin-access-content">
      <div className="admin-page-header-block access-header-row">
        <div>
          <h1>Student Management</h1>
          <p>Manage student profiles, class assignments, and account access.</p>
        </div>

        {students.length > 0 && (
          <div className="admin-header-actions">
            <button type="button" className="admin-secondary-light btn-with-icon" onClick={() => navigate('/student-import')}>
              <Icon name="upload" size={16} />
              Import register
            </button>
            <button type="button" className="admin-primary-dark btn-with-icon" onClick={() => navigate('/student-add')}>
              <Icon name="plus" size={16} />
              Add student
            </button>
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <section className="empty-state-panel">
          <div className="empty-state-icon"><Icon name="users" size={24} /></div>
          <h2>No students in the system</h2>
          <p>There are currently no student records available. Add a student manually or import your school’s existing Excel register to get started.</p>
          <div className="empty-state-actions">
            <button type="button" className="admin-primary-dark btn-with-icon" onClick={() => navigate('/student-add')}>
              <Icon name="plus" size={16} />
              Add student manually
            </button>
            <button type="button" className="admin-secondary-light btn-with-icon" onClick={() => navigate('/student-import')}>
              <Icon name="upload" size={16} />
              Import Excel register
            </button>
          </div>
          <small className="empty-state-note">Excel and CSV registers are supported for bulk import.</small>
        </section>
      ) : (
        <section className="access-table-panel">
          <div className="access-table-header">
            <div>
              <div className="admin-breadcrumb">School register</div>
              <h3>All students</h3>
              <small className="access-table-count">Showing {visible.length} of {students.length} records</small>
            </div>

            <div className="access-table-controls">
              <div className="search-inline">
                <Icon name="search" size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or admission number"
                  aria-label="Search students"
                />
              </div>
              <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Filter by class">
                <option>All classes</option>
                {classes.map((className) => <option key={className}>{className}</option>)}
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
                  <th>Account status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="access-table-empty">No students match your search.</td>
                  </tr>
                )}
                {visible.map((student) => (
                  <tr key={student.admissionNumber}>
                    <td>
                      <div className="access-student-name">
                        <span className="access-avatar">{initialsOf(student.name)}</span>
                        {student.name}
                      </div>
                    </td>
                    <td>{student.admissionNumber}</td>
                    <td>{student.className}</td>
                    <td>
                      <span className={student.active ? 'status-badge success' : 'status-badge muted'}>
                        {student.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="student-actions">
                        <button
                          type="button"
                          className="admin-link-button"
                          onClick={() => showMessage('Editing student records is not connected yet.')}
                        >
                          Edit
                        </button>
                        {student.active ? (
                          <button type="button" className="admin-link-button danger" onClick={() => handleDeactivate(student)}>
                            Deactivate
                          </button>
                        ) : (
                          <span className="admin-muted-text">Deactivated</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AdminShell>
  );
}

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

function StudentImportPage() {
  const { go: navigate } = useStaffSession();
  const showMessage = useMessageModal();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const accept = (candidate: File | undefined) => {
    if (!candidate) return;

    if (!/\.(csv|xlsx|xls)$/i.test(candidate.name)) {
      setFile(null);
      setError('Choose a CSV or Excel file (.csv, .xlsx or .xls).');
      return;
    }

    if (candidate.size > MAX_IMPORT_BYTES) {
      setFile(null);
      setError('That file is larger than 10 MB.');
      return;
    }

    setError('');
    setFile(candidate);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    accept(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files?.[0]);
  };

  return (
    <AdminShell active="students" title="Student Management">
      <button type="button" className="admin-portal-back" onClick={() => navigate('/student-management')}>
        <Icon name="arrow-left" size={14} />
        <span>Back to student management</span>
      </button>

      <div className="admin-page-header-block">
        <h1>Import student register</h1>
        <p>Add existing student records from a CSV or Excel register.</p>
      </div>

      <section className="admin-upload-card">
        <div className="admin-upload-label">Bulk import</div>
        <h2>Upload your student register</h2>
        <p>Include columns for full name, admission number, class, date of birth, gender, and account status.</p>

        <div
          className={dragging ? 'admin-upload-dropzone is-dragging' : 'admin-upload-dropzone'}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div className="admin-upload-icon"><Icon name="upload" size={20} /></div>
          <div className="admin-upload-copy">
            {file ? (
              <>
                <div>{file.name}</div>
                <small>{(file.size / 1024).toFixed(file.size < 102400 ? 1 : 0)} KB</small>
              </>
            ) : (
              <>
                <div>Choose a register to upload</div>
                <small>CSV or Excel files up to 10 MB</small>
              </>
            )}
          </div>
          <button type="button" className="admin-link-button" onClick={() => document.getElementById('register-file')?.click()}>
            {file ? 'Choose a different file' : 'Browse files'}
          </button>
          <input id="register-file" type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleChange} />
        </div>

        {error && <AuthError message={error} />}

        <div className="admin-upload-note">
          <strong>Before you import</strong>
          <span>Duplicate admission numbers will be skipped. You can edit imported student records after the upload is complete.</span>
        </div>

        <div className="admin-upload-actions">
          <button type="button" className="admin-secondary-light" onClick={() => navigate('/student-management')}>Cancel</button>
          <button
            type="button"
            className="admin-primary-dark btn-with-icon"
            disabled={!file}
            onClick={() => showMessage(`Register import is not connected to the backend yet. ${file?.name ?? 'The file'} was not uploaded.`)}
          >
            Import register
            <Icon name="arrow-right" size={16} />
          </button>
        </div>
      </section>
    </AdminShell>
  );
}

function FormField({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={error ? 'sr-field has-error' : 'sr-field'}>
      <span className="sr-field-label">
        {label}
        {required && <span className="sr-required" aria-hidden="true"> *</span>}
      </span>
      {children}
      {error && <span className="sr-field-error" role="alert">{error}</span>}
    </label>
  );
}

function StudentAddPage() {
  const { go: navigate } = useStaffSession();
  const showMessage = useMessageModal();
  const year = new Date().getFullYear();
  const [form, setForm] = useState({
    fullName: '',
    admissionNumber: `SCH/${year}/`,
    className: 'JSS 1A',
    dob: '',
    gender: '',
    status: 'Active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const admission = form.admissionNumber.trim().toUpperCase();
    const today = new Date().toISOString().slice(0, 10);

    if (form.fullName.trim().length < 2) next.fullName = 'Enter the student’s full name.';

    if (!/^SCH\/\d{4}\/\d{3,5}$/.test(admission)) {
      next.admissionNumber = `Use the format SCH/${year}/0001.`;
    } else if (registerStudents.some((student) => student.admissionNumber === admission)) {
      next.admissionNumber = 'That admission number is already in the register.';
    }

    if (!form.dob) next.dob = 'Select a date of birth.';
    else if (form.dob > today) next.dob = 'Date of birth can’t be in the future.';

    if (!form.gender) next.gender = 'Select a gender.';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    showMessage('The details are valid, but saving students is not connected to the backend yet.');
  };

  return (
    <AdminShell active="students" title="Student Management">
      <button type="button" className="admin-portal-back" onClick={() => navigate('/student-management')}>
        <Icon name="arrow-left" size={14} />
        <span>Back to student management</span>
      </button>

      <div className="admin-page-header-block">
        <h1>Add a student</h1>
        <p>Create a student profile and assign them to a class.</p>
      </div>

      <section className="student-form-shell">
        <form className="student-form-card" onSubmit={handleSubmit} noValidate>
          <div className="student-form-header">
            <div>
              <div className="admin-breadcrumb">Student information</div>
              <h2>New student details</h2>
              <p className="student-form-note">All fields are required to create a complete school record.</p>
            </div>
          </div>

          <div className="student-form-grid">
            <FormField label="Full name" required error={errors.fullName}>
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => update('fullName')(event.target.value)}
                placeholder="e.g. Adaeze Obi"
                autoComplete="off"
              />
            </FormField>

            <FormField label="Admission number" required error={errors.admissionNumber}>
              <input
                type="text"
                value={form.admissionNumber}
                onChange={(event) => update('admissionNumber')(event.target.value)}
                autoComplete="off"
              />
            </FormField>

            <FormField label="Class assignment" required>
              <select value={form.className} onChange={(event) => update('className')(event.target.value)}>
                {CLASS_OPTIONS.map((className) => <option key={className}>{className}</option>)}
              </select>
            </FormField>

            <FormField label="Date of birth" required error={errors.dob}>
              <input type="date" value={form.dob} onChange={(event) => update('dob')(event.target.value)} />
            </FormField>

            <FormField label="Gender" required error={errors.gender}>
              <select value={form.gender} onChange={(event) => update('gender')(event.target.value)}>
                <option value="" disabled>Select gender</option>
                <option>Female</option>
                <option>Male</option>
              </select>
            </FormField>

            <FormField label="Account status">
              <select value={form.status} onChange={(event) => update('status')(event.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </FormField>
          </div>

          <div className="student-form-footer">
            <button type="button" className="admin-secondary-light" onClick={() => navigate('/student-management')}>Cancel</button>
            <button type="submit" className="admin-primary-dark btn-with-icon">
              Add student
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </form>
      </section>
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Admin: access codes                                                        */
/* -------------------------------------------------------------------------- */

function AccessCodeManagementPage() {
  const { go: navigate } = useStaffSession();
  const showMessage = useMessageModal();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All classes');

  const classes = useMemo(() => [...new Set(registerStudents.map((student) => student.className))].sort(), []);
  const generated = registerStudents.filter((student) => student.codeGeneratedOn).length;

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return registerStudents.filter((student) => (
      (classFilter === 'All classes' || student.className === classFilter)
      && (!query || student.name.toLowerCase().includes(query) || student.admissionNumber.toLowerCase().includes(query))
    ));
  }, [search, classFilter]);

  return (
    <AdminShell active="access-codes" title="Access Codes" contentClassName="admin-access-content">
      <div className="admin-page-header-block access-header-row">
        <div>
          <div className="admin-breadcrumb">Parent portal access</div>
          <h1>Access Code Management</h1>
          <p>Generate and monitor secure parent access without exposing active codes.</p>
        </div>
        <button type="button" className="admin-primary-dark" onClick={() => navigate('/access-codes-generate')}>Generate class codes</button>
      </div>

      <div className="admin-access-stats">
        <div className="admin-stat-block">
          <span>Total students</span>
          <strong>{registerStudents.length}</strong>
          <small>Across {classes.length} classes</small>
        </div>
        <div className="admin-stat-block">
          <span>Codes generated</span>
          <strong>{generated}</strong>
          <small>Available through secure delivery only</small>
        </div>
        <div className="admin-stat-block">
          <span>Not generated</span>
          <strong>{registerStudents.length - generated}</strong>
          <small>Students still requiring access</small>
        </div>
      </div>

      <div className="access-inline-info">
        <span className="info-badge"><Icon name="lock" size={16} /></span>
        <div>
          <strong>Codes remain private</strong>
          <span>Access codes are shown once, immediately after generation. They never appear in this student list or in the audit log.</span>
        </div>
      </div>

      <section className="access-table-panel">
        <div className="access-table-header">
          <div>
            <div className="admin-breadcrumb">Student access</div>
            <h3>Access-code status</h3>
            <small className="access-table-count">Showing {rows.length} of {registerStudents.length} students</small>
          </div>

          <div className="access-table-controls">
            <div className="search-inline">
              <Icon name="search" size={16} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or admission number"
                aria-label="Search students"
              />
            </div>
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Filter by class">
              <option>All classes</option>
              {classes.map((className) => <option key={className}>{className}</option>)}
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
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="access-table-empty">No students match your search.</td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.admissionNumber}>
                  <td>
                    <div className="access-student-name">
                      <span className="access-avatar">{initialsOf(row.name)}</span>
                      {row.name}
                    </div>
                  </td>
                  <td>{row.admissionNumber}</td>
                  <td>{row.className}</td>
                  <td>
                    <span className={row.codeGeneratedOn ? 'status-badge success' : 'status-badge muted'}>
                      {row.codeGeneratedOn ? 'Generated' : 'Not generated'}
                    </span>
                  </td>
                  <td>{row.codeGeneratedOn ?? '—'}</td>
                  <td>
                    <div className="student-actions">
                      <button
                        type="button"
                        className="admin-link-button"
                        onClick={() => showMessage('Code generation is not connected to the backend yet.')}
                      >
                        {row.codeGeneratedOn ? 'Regenerate' : 'Generate code'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function GenerateClassCodesPage() {
  const { go: navigate } = useStaffSession();
  const showMessage = useMessageModal();
  const classes = useMemo(() => [...new Set(registerStudents.map((student) => student.className))].sort(), []);
  const [className, setClassName] = useState(classes[0]);
  const [confirmed, setConfirmed] = useState(false);

  const inClass = registerStudents.filter((student) => student.className === className);
  const replacing = inClass.filter((student) => student.codeGeneratedOn).length;

  return (
    <AdminShell active="access-codes" title="Access Codes" contentClassName="admin-portal-content admin-portal-content-wide">
      <button type="button" className="admin-portal-back" onClick={() => navigate('/access-codes')}>
        <Icon name="arrow-left" size={14} />
        <span>Back to Access Code Management</span>
      </button>

      <div className="class-code-title-block">
        <h1>Generate Class Codes</h1>
        <p>Issue new parent portal credentials for an entire class.</p>
      </div>

      <section className="class-code-generator">
        <div className="class-code-icon"><Icon name="lock" size={22} /></div>
        <div className="class-code-header-row">
          <div className="class-code-label">Class-wide generation</div>
        </div>

        <div className="class-code-form">
          <label className="class-code-field">
            <span>Class assignment</span>
            <select value={className} onChange={(event) => { setClassName(event.target.value); setConfirmed(false); }}>
              {classes.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>

          <div className="class-code-metrics">
            <div className="class-code-metric">
              <span>Students receiving new codes</span>
              <strong>{inClass.length}</strong>
            </div>
            <div className="class-code-metric">
              <span>Existing codes being replaced</span>
              <strong>{replacing}</strong>
            </div>
          </div>

          <div className="class-code-warning">
            <span className="warning-symbol">!</span>
            <div>
              <strong>This action issues new login credentials</strong>
              <p>Any existing access code for a student in {className} will stop working. The new codes will be displayed once after generation.</p>
            </div>
          </div>

          <div className="class-code-checklist">
            <p>Before you continue</p>
            <ul>
              <li>All students in {className} are included.</li>
              <li>Existing codes for this class are replaced, not duplicated.</li>
              <li>New codes will not appear later in the audit log.</li>
            </ul>
          </div>

          <label className="class-code-consent">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I understand that this will replace existing credentials and that the new codes are shown only once.</span>
          </label>
        </div>

        <div className="class-code-actions">
          <button type="button" className="admin-secondary-light" onClick={() => navigate('/access-codes')}>Cancel</button>
          <button
            type="button"
            className="admin-primary-dark btn-with-icon"
            disabled={!confirmed || inClass.length === 0}
            onClick={() => showMessage('Code generation is not connected to the backend yet.')}
          >
            Generate Codes
            <Icon name="arrow-right" size={16} />
          </button>
        </div>
      </section>
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Staff dashboard overview (now inside AdminShell; logic unchanged)          */
/* -------------------------------------------------------------------------- */

function StaffDashboardPage() {
  const { role, go: navigate } = useStaffSession();
  const showMessage = useMessageModal();
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

  const handleAddUser = (event: FormEvent<HTMLFormElement>) => {
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
    <AdminShell active="overview" title="Overview" contentClassName="admin-access-content">
      <div className="admin-page-header-block access-header-row">
        <div>
          <div className="admin-breadcrumb">School dashboard</div>
          <h1>{role === 'superadmin' ? 'School overview' : `Class dashboard · ${teacherClass}`}</h1>
        </div>

        {role === 'superadmin' && (
          <div className="admin-header-actions">
            <button type="button" className="admin-secondary-light btn-with-icon" onClick={() => navigate('/student-import')}>
              <Icon name="upload" size={16} />
              Upload records
            </button>
            <button type="button" className="admin-primary-dark btn-with-icon" onClick={() => navigate('/student-add')}>
              <Icon name="plus" size={16} />
              Add student
            </button>
          </div>
        )}
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Dashboard sections">
        {visibleSidebar.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={selectedNav === item.key}
            className={selectedNav === item.key ? 'admin-tab active' : 'admin-tab'}
            onClick={() => setSelectedNav(item.key as typeof selectedNav)}
          >
            {item.label}
          </button>
        ))}
      </div>

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
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  App                                                                        */
/* -------------------------------------------------------------------------- */

function App() {
  const [message, setMessage] = useState('');

  return (
    <BrowserRouter>
      <MessageModalContext.Provider value={setMessage}>
        <div className="app-shell">
          <main className="page-shell">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/admin-login" element={<StaffLoginPage />} />
              <Route path="/staff-login" element={<StaffLoginPage />} />
              <Route path="/parent-login" element={<ParentLoginPage />} />

              <Route path="/parent-dashboard" element={<ParentDashboardPage />} />
              <Route path="/parent-dashboard-pending" element={<ParentDashboardPage status="processing" />} />
              <Route path="/parent-dashboard-loading" element={<ParentDashboardPage status="loading" />} />
              <Route path="/parent-dashboard-error" element={<ParentDashboardPage status="error" />} />
              <Route path="/parent-results" element={<ParentResultsPage />} />
              <Route path="/parent-results-pending" element={<ParentResultsPage status="processing" />} />

              <Route path="/staff-dashboard" element={<StaffDashboardPage />} />
              <Route path="/student-management" element={<StudentManagementPage />} />
              <Route path="/student-empty" element={<StudentManagementPage initial={[]} />} />
              <Route path="/student-import" element={<StudentImportPage />} />
              <Route path="/student-add" element={<StudentAddPage />} />
              <Route path="/access-codes" element={<AccessCodeManagementPage />} />
              <Route path="/access-codes-generate" element={<GenerateClassCodesPage />} />

              <Route path="*" element={<LandingPage />} />
            </Routes>
          </main>
        </div>
        <MessageModal message={message} onClose={() => setMessage('')} />
      </MessageModalContext.Provider>
    </BrowserRouter>
  );
}

export default App;