# Applying the production-readiness changes

Repo: `raelTheHermit/cedarmodel-international-schools-management-system`
Layout assumed: `client/` (Vite + React), `server/` (Express + Postgres), `.env` in the repo root (the server loads `../.env`).

I could not open your repo, run a database, or install dependencies while writing this. Every step below ends with a check so you find problems immediately rather than in production. **Do all of this on a branch and a copy of your database first.**

---

## 0. Before you touch anything

```bash
git checkout -b production-ready
pg_dump "$DATABASE_URL" > backup-before-changes.sql     # keep this file safe
```

If you have never rotated them: the old `client/src/App.tsx` shipped plaintext passwords (`VicePrincipal123!`, `SchoolAdmin123!`, `Developer123!`) and they are in your git history. Treat them as public. Step 8 covers rotating them.

---

## 1. Replace the migration runner and baseline the database  (ORDER MATTERS)

The old runner re-ran every migration on every deploy and kept no record. The new one records what ran.

1. Copy `server/scripts/run-migrations.js` over your existing file.
2. **Do not copy the three new migration files yet.** Your `server/migrations/` must contain only your original files.
3. If your database was already migrated by the old runner, record those files as applied without re-running them:

   ```bash
   cd server
   npm run migrate:baseline
   ```
   (Skip this on a brand-new empty database.)

   If you copy the new migration files first, the baseline marks them as "applied" without running them and your tables never get created.

Check: `psql "$DATABASE_URL" -c "select * from schema_migrations;"` lists your original files.

---

## 2. Copy the files

Unzip `cedarmodel-changes.zip` at the **repo root**. It already has the right folders. Everything below is either new (N) or a full replacement (R).

### server/

| File | | Notes |
|---|---|---|
| `package.json` | R | Adds `exceljs`; pins `@types/express` to v4; adds `migrate:baseline`. If you have extra dependencies of your own, merge instead of overwriting. |
| `vitest.config.ts` | N | Gives tests a throwaway `SESSION_SECRET`. |
| `scripts/run-migrations.js` | R | Done in step 1. |
| `migrations/20261114_students_and_codes.sql` | N | |
| `migrations/20261115_results_terms_settings.sql` | N | |
| `migrations/20261116_staff_attendance.sql` | N | |
| `src/index.ts` | R | Mounts all routers; fails at boot without `SESSION_SECRET`. |
| `src/auth.ts` | R | Signed sessions, revocable staff sessions, timing-safe logins. |
| `src/session.ts` | N | Signed, expiring session tokens + async error wrapper. |
| `src/db.ts` | N | Shared Postgres pool and transaction helper. |
| `src/student-management.ts` | R | Secure code generator, Excel phone fix, exported helpers. |
| `src/students.ts` | N | Students, CSV/Excel import, access codes. |
| `src/results.ts` | N | Results upload, review, publish. |
| `src/results-csv.ts` | N | Result sheet parser. |
| `src/grading.ts` | N | Grades, averages, class position. |
| `src/table-input.ts` | N | CSV or `.xlsx` upload handling. |
| `src/term-data.ts` | N | Current term + register totals. |
| `src/attendance.ts` | N | Daily class register. |
| `src/staff.ts` | N | Staff accounts. |
| `src/admin-extras.ts` | N | Overview, audit log, terms, school details, classes, promotion. |
| `src/parent.ts` | N | The parent's own published report. |
| `src/*.test.ts` (3 files) | N | Grading, results parser, session tests. |

### client/src/

| File | | Notes |
|---|---|---|
| `App.tsx` | R | Guarded routes; mock pages and seeded passwords removed. |
| `api.ts` | R | All endpoints. |
| `portal/shells.tsx` | R | Role-aware nav, real signed-in user, working search, no dead bell. |
| `portal/staff-context.ts` | N | |
| `portal/admin-live.tsx` | N | Students, import, access codes, route guard. |
| `portal/admin-results.tsx` | N | Overview, results, audit log, promotion. |
| `portal/admin-setup.tsx` | N | School Setup (staff accounts) and the attendance register. |
| `portal/parent-live.tsx` | N | Parent dashboard and report card from real data. |
| `portal/data.ts` | R | Now only small helpers; all sample data is gone. |

---

## 3. Delete the old mock files

```bash
git rm client/src/portal/admin.tsx client/src/portal/parent.tsx
```

They contain the old mock pages and import sample data that no longer exists, so they will not compile if left.

Then one small edit in a file I never had on disk, so it can't be shipped for you. The sign-in pages still say "Miracle Schools":

```bash
sed -i 's/Miracle Schools/Cedar Model Schools/g' client/src/portal/auth.tsx
```
(Change the replacement text if the school's real name is different. The parent portal itself now shows whatever name you save in School Setup.)

---

## 4. Environment variables

Add to the root `.env` and to your hosting dashboard (Vercel/Render):

```bash
# generate: openssl rand -base64 48   (must be 32+ characters)
SESSION_SECRET=...
```

Also confirm these already exist in production:
- `DATABASE_URL` (or the `DB_HOST`/`DB_USER`/`DB_NAME`/`DB_PASSWORD` set), `DB_SSL=true` on Render
- `CLIENT_ORIGIN` = your deployed front-end URL exactly (the server's CORS only allows this origin)
- `NODE_ENV=production`
- Optional: `DB_POOL_MAX` (default 5; keep it small on serverless)

Client: `VITE_API_BASE_URL` if the API is on a different domain (default is `/api`).

Check: the server refuses to start if `SESSION_SECRET` is missing. That's intended.

---

## 5. Install and build

```bash
cd server && npm install && npx tsc --noEmit && npm test
cd ../client && npm install && npx tsc -b
```

**Expect to fix a few type errors the first time.** I could only syntax-check these files, not compile them against your real dependency types. They'll be small (import paths, a type annotation). If a message is unclear, paste it back to me.

Client note: nothing imports the `xlsx` package any more. After the client builds, you can remove it: `npm uninstall xlsx` (it's an unmaintained version with known vulnerabilities). If the build complains something still imports it, leave it for now and tell me which file.

---

## 6. Run the new migrations

Now copy in the three migration files (if you haven't already) and run:

```bash
cd server
npm run migrate
```

Likely snags:
- `uq_terms_one_current` fails if more than one term is currently marked `is_current`. Fix with `UPDATE terms SET is_current = false WHERE id <> (SELECT max(id) FROM terms WHERE is_current);` then re-run.
- `uq_result_batches_class_term` fails if a class has two batches for the same term. Delete the older duplicates, then re-run.
- A failed migration rolls back completely, so it's safe to fix and re-run.

Check: `select * from schema_migrations;` now lists the three new files.

---

## 7. Start it and set up the school

```bash
cd server && npm run dev        # API on :4000
cd client && npm run dev        # app on :5173  (check vite proxies /api, or set VITE_API_BASE_URL)
```

Log in as an administrator, then open **School Setup** and do these in order. Nothing downstream works without them:

1. **School details**: name, contact email and phone (shown to parents).
2. **Classes**: create every class (students can't be added to a class that doesn't exist).
3. **Academic terms**: add the current term, tick "make current", set the next-term date.
4. **Staff accounts**: create each teacher and tick the classes they teach. A teacher with no classes ticked sees nothing.
5. Then **Student Management → Import register** (CSV or `.xlsx`: First name, Last name, Admission number, Class, Parent phone number), and **Access Codes → Generate class codes**. Codes are shown once; download the CSV before leaving the page.

---

## 8. Rotate anything that was ever public

- **Seeded staff accounts:** log in with each, then School Setup → Staff accounts → **Reset password** (the old password stops working immediately), or deactivate the ones you don't need (`viceprincipal@…`, `administrator@…`, `developer@…`, `*.local`).
- **Demo parent accounts** (`ADM-0001` / `CODE1234`, `ADM-0002` / `CODE2345`, `ADM-0003` / `CODE3456`, from `server/scripts/seed.js`): make sure they don't exist in production data. If they do, deactivate those students or regenerate their codes.
- **Seed script:** if `server/scripts/seed.js` creates these, don't run it against production again.

---

## 9. Smoke test before you go live

| Test | Expected |
|---|---|
| `curl -i -H 'Cookie: school_portal_session=%7B%22kind%22%3A%22staff%22%2C%22id%22%3A1%2C%22email%22%3A%22x%22%2C%22role%22%3A%22superadmin%22%7D' https://YOUR-API/api/admin/students` | **403**. A forged cookie is rejected. This is the most important check. |
| Open `/admin-overview` while logged out | Redirected to the admin login |
| Log in as a teacher | Lands on Student Management; sees only their classes; no Add/Edit buttons; menu has no admin pages |
| Teacher opens `/school-setup` or `/access-codes` by URL | Sent back to Student Management |
| Add a student, then Edit and Deactivate them | Works; the audit log shows each action |
| Import a CSV with a duplicate admission number and an unknown class | Both skipped and reported in the preview |
| Generate a code, log in as that parent, regenerate, try the old code | Old code rejected |
| Parent logs in **before** results are published | "Awaiting publication"; no scores anywhere |
| Teacher uploads a result sheet with a score of 25 in CA1 | Rejected with the row number; nothing saved |
| Upload a valid sheet, Approve and publish, then parent logs in | Sees only their child's results, with class position |
| Parent A logged in; try to read another child's report | Impossible: there is no id in the URL; the server uses the session |
| Take attendance (teacher), then open the parent report | Attendance block shows register totals |
| Deactivate a signed-in teacher in another browser | Their next click fails immediately (not after 8 hours) |
| Try to deactivate or demote the last active administrator | Refused |

---

## 10. Ship it

```bash
git add -A
git commit -m "Connect all features to the API; signed sessions; results, attendance, staff management"
git push -u origin production-ready
# open a pull request, review the diff, deploy a preview, run section 9, then merge
```

Deploy order: **migrations first, then server, then client.** Run `npm run migrate` against the production database (after a fresh `pg_dump`) before the new server code goes live, because the new server expects the new tables.

Rollback: redeploy the previous commit. The migrations are additive (new tables, columns and indexes), so the old code keeps working against the new schema. Restore `backup-before-changes.sql` only if you need to undo data changes.

---

## Known limits (be aware, none block launch)

- Excel import supports `.xlsx` only (not old `.xls`); result sheets must be one row per student per subject.
- Parent and staff sessions last 8 hours. Staff are revoked instantly on deactivate/demote/password reset; a parent whose code you regenerate stays signed in until their session expires (their child's data is still re-checked on every request).
- The login lockout counts failures per account and per IP. A whole school behind one network could lock itself out with repeated typos; the lock lasts 15 minutes.
- Result position uses the class average; students with different subject counts are compared fairly, but you may want a different rule.
- `login_attempts` grows forever. Add a scheduled `DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '30 days'`.
- Backups, uptime monitoring and error alerting (e.g. Sentry) are outside this code and still need setting up on your host.
