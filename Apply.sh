#!/usr/bin/env bash
# Applies the production-readiness changes to the Cedar Model repository.
#
# Usage (from the folder you unzipped cedarmodel-changes.zip into):
#   bash apply.sh /path/to/cedarmodel-international-schools-management-system
#
# Options:
#   --skip-install   don't run npm install
#   --skip-db        don't touch the database (no backup, baseline or migrate)
#   -h, --help
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO=""
SKIP_INSTALL=0
SKIP_DB=0

for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=1 ;;
    --skip-db) SKIP_DB=1 ;;
    -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) REPO="$arg" ;;
  esac
done

if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; N=$'\e[0m'; else B=""; G=""; Y=""; R=""; N=""; fi
step() { printf '\n%s==> %s%s\n' "$B" "$1" "$N"; }
ok()   { printf '  %s✓%s %s\n' "$G" "$N" "$1"; }
warn() { printf '  %s!%s %s\n' "$Y" "$N" "$1"; }
die()  { printf '\n%sStopped:%s %s\n' "$R" "$N" "$1" >&2; exit 1; }

ask() { # ask "question" default(y|n)
  local prompt="$1" default="$2" reply
  if [ ! -t 0 ]; then [ "$default" = "y" ]; return; fi
  read -r -p "  $prompt [$([ "$default" = y ] && echo Y/n || echo y/N)] " reply || true
  reply="${reply:-$default}"
  [[ "$reply" =~ ^[Yy] ]]
}

NEW_MIGRATIONS=(20261114_students_and_codes.sql 20261115_results_terms_settings.sql 20261116_staff_attendance.sql)

# ---------------------------------------------------------------- 1. checks
step "Checking your machine"

[ -n "$REPO" ] || die "Give the path to your repo:  bash apply.sh /path/to/cedarmodel-international-schools-management-system"
[ -d "$REPO/.git" ] || die "$REPO is not a git repository."
[ -d "$REPO/client" ] && [ -d "$REPO/server" ] || die "$REPO has no client/ and server/ folders. Is this the right repo?"
[ -f "$HERE/server/src/index.ts" ] || die "Run this from the folder where you unzipped cedarmodel-changes.zip (server/ and client/ must sit next to apply.sh)."
REPO="$(cd "$REPO" && pwd)"

missing=()
for cmd in git node npm openssl; do command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd"); done
if [ "${#missing[@]}" -gt 0 ]; then
  die "Missing: ${missing[*]}. Install with:  sudo apt update && sudo apt install -y git nodejs npm openssl postgresql-client"
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "Node $(node -v) is too old (need 18+). Install a newer one, e.g. via nvm: https://github.com/nvm-sh/nvm"
ok "git, node $(node -v), npm, openssl found"

cd "$REPO"
if [ -n "$(git status --porcelain)" ]; then
  die "You have uncommitted changes. Commit or stash them first (git stash -u), then run this again, so nothing of yours gets mixed in."
fi
ok "Working tree is clean"

# ---------------------------------------------------------------- 2. branch
step "Creating a branch"
BRANCH="production-ready"
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then BRANCH="production-ready-$(date +%Y%m%d-%H%M%S)"; fi
git checkout -b "$BRANCH" >/dev/null 2>&1
ok "On new branch $BRANCH (your original branch is untouched)"

# ---------------------------------------------------------------- 3. db backup
env_value() { # env_value KEY  (reads the repo-root .env without executing it)
  [ -f "$REPO/.env" ] || return 0
  grep -E "^$1=" "$REPO/.env" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true
}

DB_URL="$(env_value DATABASE_URL)"
if [ "$SKIP_DB" -eq 0 ]; then
  step "Backing up the database"
  if [ -z "$DB_URL" ]; then
    warn "No DATABASE_URL in $REPO/.env, so I can't back up or migrate automatically."
    warn "If you use DB_HOST/DB_USER style settings, back up with pg_dump yourself, then continue."
    ask "Continue without a database backup?" n || die "Back up your database first, then run this again."
    SKIP_DB=1
  elif ! command -v pg_dump >/dev/null 2>&1; then
    warn "pg_dump is not installed (sudo apt install -y postgresql-client)."
    ask "Continue WITHOUT a backup?" n || die "Install postgresql-client and run this again."
  else
    BACKUP="$HOME/cedarmodel-backup-$(date +%Y%m%d-%H%M%S).sql"
    if pg_dump "$DB_URL" > "$BACKUP" 2>/dev/null; then
      ok "Backup saved to $BACKUP"
    else
      rm -f "$BACKUP"
      warn "pg_dump failed (wrong URL, no network, or version mismatch)."
      ask "Continue WITHOUT a backup?" n || die "Fix the database connection and run this again."
    fi
  fi
fi

# ---------------------------------------------------------------- 4. copy files
step "Copying files into place"
COUNT=0
while IFS= read -r file; do
  case "$file" in
    server/package.json) continue ;;                                  # merged below
    server/migrations/*) base="$(basename "$file")"
                         for m in "${NEW_MIGRATIONS[@]}"; do [ "$base" = "$m" ] && continue 2; done ;;  # copied after baselining
  esac
  mkdir -p "$REPO/$(dirname "$file")"
  cp "$HERE/$file" "$REPO/$file"
  COUNT=$((COUNT + 1))
done < <(cd "$HERE" && find client server -type f | sort)
ok "$COUNT files copied (migrations and package.json are handled separately)"

# ---------------------------------------------------------------- 5. package.json merge
step "Updating server/package.json (merging, not overwriting)"
SERVER_PKG="$REPO/server/package.json" node -e '
  const fs = require("fs");
  const path = process.env.SERVER_PKG;
  const pkg = JSON.parse(fs.readFileSync(path, "utf8"));
  pkg.dependencies = Object.assign({ exceljs: "^4.4.0" }, pkg.dependencies);
  pkg.devDependencies = pkg.devDependencies || {};
  pkg.devDependencies["@types/express"] = "^4.17.21";
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["migrate:baseline"] = "node ./scripts/run-migrations.js --baseline";
  pkg.scripts.migrate = pkg.scripts.migrate || "node ./scripts/run-migrations.js";
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
'
ok "Added exceljs, pinned @types/express to v4, added migrate:baseline"

# ---------------------------------------------------------------- 6. remove old mock files
step "Removing the old mock pages"
for f in client/src/portal/admin.tsx client/src/portal/parent.tsx; do
  if [ -f "$f" ]; then git rm -q -f "$f" && ok "Deleted $f"; else warn "$f already gone"; fi
done

AUTH_TSX="client/src/portal/auth.tsx"
if [ -f "$AUTH_TSX" ] && grep -q "Miracle Schools" "$AUTH_TSX"; then
  sed -i 's/Miracle Schools/Cedar Model Schools/g' "$AUTH_TSX"
  ok "Renamed 'Miracle Schools' to 'Cedar Model Schools' in auth.tsx (change it if the real name differs)"
fi

# ---------------------------------------------------------------- 7. SESSION_SECRET
step "Session secret"
touch "$REPO/.env"
if [ -n "$(env_value SESSION_SECRET)" ]; then
  ok "SESSION_SECRET already set in .env"
else
  printf '\nSESSION_SECRET=%s\n' "$(openssl rand -base64 48 | tr -d '\n')" >> "$REPO/.env"
  ok "Generated a SESSION_SECRET and added it to .env"
  warn "Add the SAME variable to your hosting dashboard (Vercel/Render). Use a different value for production if you prefer."
fi
if ! git check-ignore -q .env; then
  warn ".env is NOT in .gitignore. Add it now, or your secrets will be committed:  echo .env >> .gitignore"
fi

# ---------------------------------------------------------------- 8. install
if [ "$SKIP_INSTALL" -eq 0 ]; then
  step "Installing dependencies (this can take a few minutes)"
  (cd server && npm install --no-fund --no-audit) && ok "server dependencies installed"
  (cd client && npm install --no-fund --no-audit) && ok "client dependencies installed"
else
  warn "Skipped npm install (run it in server/ and client/ yourself)"
fi

# ---------------------------------------------------------------- 9. migrations (order matters)
step "Database migrations"
ALREADY_HAS_NEW=0
for m in "${NEW_MIGRATIONS[@]}"; do [ -f "$REPO/server/migrations/$m" ] && ALREADY_HAS_NEW=1; done

if [ "$SKIP_DB" -eq 1 ] || [ "$SKIP_INSTALL" -eq 1 ]; then
  warn "Not touching the database. Copying the new migration files only."
  mkdir -p "$REPO/server/migrations"
  for m in "${NEW_MIGRATIONS[@]}"; do cp "$HERE/server/migrations/$m" "$REPO/server/migrations/$m"; done
  warn "Later, run in server/:  npm run migrate:baseline   (only if your DB was migrated by the old runner, BEFORE the new files existed)"
  warn "then:  npm run migrate"
else
  if [ "$ALREADY_HAS_NEW" -eq 0 ]; then
    echo "  The old runner re-ran every migration each time and kept no record."
    echo "  If this database was already set up with it, its existing migrations must be recorded as applied first."
    if ask "Has this database ALREADY been migrated with the old runner?" n; then
      (cd server && npm run --silent migrate:baseline) && ok "Existing migrations recorded as applied (not re-run)"
    else
      ok "Treating this as a fresh database (all migrations will run)"
    fi
  else
    warn "New migration files were already in the repo (this looks like a re-run), so skipping the baseline step."
  fi

  mkdir -p "$REPO/server/migrations"
  for m in "${NEW_MIGRATIONS[@]}"; do cp "$HERE/server/migrations/$m" "$REPO/server/migrations/$m"; done
  ok "Copied the 3 new migration files"

  if ask "Run the migrations now?" y; then
    (cd server && npm run --silent migrate) && ok "Migrations applied" \
      || die "A migration failed (it rolled back cleanly). See APPLY_CHANGES.md section 6 for the usual causes, fix, then run:  cd server && npm run migrate"
  else
    warn "Skipped. Run later:  cd server && npm run migrate"
  fi
fi

# ---------------------------------------------------------------- 10. verify
if [ "$SKIP_INSTALL" -eq 0 ]; then
  step "Checking that everything compiles and the tests pass"
  set +e
  (cd server && npx tsc --noEmit);  S_TSC=$?
  (cd server && npm test --silent); S_TEST=$?
  (cd client && npx tsc -b);        C_TSC=$?
  set -e
  [ $S_TSC -eq 0 ]  && ok "server type-check passed"      || warn "server type-check reported errors (details above)"
  [ $S_TEST -eq 0 ] && ok "server tests passed"           || warn "server tests failed (details above)"
  [ $C_TSC -eq 0 ]  && ok "client type-check passed"      || warn "client type-check reported errors (details above)"
  if [ $((S_TSC + S_TEST + C_TSC)) -ne 0 ]; then
    warn "I could only syntax-check these files when writing them, so a few small type errors are expected."
    warn "Copy the first error message to Claude and it can be fixed in one go."
  fi
fi

# ---------------------------------------------------------------- done
step "Done"
cat <<EOF
  Your changes are on branch: $BRANCH   (nothing is committed yet; review with: git status)

  Next:
    1. Start the app:     cd server && npm run dev      (new terminal)  cd client && npm run dev
    2. Log in as an administrator, open School Setup, and add: school details, classes,
       the current term, and your teachers.
    3. Replace the old public seed passwords (see APPLY_CHANGES.md section 8).
    4. Run the smoke tests in APPLY_CHANGES.md section 9, especially the forged-cookie check.
    5. When happy:        git add -A && git commit -m "Connect all features to the API" && git push -u origin $BRANCH

  If something looks wrong, undo everything with:  git checkout - && git branch -D $BRANCH
EOF