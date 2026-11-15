import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import brandIcon from '../assets/icons/logo.png';
import { BarsLogo, Icon } from './icons';
import type { IconName } from './icons';
import { initialsOf } from './data';
import { useStaffOptional } from './staff-context';

async function signOut(navigate: ReturnType<typeof useNavigate>) {
  try {
    await api.logout();
  } catch {
    // The session may already be gone (or the API unreachable); either way the person leaves the portal.
  }
  navigate('/');
}

/* ------------------------------------------------------------------ */
/* Parent portal                                                       */
/* ------------------------------------------------------------------ */

export type ParentSection = 'overview' | 'results';

export function ParentShell({
  section,
  title,
  studentName,
  schoolName,
  navState,
  capsLabel = false,
  children,
}: {
  section: ParentSection;
  title: string;
  studentName: string;
  /** From the school profile an administrator maintains. */
  schoolName?: string;
  navState?: unknown;
  /** The design uses an uppercase, tracked "PARENT PORTAL" label on the error, pending and loading screens. */
  capsLabel?: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const go = (to: string) => navigate(to, { state: navState });

  return (
    <div className="pp-shell">
      <aside className="pp-sidebar">
        <div className="pp-brand">
          <img src={brandIcon} alt="" />
          <div>
            <strong>{(schoolName || 'School portal').toUpperCase()}</strong>
            <small>PARENT RESULTS PORTAL</small>
          </div>
        </div>

        <nav className="pp-nav" aria-label="Parent navigation">
          <button
            type="button"
            className={section === 'overview' ? 'pp-nav-item active' : 'pp-nav-item'}
            aria-current={section === 'overview' ? 'page' : undefined}
            onClick={() => go('/parent-dashboard')}
          >
            <Icon name="home" size={17} />
            Overview
          </button>
          <button
            type="button"
            className={section === 'results' ? 'pp-nav-item active' : 'pp-nav-item'}
            aria-current={section === 'results' ? 'page' : undefined}
            onClick={() => go('/parent-results')}
          >
            <Icon name="doc" size={17} />
            Results
          </button>
        </nav>

        <button type="button" className="pp-logout" onClick={() => void signOut(navigate)}>
          <Icon name="logout" size={16} />
          Log out
        </button>
      </aside>

      <div className="pp-main">
        <header className="pp-topbar">
          <div>
            <p className={capsLabel ? 'pp-portal-label caps' : 'pp-portal-label'}>Parent Portal</p>
            <h1 className="pp-page-title">{title}</h1>
          </div>
          <span className="pp-avatar" role="img" aria-label="Signed in as parent">
            {initialsOf(studentName)}
          </span>
        </header>

        <div className="pp-content">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Staff portal                                                        */
/* ------------------------------------------------------------------ */

export type AdminSection = 'overview' | 'students' | 'attendance' | 'codes' | 'upload' | 'review' | 'audit' | 'setup';

const adminNav: Array<{ key: AdminSection; label: string; icon: IconName; to: string; adminOnly: boolean }> = [
  { key: 'overview', label: 'Overview', icon: 'home', to: '/admin-overview', adminOnly: true },
  { key: 'students', label: 'Student Management', icon: 'users', to: '/student-management', adminOnly: false },
  { key: 'attendance', label: 'Attendance', icon: 'check', to: '/attendance', adminOnly: false },
  { key: 'codes', label: 'Access Codes', icon: 'lock', to: '/access-codes', adminOnly: true },
  { key: 'upload', label: 'Results Upload', icon: 'upload', to: '/results-upload', adminOnly: false },
  { key: 'review', label: 'Results Review', icon: 'doc', to: '/results-review', adminOnly: true },
  { key: 'audit', label: 'Audit Log', icon: 'history', to: '/audit-log', adminOnly: true },
  { key: 'setup', label: 'School Setup', icon: 'doc', to: '/school-setup', adminOnly: true },
];

export function AdminShell({
  section,
  title,
  children,
}: {
  section: AdminSection;
  title: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const staff = useStaffOptional();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');

  const isAdmin = staff?.role === 'superadmin';
  const nav = adminNav.filter((item) => isAdmin || !item.adminOnly);
  const label = staff ? staff.email : 'Signed in';
  const initials = staff ? staff.email.slice(0, 2).toUpperCase() : '··';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // The search box finds students: it opens the student register filtered to what was typed.
  const runSearch = (event: FormEvent) => {
    event.preventDefault();
    const text = search.trim();
    navigate(text ? `/student-management?q=${encodeURIComponent(text)}` : '/student-management');
  };

  return (
    <div className="ap-shell">
      <aside className="ap-sidebar">
        <div className="ap-brand">
          <BarsLogo />
          <div>
            <strong>Cedar Model Schools</strong>
            <small>School Results Portal</small>
          </div>
        </div>

        <p className="ap-nav-label">{isAdmin ? 'Administration' : 'Teaching'}</p>
        <nav className="ap-nav" aria-label="Staff navigation">
          {nav.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === section ? 'ap-nav-item active' : 'ap-nav-item'}
              aria-current={item.key === section ? 'page' : undefined}
              onClick={() => navigate(item.to)}
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ap-sidebar-foot">
          <div className="ap-user">
            <span className="ap-avatar">{initials}</span>
            <div>
              <strong title={label}>{label.length > 22 ? `${label.slice(0, 21)}…` : label}</strong>
              <small>{isAdmin ? 'Administrator' : 'Teacher'}</small>
            </div>
          </div>
          <button type="button" className="ap-logout" onClick={() => void signOut(navigate)}>
            <Icon name="logout" size={16} />
            Log out
          </button>
        </div>
      </aside>

      <div className="ap-main">
        <header className="ap-topbar">
          <div>
            <p className="ap-portal-label">{isAdmin ? 'Admin Portal' : 'Teacher Portal'}</p>
            <h1 className="ap-page-title">{title}</h1>
          </div>

          <div className="ap-top-actions">
            <form className="ap-search" onSubmit={runSearch} role="search">
              <Icon name="search" size={15} />
              <input
                ref={searchRef}
                type="search"
                value={search}
                placeholder="Search students"
                aria-label="Search students"
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </form>
            <span className="ap-icon-button ap-avatar-button" role="img" aria-label={`Signed in as ${label}`}>
              {initials}
            </span>
          </div>
        </header>

        <div className="ap-content">{children}</div>
      </div>
    </div>
  );
}

/** Heading block used by every admin page: optional back link, serif title, subtitle and an optional action. */
export function AdminPageHeader({
  title,
  subtitle,
  eyebrow,
  backLabel,
  onBack,
  action,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  backLabel?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="ap-page-header">
      <div>
        {backLabel && onBack && (
          <button type="button" className="ap-back" onClick={onBack}>
            <Icon name="arrowLeft" size={13} />
            {backLabel}
          </button>
        )}
        {eyebrow && <p className="ap-eyebrow">{eyebrow}</p>}
        <h2 className="ap-title">{title}</h2>
        <p className="ap-subtitle">{subtitle}</p>
      </div>
      {action && <div className="ap-header-action">{action}</div>}
    </div>
  );
}
