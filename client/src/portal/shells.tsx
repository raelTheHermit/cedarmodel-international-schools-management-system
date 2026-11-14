import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import brandIcon from '../assets/icons/logo.png';
import { BarsLogo, Icon } from './icons';
import type { IconName } from './icons';
import { initialsOf } from './data';

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
  navState,
  capsLabel = false,
  children,
}: {
  section: ParentSection;
  title: string;
  studentName: string;
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
            <strong>MIRACLE SCHOOL</strong>
            <small>NURSERY, PRIMARY AND SECONDARY</small>
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
          <button type="button" className="pp-avatar" aria-label="Signed in as parent">
            {initialsOf(studentName)}
          </button>
        </header>

        <div className="pp-content">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin portal                                                        */
/* ------------------------------------------------------------------ */

export type AdminSection = 'overview' | 'students' | 'codes' | 'upload' | 'review' | 'audit' | 'setup';

const adminNav: Array<{ key: AdminSection; label: string; icon: IconName; to: string }> = [
  { key: 'overview', label: 'Overview', icon: 'home', to: '/admin-overview' },
  { key: 'students', label: 'Student Management', icon: 'users', to: '/student-management' },
  { key: 'codes', label: 'Access Codes', icon: 'lock', to: '/access-codes' },
  { key: 'upload', label: 'Results Upload', icon: 'upload', to: '/results-upload' },
  { key: 'review', label: 'Results Review', icon: 'doc', to: '/results-review' },
  { key: 'audit', label: 'Audit Log', icon: 'history', to: '/audit-log' },
  { key: 'setup', label: 'School Setup', icon: 'doc', to: '/school-setup' },
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
  const searchRef = useRef<HTMLInputElement>(null);

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

        <p className="ap-nav-label">Administration</p>
        <nav className="ap-nav" aria-label="Admin navigation">
          {adminNav.map((item) => (
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
            <span className="ap-avatar">SM</span>
            <div>
              <strong>School staff</strong>
              <small>Signed in account</small>
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
            <p className="ap-portal-label">Admin Portal</p>
            <h1 className="ap-page-title">{title}</h1>
          </div>

          <div className="ap-top-actions">
            <label className="ap-search">
              <Icon name="search" size={15} />
              <input ref={searchRef} type="search" placeholder="Search portal" aria-label="Search portal" />
              <kbd>⌘ K</kbd>
            </label>
            <button type="button" className="ap-icon-button" aria-label="Notifications">
              <Icon name="bell" size={16} />
              <span className="ap-bell-dot" aria-hidden="true" />
            </button>
            <button type="button" className="ap-icon-button ap-avatar-button" aria-label="Your account">
              SM
            </button>
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
