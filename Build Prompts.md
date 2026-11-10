# Copilot build prompts (run in order, one per chat message)

## Before you start
- Put `copilot-instructions.md` at `.github/copilot-instructions.md` in the repo so Copilot reads it every session.
- Use VS Code, Copilot Chat, Agent mode, with the repo folder open.
- GitHub → Settings → Copilot → Privacy → turn OFF "Allow GitHub to use my data for AI model training".
- NEVER attach the children's PDFs. Attach report-card photos only after hiding every name, ID number and score, or use a blank sample card.
- Copilot Free has a small monthly chat allowance (about 50 messages), so send one prompt per message, review the diff, commit, then move on. Paste an error back only when you must.
- If you choose Laravel instead of Express, edit the "Hard constraints" section of the instructions file before Prompt 1.

---

## Prompt 1: Scaffold
Read .github/copilot-instructions.md in full. Scaffold the monorepo exactly as described: /client (Vite + React + TypeScript + React Router), /server (Express + TypeScript, mysql2, zod, helmet, bcryptjs), /docs. Add: .env.example, npm scripts (dev, build, start) for both, a plain-SQL migrations folder with a migrate script, and the full schema for the suggested tables. Add a seed script with FAKE data only (one term, 11 placeholder classes, 40 fake students, 1 administrator and 1 principal). Add client/public/.htaccess for SPA routing. Add server/src/config/features.ts, the only place feature flags are read from environment variables (FEATURE_TEACHER_ACCOUNTS, FEATURE_STUDENT_PHOTOS, FEATURE_LGA_FIELD, FEATURE_EXPORT_REQUESTS), all defaulting to false, and list them in .env.example. Do not build any feature screens yet. When done, list the files you created and anything you were unsure about.

## Prompt 2: Authentication
Implement authentication. (1) Staff login with email + password (bcryptjs), roles superadmin and teacher (teacher login only works when FEATURE_TEACHER_ACCOUNTS is on), session in an httpOnly, secure, sameSite=strict cookie. (2) Parent login with admission number + access code, compared against the stored hash. (3) Database-backed rate limiting and lockout using login_attempts (per admission number and per IP) with one generic error message. (4) Middleware: requireStaff, requireRole, requireParent. (5) Tests: wrong code, locked-out account, parent routes blocked for staff and the reverse. Build only two simple login pages for the UI.

## Prompt 3: Students and access codes
Build student management (admin only): import from the school's student register (Excel/CSV) following the "Student import rules" in the instructions file. The register's columns are: First name, Last name, Admission number, Class, Date of birth, Parent/Guardian name, Parent/Guardian address, Parent phone number, Religion, Sex. Import ONLY first name, last name, admission number, class and parent phone; ignore every other column and delete the uploaded file after parsing. Create a FAKE sample register with exactly these columns in /docs/sample-register.csv for tests. Validate with a preview step that shows only the stored fields, then add/edit/deactivate and assign class. Build access-code generation: 8-character codes from an alphabet without look-alike characters, hashed before storage, shown once; regenerating invalidates the old code. Add a per-class CSV export (admission number, name, parent phone, code) and a copy-ready message template for the school to send itself. Include tests for import validation and code regeneration. Use a desktop-friendly table UI.

## Prompt 4: Layouts and parent results page (attach redacted report-card photos)
I'm attaching redacted photos of the school's paper report cards: one primary, one secondary. Treat them as layout references only. For each, identify the sections and columns (header info, subjects, score columns such as test/exam/total, grade, position, attendance, teacher's comment, principal's comment, anything else) and write them as two JSON layout configs in /server/layouts (primary.json, secondary.json), plus a short /docs/layouts.md describing each, with anything you are unsure about marked clearly. Then build the parent results page: after login, show the child's published results for the current term, rendered from the layout config, mobile first, view only. Use fake seed data.

## Prompt 5: Results upload
Build the results upload pipeline. An admin picks class, term and layout (primary or secondary), downloads an Excel template generated server-side from the layout config (use exceljs), uploads the filled file, and sees a preview with row-level errors (unknown admission number, non-numeric scores, duplicate rows, missing columns). Valid rows save as a draft batch. Process everything inside the request, 5 MB max. Store results exactly as uploaded and calculate nothing. Tests: bad rows are rejected with clear messages, and unknown students are never saved.

## Prompt 6: Approval, corrections, audit log
Add the review and approval workflow. Draft batches appear in a review screen where a principal or administrator can open, check and approve a batch, which changes it to published. Parents only ever see published batches. Let administrators edit individual results after upload, and write every edit to the audit log (who, when, old value, new value) with a simple audit viewer for the administrator. Tests: parents cannot see drafts; edits are logged.

## Prompt 7: Hardening and shared-hosting build
Prepare for shared hosting. Produce a production build for the client (dist/) and the server (compiled JS with a single entry file that works with cPanel's Node.js app setup and Hostinger's Node.js web apps), confirm .htaccess SPA routing works, and write a README "Deploy" section with step-by-step instructions for both hosts plus the environment variable list. Then review the entire codebase against the Security rules in copilot-instructions.md and fix any violations. Add a test that a parent cannot see another child's results or any draft batch. List anything not done.

---

## Prompts 8-10: Phase 2 features (built now, shipped OFF)
Run these only after Prompt 7 works on the real host. Every feature stays behind its FEATURE_* flag (default false). After each one, re-run all authorization tests.

### Prompt 8: Teacher accounts and account management
Implement FEATURE_TEACHER_ACCOUNTS exactly as described under "Phase 2 features" in the instructions file. Add teacher login, class assignment, class-scoped upload and view, a teacher dashboard, and superadmin screens to add teacher and parent accounts singly or in batch (Excel/CSV with preview and row errors), reset or reassign teacher logins, and regenerate parent access codes. Log every account action in the audit log. When the flag is off, none of it is reachable. Tests: a teacher cannot see or upload for another class; flag off returns 403 or 404; batch import errors are reported per row.

### Prompt 9: Student photos and LGA field
Implement FEATURE_STUDENT_PHOTOS and FEATURE_LGA_FIELD exactly as described in the instructions file. Photos: single and bulk-ZIP upload by admission number, resize and EXIF-strip, store outside the public web root, serve only through an authenticated route to staff and the student's own parent, show on the report-card layout. LGA: new student field, included in the import template and layouts. Tests: a parent cannot fetch another child's photo; both flags off hides everything.

### Prompt 10: Export requests and export logging
Implement FEATURE_EXPORT_REQUESTS exactly as described in the instructions file: teacher request from the dashboard, superadmin approve or deny screen, single-use expiring exports. Also make every superadmin export write to the audit log regardless of the flag. Tests: teachers cannot export without an approved request; an approved export works only once; every export is logged.

---

## After each prompt
1. Run it. Test the feature by hand with the fake data.
2. Read the diff for anything touching login, access codes or permissions. Don't merge those blind.
3. Commit before starting the next prompt.