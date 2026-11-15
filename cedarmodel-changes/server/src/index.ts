import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { createExtrasRouter } from './admin-extras.js';
import { createAttendanceRouter } from './attendance.js';
import { createAuthApp, createCorsMiddleware } from './auth.js';
import { createParentRouter } from './parent.js';
import { createResultsRouter } from './results.js';
import { createStaffRouter } from './staff.js';
import { assertSessionConfig, errorHandler } from './session.js';
import { createAdminRouter } from './students.js';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

// Fail at boot, not at the first login, if the session secret is missing or weak.
assertSessionConfig();

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  // This server only returns JSON, so helmet's default CSP is safe to leave on.
  crossOriginResourcePolicy: false,
}));
app.use(createCorsMiddleware());
app.use(express.json({ limit: '3mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'school-results-portal-api' });
});

app.get('/api', (_req, res) => {
  res.json({ message: 'API ready.' });
});

app.use(createAuthApp());
app.use('/api/admin', createAdminRouter());
app.use('/api/admin', createResultsRouter());
app.use('/api/admin', createExtrasRouter());
app.use('/api/admin', createStaffRouter());
app.use('/api/admin', createAttendanceRouter());
app.use('/api/parent', createParentRouter());

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Must be last: turns any thrown/rejected error into a logged 500 instead of a hung request.
app.use(errorHandler);

// Vercel imports the Express app as a function. Keep the listener for local
// development, where the server is started with `npm run dev` or `npm start`.
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
