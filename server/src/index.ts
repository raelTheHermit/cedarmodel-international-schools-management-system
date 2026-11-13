import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { createAuthApp, createCorsMiddleware } from './auth.js';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(createCorsMiddleware());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'school-results-portal-api' });
});

app.get('/api', (_req, res) => {
  res.json({ message: 'API ready for authentication v1.' });
});

app.use(createAuthApp());

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
