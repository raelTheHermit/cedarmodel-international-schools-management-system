import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api';
import './portal/portal.css';
import {
  AdminOverviewPage,
  AuditLogPage,
  PromoteStudentsPage,
  ResultBatchPage,
  ResultsReviewPage,
  ResultsUploadPage,
} from './portal/admin-results';
import { AttendancePage, SchoolSetupPage } from './portal/admin-setup';
import {
  AccessCodeManagementPage,
  GenerateClassCodesPage,
  GenerateIndividualCodePage,
  RequireStaff,
  StudentFormPage,
  StudentImportPage,
  StudentManagementPage,
} from './portal/admin-live';
import { LandingPage, ParentLoginPage, StaffLoginPage } from './portal/auth';
import { MessageModal, MessageModalContext } from './portal/message-modal';
import { ParentDashboardPage, ParentResultsPage } from './portal/parent-live';

/** Parent pages are only reachable with a valid parent session (checked by the server, not the URL). */
function RequireParent({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');

  useEffect(() => {
    let cancelled = false;
    api.getParentProfile()
      .then(() => !cancelled && setState('ok'))
      .catch(() => !cancelled && setState('denied'));
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') return null;
  if (state === 'denied') return <Navigate to="/parent-login" replace />;
  return <>{children}</>;
}

const admin = (element: ReactNode) => <RequireStaff role="superadmin">{element}</RequireStaff>;
const anyStaff = (element: ReactNode) => <RequireStaff>{element}</RequireStaff>;

function AppRoutes() {
  return (
    <main className="page-shell bleed">
      <Routes>
        {/* Sign in */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin-login" element={<StaffLoginPage />} />
        <Route path="/staff-login" element={<StaffLoginPage />} />
        <Route path="/parent-login" element={<ParentLoginPage />} />

        {/* Parent portal */}
        <Route path="/parent-dashboard" element={<RequireParent><ParentDashboardPage /></RequireParent>} />
        <Route path="/parent-results" element={<RequireParent><ParentResultsPage /></RequireParent>} />

        {/* Staff: teachers work with their own classes; superadmins manage everything */}
        <Route path="/student-management" element={anyStaff(<StudentManagementPage />)} />
        <Route path="/attendance" element={anyStaff(<AttendancePage />)} />
        <Route path="/results-upload" element={anyStaff(<ResultsUploadPage />)} />
        <Route path="/results-review/:id" element={anyStaff(<ResultBatchPage />)} />
        <Route path="/staff-dashboard" element={<Navigate to="/student-management" replace />} />

        <Route path="/admin-overview" element={admin(<AdminOverviewPage />)} />
        <Route path="/student-import" element={admin(<StudentImportPage />)} />
        <Route path="/student-add" element={admin(<StudentFormPage mode="add" />)} />
        <Route path="/student-details/:id" element={anyStaff(<StudentFormPage mode="edit" />)} />
        <Route path="/student-edit/:id" element={anyStaff(<StudentFormPage mode="edit" />)} />
        <Route path="/student-promote" element={admin(<PromoteStudentsPage />)} />
        <Route path="/access-codes" element={admin(<AccessCodeManagementPage />)} />
        <Route path="/access-codes-generate" element={admin(<GenerateClassCodesPage />)} />
        <Route path="/access-codes-individual" element={admin(<GenerateIndividualCodePage />)} />
        <Route path="/results-review" element={admin(<ResultsReviewPage />)} />
        <Route path="/audit-log" element={admin(<AuditLogPage />)} />
        <Route path="/school-setup" element={admin(<SchoolSetupPage />)} />

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
