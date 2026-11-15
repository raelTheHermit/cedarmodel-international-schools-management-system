import { useId, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api';
import adminIcon from '../assets/icons/admin login.svg';
import parentIcon from '../assets/icons/parent login.svg';
import { BrandMark, Icon } from './icons';

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function AuthShell({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  return (
    <div className="au-shell">
      <section className="au-panel">{children}</section>
      <aside className="au-hero">{hero}</aside>
    </div>
  );
}

function HeroBadge({ children }: { children: ReactNode }) {
  return (
    <p className="au-hero-badge">
      <Icon name="lock" size={12} strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}

function BackLink({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" className={`au-back ${className}`.trim()} onClick={() => navigate('/')}>
      <Icon name="arrowLeft" size={11} strokeWidth={1.8} />
      Choose access type
    </button>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  invalid = false,
  disabled = false,
  secret = false,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  /** Renders a show/hide toggle and masks the value by default. */
  secret?: boolean;
  autoComplete?: string;
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const classes = ['au-field', invalid ? 'is-invalid' : '', disabled ? 'is-disabled' : ''].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={secret && !revealed ? 'password' : 'text'}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      {secret && (
        <button
          type="button"
          className="au-reveal"
          disabled={disabled}
          aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={revealed}
          onClick={() => setRevealed((current) => !current)}
        >
          <Icon name={revealed ? 'eyeOff' : 'eye'} size={17} />
        </button>
      )}
    </div>
  );
}

function FormMessage({ tone = 'error', children }: { tone?: 'error' | 'warning'; children: ReactNode }) {
  return (
    <p className={`au-message ${tone}`} role="alert">
      <Icon name="alert" size={16} />
      <span>{children}</span>
    </p>
  );
}

const NETWORK_ERROR = 'We couldn’t reach the server. Check your connection and try again.';

/* ------------------------------------------------------------------ */
/* Choose role                                                         */
/* ------------------------------------------------------------------ */

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      hero={(
        <>
          <HeroBadge>Secure school access</HeroBadge>
          <h2>One portal.<br />The right access for you.</h2>
          <p>Results and school administration, protected by role-based access.</p>
        </>
      )}
    >
      <div className="au-col wide">
        <BrandMark />
        <p className="au-brand-name">Cedar Model Schools</p>

        <h1 className="au-title large">Welcome to the<br />School Results Portal</h1>
        <p className="au-lead">Choose how you want to access the portal.</p>

        <div className="au-choices">
          <button type="button" className="au-choice" onClick={() => navigate('/parent-login')}>
            <span className="au-choice-icon"><img src={parentIcon} alt="" /></span>
            <span className="au-choice-copy">
              <strong>Parent login</strong>
              <small>View your child’s current results securely.</small>
            </span>
            <Icon name="arrowRight" size={16} className="au-choice-arrow" />
          </button>

          <button type="button" className="au-choice" onClick={() => navigate('/admin-login')}>
            <span className="au-choice-icon"><img src={adminIcon} alt="" /></span>
            <span className="au-choice-copy">
              <strong>Admin login</strong>
              <small>Authorised school administrators only.</small>
            </span>
            <Icon name="arrowRight" size={16} className="au-choice-arrow" />
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

/* ------------------------------------------------------------------ */
/* Admin login                                                         */
/* ------------------------------------------------------------------ */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function StaffLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (cleanPassword.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setError('');
    setBusy(true);

    try {
      const result = await api.loginStaff({ email: cleanEmail, password: cleanPassword });
      const { role } = result.user;

      // Teachers keep the class-scoped dashboard; administrators land on the admin portal.
      if (role === 'teacher') {
        navigate('/staff-dashboard', { state: { role, name: result.user.email } });
      } else {
        navigate('/admin-overview');
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      hero={(
        <>
          <HeroBadge>Authorised administrators</HeroBadge>
          <h2>Manage results.<br />Support every learner.</h2>
          <p>Secure access to the Cedar Model Schools administration portal.</p>
        </>
      )}
    >
      <div className="au-col">
        <div className="au-mark-row">
          <BackLink />
          <BrandMark />
        </div>
        <p className="au-brand-name">Cedar Model Schools</p>

        <h1 className="au-title">Admin login</h1>
        <p className="au-lead small">Sign in with your authorised school administrator account.</p>

        <form className="au-form" onSubmit={handleSubmit} noValidate>
          <TextField label="Email address" name="email" value={email} onChange={setEmail} autoComplete="username" />
          <TextField label="Password" name="password" value={password} onChange={setPassword} secret autoComplete="current-password" />

          {error && <FormMessage>{error}</FormMessage>}

          <button type="submit" className="au-submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <p className="au-note">
          Access is limited to authorised administrators.<br />
          Contact the school if you need assistance.
        </p>
      </div>
    </AuthShell>
  );
}

/* ------------------------------------------------------------------ */
/* Parent login                                                        */
/* ------------------------------------------------------------------ */

type ParentLoginState =
  | { kind: 'idle' }
  | { kind: 'incorrect'; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'locked' };

export function ParentLoginPage() {
  const navigate = useNavigate();
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [state, setState] = useState<ParentLoginState>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);

  const locked = state.kind === 'locked';
  const invalid = state.kind === 'incorrect';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || locked) return;

    const admission = admissionNumber.trim();
    const code = accessCode.trim();

    if (!admission || !code) {
      setState({ kind: 'incorrect', message: 'Enter your admission number and access code.' });
      return;
    }

    setState({ kind: 'idle' });
    setBusy(true);

    try {
      const result = await api.loginParent({ admissionNumber: admission, accessCode: code });
      navigate('/parent-dashboard', { state: { admissionNumber: result.user.admissionNumber } });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        // The API answers 403 once an account is temporarily locked after repeated failures.
        setState({ kind: 'locked' });
      } else if (caught instanceof ApiError) {
        setState({ kind: 'incorrect', message: 'The admission number or access code is incorrect.' });
      } else {
        setState({ kind: 'unavailable', message: NETWORK_ERROR });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      hero={(
        <>
          <h2 className="parent-hero-title">Your child’s results, safely in your hands.</h2>
          <HeroBadge>Secure parent access</HeroBadge>

          <div className="au-progress-card" aria-hidden="true">
            <p className="au-progress-label">Academic progress</p>
            <p className="au-progress-title">School reports</p>
            <p className="au-progress-status"><i />Secure access</p>
            <svg className="au-progress-chart" viewBox="0 0 218 84" preserveAspectRatio="none">
              <defs>
                <linearGradient id="au-progress-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d="M0 62 C34 62 52 60 78 44 C104 28 130 10 168 8 L218 8 L218 84 L0 84 Z" fill="url(#au-progress-fill)" />
              <path d="M0 62 C34 62 52 60 78 44 C104 28 130 10 168 8 L218 8" fill="none" stroke="#fff" strokeWidth="1.4" />
            </svg>
            <div className="au-progress-scale"><span>PRIVATE</span><span>VERIFIED</span><span>SECURE</span></div>
          </div>
        </>
      )}
    >
      <BackLink className="corner" />

      <div className={locked ? 'au-col is-locked' : 'au-col'}>
        <BrandMark />

        <h1 className="au-title parent">Parent login</h1>

        <form className="au-form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Admission number"
            name="admissionNumber"
            value={admissionNumber}
            onChange={setAdmissionNumber}
            invalid={invalid}
            disabled={locked}
            autoComplete="username"
          />
          <TextField
            label="Access code"
            name="accessCode"
            value={accessCode}
            onChange={setAccessCode}
            invalid={invalid}
            disabled={locked}
            secret
            autoComplete="current-password"
          />

          {(state.kind === 'incorrect' || state.kind === 'unavailable') && <FormMessage>{state.message}</FormMessage>}
          {locked && (
            <FormMessage tone="warning">
              Too many unsuccessful login attempts. Access has been temporarily restricted. Please contact your child’s school for assistance.
            </FormMessage>
          )}

          <button type="submit" className="au-submit" disabled={busy || locked}>
            {locked ? 'Access temporarily restricted' : busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <p className="au-note tight">
          Having trouble accessing your account?<br />
          Please contact your child’s school.
        </p>
      </div>
    </AuthShell>
  );
}
