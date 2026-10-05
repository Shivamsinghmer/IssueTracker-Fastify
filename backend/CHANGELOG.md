# Changelog — Backend rebuild

Date: 2026-10-05

The existing starter code was audited, fixed, cleaned up, and completed into a
full working backend for the Developer Project & Issue Tracker
(FastAPI + SQLAlchemy 2.x + Pydantic v2 + Neon Postgres).

## Commands run

| # | Command | Purpose / result |
|---|---------|------------------|
| 1 | `git log --oneline -10; git status` | Confirmed repo has no commits yet; all files untracked |
| 2 | `cat .python-version; uv --version; uv run python --version; uv pip list …` | Confirmed Python 3.11, Pydantic v2.13, SQLAlchemy 2.1, FastAPI 0.142; found wrong `dotenv 0.9.9` package; `passlib`/`python-jose` missing |
| 3 | `uv run python -c "import secrets; print(secrets.token_urlsafe(48))"` | Generated `SECRET_KEY` and added it to `.env`. Side effect: synced the 11 new packages from the edited `pyproject.toml` |
| 4 | `Remove-Item models\users.py, models\orgs.py, models\comments.py` | Deleted old broken model files (renamed to singular) |
| 5 | `uv sync` | Uninstalled the wrong `dotenv==0.9.9` package |
| 6 | `uv run ruff check .` / `ruff format --check .` | Found B008 (FastAPI `Depends` false positives), UP017 (`datetime.UTC`), BLE001 (blind `except Exception`) + formatting diffs |
| 7 | `uv run ruff format .` | Auto-formatted 10 files; `ruff check` clean after |
| 8 | `uv run python smoke_test.py` (1st run) | **Failed** — exposed the `passlib 1.7.4 + bcrypt>=4.1` incompatibility (`__about__` removed, 72-byte `ValueError`) |
| 9 | `uv sync` | Uninstalled `passlib==1.7.4` after replacing it with direct `bcrypt` usage |
| 10 | `uv run python smoke_test.py` (2nd run) | **All 46 checks passed** (temp SQLite DB) |
| 11 | DB check vs Neon (1st try) | **Failed** — `No module named 'psycopg'` (SQLAlchemy 2.x defaults to the psycopg-v3 driver) |
| 12 | DB check vs Neon (2nd try) | **Success** — `tables: ['comments', 'memberships', 'orgs', 'tasks', 'users']`, `SELECT 1 → 1` |
| 13 | Final `ruff check` + `ruff format --check` + smoke test | All clean, all tests passed again |
| 14 | `Remove-Item smoke_test.py, smoke.db` | Deleted temporary test artifacts |

## Files created (19)

- `models/__init__.py` — re-exports all models
- `models/user.py` — `User` (split ownership `owned_orgs` vs membership `orgs`)
- `models/org.py` — `Org` (owner + members, no relationship conflict)
- `models/task.py` — `Task` (added missing `comments` rel + cascade delete, nullable assignee, timestamp defaults)
- `models/comment.py` — `Comment`
- `models/membership.py` — the previously **missing** `memberships` association table
- `schema/__init__.py`, `schema/auth.py` (rewritten), `schema/org.py`, `schema/task.py`, `schema/comment.py` — Pydantic v2 schemas (`ConfigDict(from_attributes=True)`, enums, validators)
- `routers/__init__.py`, `routers/auth.py` (rewritten: `POST /register`, `POST /login` → JWT, `GET /me`), `routers/users.py` (was empty → profile CRUD), `routers/orgs.py`, `routers/tasks.py`, `routers/comments.py`
- `utils/__init__.py`, `utils/auth.py` (bcrypt + JWT), `utils/deps.py` (`get_current_user`, `get_user_org`, `require_org_owner`, `get_org_task`)
- `README.md` (was empty → setup guide, structure, full endpoint table)

## Files modified / deleted

- **Modified:** `pyproject.toml` (fixed `dotenv`→`python-dotenv`, added `bcrypt`, `python-jose`, `email-validator`, dev group `httpx`+`ruff`, ruff config), `.gitignore` (added `.env`, `.env.*`, `.ruff_cache/`), `.env` (added `SECRET_KEY`), `database.py`, `main.py`
- **Deleted:** `models/users.py`, `models/orgs.py`, `models/comments.py` (superseded by singular names), temp `smoke_test.py` + `smoke.db`
- **Untouched:** folder names, `.env`'s `DATABASE_URL`, `uv.lock` (auto-managed by uv). Nothing committed to git.

## Bugs fixed (old → new)

1. `main.py` used `auth` without importing it → all routers imported + wired with prefixes
2. `routers/auth.py` imported nonexistent `backend.*` package → consistent top-level imports
3. Called undefined `verify_password()` → implemented in `utils/auth.py`
4. `GET /login` with credentials in URL → `POST /login` with JSON body returning a JWT `Token`
5. `class Config` floating at module level + v1 `orm_mode` → `model_config = ConfigDict(from_attributes=True)`
6. `secondary="org_users"` table didn't exist → real `memberships` table created
7. `Org.owner` ↔ `User.orgs` back_populates collision → `owned_orgs`/`owner` + `orgs`/`members` pairs
8. `Task` missing `comments` relationship → added with `delete-orphan` cascade
9. Non-nullable timestamps with no defaults → `server_default=func.now()` + `onupdate`
10. Invalid CORS (`allow_credentials=True` + `"*"`) → `allow_credentials=False`
11. `create_tables()` never called → lifespan startup hook
12. `.env` not git-ignored (Neon credentials would leak) → ignored; `SECRET_KEY` added

## Verification results

- `ruff check` — **all checks passed**; `ruff format` — clean
- Smoke test — **46/46 PASS**, covering: register/login, duplicate rejection, bad credentials (401), missing/bad token (401), org create/list/join (right + wrong invite code), owner-only guards (403), task CRUD + status filter + assignee validation, comment CRUD + author-only edit (403), profile edit guards, owner-leave blocked (400), full teardown
- Live Neon Postgres — connected, 5 tables created (only empty tables; all test data lived in the throwaway SQLite file, which was deleted)

## Full endpoint audit (2026-10-05, against live Neon Postgres)

Two delete paths would have failed on Postgres with foreign-key violations
(SQLite doesn't enforce FKs, so the earlier SQLite run couldn't catch these).
Fixed before the audit:

- `DELETE /orgs/{id}` — now deletes the org's tasks first (comments cascade
  via the ORM relationship), clears memberships, then deletes the org.
- `DELETE /users/{id}` — now returns 400 if the user still owns orgs;
  otherwise leaves all orgs, unassigns their tasks (`assignee_id → NULL`),
  deletes their comments, then deletes the user.

A temporary audit script exercised **all 23 endpoints** plus validation and
permission edge cases using 3 users (owner / member / outsider) with
timestamped names, then removed everything it created (API deletes +
direct-SQL finally-cleanup; all 5 tables verified empty afterwards).

**Result: 113 passed, 0 failed**, covering: root + OpenAPI route check,
register (bad/short/long/missing fields → 422, duplicates → 400),
login (wrong/unknown → 401, missing field → 422), `/me` (valid/missing/
garbage/expired token), user read/update/delete incl. password change and
owned-org guard, org CRUD + join (wrong code → 403, idempotent re-join) +
leave (owner blocked → 400), task CRUD + status filter + assignee
membership validation (400/404), comment CRUD (author-only edit, owner-can-
delete), cascade checks (org delete removes its tasks; user delete unassigns
their tasks), and no `hashed_password` leakage in any response.

## How to run

```powershell
uv sync
uv run uvicorn main:app --reload
```

Interactive docs: http://127.0.0.1:8000/docs
