# Issue Tracker — Backend

Backend API for the **Developer Project & Issue Tracker**: a multi-org task
tracking system where users register, form organizations, invite members with
an invite code, track tasks inside orgs, and discuss them through comments.

## Features

- **JWT authentication** — register, login, and bearer-token protected routes
  (bcrypt password hashing, 60-minute token expiry)
- **Organizations** — create orgs, invite members via auto-generated invite
  codes, owner vs. member permission model
- **Tasks** — full CRUD scoped to orgs, with status (`todo / in_progress /
  done`), priority (`low / medium / high`), due dates, assignees, and image
  URLs
- **Comments** — threaded discussion per task with author-only editing
- **Guarded deletes** — deleting an org cascades its tasks/comments;
  deleting a user unassigns their tasks and requires owning no orgs

## Tech stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| API        | FastAPI                                                       |
| ORM        | SQLAlchemy 2.x                                                |
| Validation | Pydantic v2                                                   |
| Auth       | `bcrypt` (hashing) + `python-jose` (JWT, HS256)               |
| Database   | PostgreSQL (e.g. Neon) via `psycopg2`; tables auto-created on startup |
| Tooling    | `uv` for packaging, `ruff` for lint + format                  |

Requires **Python ≥ 3.11** and [uv](https://docs.astral.sh/uv/).

## How it works

1. A user **registers** (`POST /auth/register`) and **logs in**
   (`POST /auth/login`) to receive a JWT bearer token.
2. The token is sent as `Authorization: Bearer <token>` on every other
   request; `GET /auth/me` returns the current profile.
3. The user **creates an org** (`POST /orgs`) and becomes its **owner**
   (owners are also members). Each org gets a unique **invite code**.
4. Other users **join** (`POST /orgs/{id}/join`) by supplying the invite
   code and become **members**.
5. Members **create and manage tasks** inside the org
   (`/orgs/{id}/tasks`, `/tasks/{id}`); tasks can be assigned only to org
   members.
6. Members **discuss tasks** via comments (`/tasks/{id}/comments`).

### Permission rules

| Action | Who can do it |
| ------ | ------------- |
| View org / tasks / comments | Org owner or member |
| Edit or delete org | Owner only |
| Join org | Anyone with the invite code |
| Leave org | Any member except the owner |
| Create / edit / delete tasks | Any org member |
| Assign a task | Only to org members (or unassigned) |
| Edit a comment | Its author only |
| Delete a comment | Its author or the org owner |
| Edit / delete a user | That user only (and only with no owned orgs for delete) |

## Data model

```text
users ──< owned_orgs >── orgs ──< tasks >── comments
  │  \                      │         │
  │   \ memberships         │         └── image_urls, status, priority, due_date
  │    \ (user_id, org_id,  │
  │     joined_at)          └── members (via memberships), invite_code, owner
  └── tasks (as assignee) · comments (as author)
```

Tables: `users`, `orgs`, `memberships`, `tasks`, `comments`.
`created_at` / `updated_at` are maintained automatically on every table.

## Project structure

```text
backend/
├── main.py            # App factory, router wiring, startup hook (create_tables), GET /
├── database.py        # Engine, session factory, Base, get_db dependency
├── models/            # SQLAlchemy models
│   ├── user.py        # User + owned_orgs / orgs / tasks / comments relationships
│   ├── org.py         # Org + owner / members / tasks relationships
│   ├── task.py        # Task + assignee / org / comments (delete-orphan cascade)
│   ├── comment.py     # Comment + author / task relationships
│   └── membership.py  # memberships association table (user ↔ org)
├── schema/            # Pydantic request/response schemas (Pydantic v2)
│   ├── auth.py        # UserCreate / UserLogin / UserUpdate / UserResponse / Token
│   ├── org.py         # OrgCreate / OrgUpdate / JoinOrgRequest / OrgResponse
│   ├── task.py        # TaskCreate / TaskUpdate / TaskResponse (+ enums, URL list handling)
│   └── comment.py     # CommentCreate / CommentUpdate / CommentResponse
├── routers/           # Endpoint handlers (one module per resource)
│   ├── auth.py        # register, login, me
│   ├── users.py       # read / update / delete profile
│   ├── orgs.py        # org CRUD + join / leave
│   ├── tasks.py       # org-scoped task CRUD
│   └── comments.py    # task-scoped comment CRUD
├── utils/
│   ├── auth.py        # bcrypt hashing + JWT create/decode
│   └── deps.py        # get_current_user, get_user_org, require_org_owner, get_org_task
├── pyproject.toml     # Dependencies + ruff config
├── CHANGELOG.md       # History of the rebuild, fixes, and test results
└── .env               # DATABASE_URL + SECRET_KEY (git-ignored, never commit)
```

## Setup

```powershell
uv sync
```

Create a `.env` file:

```ini
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
SECRET_KEY=<random secret, e.g. output of: python -c "import secrets; print(secrets.token_urlsafe(48))">
```

> `DATABASE_URL` values in plain `postgresql://` form (as issued by Neon)
> are automatically mapped to the installed `psycopg2` driver.

Start the server:

```powershell
uv run uvicorn main:app --reload
```

Tables are created automatically on startup. Interactive docs:
http://127.0.0.1:8000/docs

## API reference

All endpoints except `/`, `/auth/register`, and `/auth/login` require
`Authorization: Bearer <token>`.

| Method | Endpoint                       | Success | Description                              |
| ------ | ------------------------------ | ------- | ---------------------------------------- |
| GET    | `/`                            | 200     | Health check                             |
| POST   | `/auth/register`               | 201     | Register (`username` 3–50, valid `email`, `password` 8–72) |
| POST   | `/auth/login`                  | 200     | Login (`username`, `password`) → `{ access_token, token_type }` |
| GET    | `/auth/me`                     | 200     | Current user profile                     |
| GET    | `/users/{id}`                  | 200     | Get a user                               |
| PATCH  | `/users/{id}`                  | 200     | Edit own profile (username / email / password) |
| DELETE | `/users/{id}`                  | 204     | Delete own account (400 if you own orgs) |
| POST   | `/orgs`                        | 201     | Create org; caller becomes owner + member |
| GET    | `/orgs`                        | 200     | List orgs I own or belong to             |
| GET    | `/orgs/{id}`                   | 200     | Org details (members only)               |
| PATCH  | `/orgs/{id}`                   | 200     | Edit org (owner only)                    |
| POST   | `/orgs/{id}/join`              | 200     | Join with `{ "invite_code": "..." }`     |
| POST   | `/orgs/{id}/leave`             | 204     | Leave org (owner cannot leave)           |
| DELETE | `/orgs/{id}`                   | 204     | Delete org + its tasks (owner only)      |
| POST   | `/orgs/{id}/tasks`             | 201     | Create task in org (members only)        |
| GET    | `/orgs/{id}/tasks`             | 200     | List org tasks, optional `?status=` filter |
| GET    | `/tasks/{id}`                  | 200     | Task details with nested assignee        |
| PATCH  | `/tasks/{id}`                  | 200     | Partial update (members only)            |
| DELETE | `/tasks/{id}`                  | 204     | Delete task + its comments               |
| POST   | `/tasks/{id}/comments`         | 201     | Add comment (members only)               |
| GET    | `/tasks/{id}/comments`         | 200     | List task comments with nested authors   |
| PATCH  | `/comments/{id}`               | 200     | Edit own comment                         |
| DELETE | `/comments/{id}`               | 204     | Delete comment (author or org owner)     |

Conventions: `201` on create, `204` with empty body on delete/leave,
`400` for business-rule violations (duplicate name, bad invite code,
non-member assignee), `401` for missing/invalid/expired tokens,
`403` for permission denials, `404` for unknown ids, `422` for malformed
payloads or invalid enum values. Password hashes are never exposed in any
response.

Task `status` is one of `todo | in_progress | done`; `priority` one of
`low | medium | high`. `image_urls` is accepted as a JSON list and
`assignee` / `author` are embedded as user objects in task / comment
responses.

### Quick example

```bash
# register + login
curl -X POST localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"dev","email":"dev@example.com","password":"password123"}'
TOKEN=$(curl -s -X POST localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dev","password":"password123"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# create an org, then a task in it
ORG=$(curl -s -X POST localhost:8000/orgs \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"backend-team","description":"API squad"}' | python -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -X POST localhost:8000/orgs/$ORG/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Fix login bug","priority":"high"}'
```

## Development

```powershell
uv run ruff check .    # lint  (line-length 100, target py311)
uv run ruff format .   # format
```

Verified with a 113-check audit against the live database covering every
endpoint plus auth, validation, and permission edge cases (see
`CHANGELOG.md`); all green with `ruff check` and `ruff format` clean.

Suggested next steps: Alembic migrations (instead of `create_tables` on
startup), pagination on list endpoints, and refresh tokens.
