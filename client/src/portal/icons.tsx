import type { ReactNode } from 'react';
import brandIcon from '../assets/icons/logo.jpg';
import './portal.css'
export type IconName =
  | 'home'
  | 'users'
  | 'user'
  | 'clipboard'
  | 'lock'
  | 'upload'
  | 'doc'
  | 'history'
  | 'search'
  | 'bell'
  | 'eye'
  | 'eyeOff'
  | 'alert'
  | 'clock'
  | 'arrowRight'
  | 'arrowLeft'
  | 'plus'
  | 'logout'
  | 'check'
  | 'chevronDown';

const paths: Record<IconName, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20.5v-1a5.5 5.5 0 0 1 5.5-5.5h2a5.5 5.5 0 0 1 5.5 5.5v1" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18.5 14.4a5.5 5.5 0 0 1 3 4.9v1.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2.5" />
      <path d="M9 3h6v3.5H9z" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2.2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4.5" />
      <path d="m7.5 9 4.5-4.5L16.5 9" />
      <path d="M4 15.5v3a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5v-3" />
    </>
  ),
  doc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" />
      <path d="M3.5 3.5v5h5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8 2.5 8h-17S6 15.500 6 9z" />
      <path d="M10.300 20.500a2 2 0 0 0 3.400 0" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.600-6.500 10-6.500S22 12 22 12s-3.600 6.500-10 6.500S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.800" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.600 5.700A10 10 0 0 1 12 5.500c6.400 0 10 6.500 10 6.500a17 17 0 0 1-3 3.800" />
      <path d="M6.500 7A16.500 16.500 0 0 0 2 12s3.600 6.500 10 6.500a10 10 0 0 0 4.500-1.100" />
      <path d="M9.900 9.900a2.800 2.800 0 0 0 4.200 4.200" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9.500" />
      <path d="M12 7.500v5" />
      <path d="M12 16.200h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.200 2" />
    </>
  ),
  arrowRight: <path d="M4.500 12h15m-6-6 6 6-6 6" />,
  arrowLeft: <path d="M19.500 12h-15m6-6-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  logout: (
    <>
      <path d="M9 21H5.500A2.500 2.500 0 0 1 3 18.500v-13A2.500 2.500 0 0 1 5.500 3H9" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  check: <path d="m5 12.500 4.500 4.500L19 7.500" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.6,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

/** Dark rounded square with a white dot: the mark used on the auth and report-card screens in the design. */
export function BrandMark({ size = 34, className = '' }: { size?: number; className?: string }) {
  return (
    <span
    id='pl'
      className={`pt-mark ${className}`.trim()}
      
      aria-hidden="true"
    >
      <img src={brandIcon} alt="" />
    </span>
  );
}

/** Admin sidebar logo: dark rounded square with three bars. */
export function BarsLogo({ size = 38 }: { size?: number }) {
  return (
    <span className="ap-logo" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 20 20" fill="#fff">
        <rect x="1.500" y="9" width="4" height="9.500" rx="1" />
        <rect x="8" y="2" width="4" height="16.500" rx="1" />
        <rect x="14.500" y="6.500" width="4" height="12" rx="1" />
      </svg>
    </span>
  );
}
