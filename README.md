# IssueTracker

A full-stack **Developer Project & Issue Tracker**: a multi-org task tracking
system where users register, form organizations, invite members with an invite
code, manage tasks inside orgs, and discuss them through comments.

The repository is split into two applications:

| Folder                   | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| [`backend/`](backend/)   | FastAPI + SQLAlchemy + PostgreSQL REST API (JWT auth)    |
| [`frontend/`](frontend/) | React 19 + TypeScript + Vite SPA (Tailwind CSS v4)       |

## Features

- **Authentication** — register, login, and bearer-token protected routes with
  bcrypt password hashing and 60-minute JWT expiry
- **Organizations** — create orgs, join via auto-generated invite codes, owner
  vs. member permission model
- **Tasks** — full CRUD scoped to orgs with status (`todo / in_progress /
  done`), priority (`low / medium / high`), due dates, assignees, and image URLs
- **Comments** — per-task discussion with author-only editing
- **Guarded deletes** — deleting an org cascades its tasks/comments; deleting a
  user unassigns their tasks and requires owning no orgs
- **SPA frontend** — auth pages, org list/detail, task detail, and settings,
  with protected routes and a dev proxy to the API

## Tech stack

| Layer      | Backend                                        | Frontend                          |
| ---------- | ---------------------------------------------- | --------------------------------- |
| Framework  | FastAPI                                        | React 19 + React Router 7         |
| Language   | Python ≥ 3.11                                  | TypeScript                          |
| ORM / Data | SQLAlchemy 2.x, Pydantic v2                     | `fetch` wrapper (`src/api.ts`)    |
| Auth       | `bcrypt` + `python-jose` (JWT, HS256)           | Token stored client-side          |
| Database   | PostgreSQL via `psycopg2` (auto-created tables)| —                                 |
| Styling    | —                                              | Tailwind CSS v4                   |
| Tooling    | `uv`, `ruff`                                   | Vite 8, Oxlint                    |

## Quick start

Requirements: **Python ≥ 3.11** with [uv](https://docs.astral.sh/uv/) for the
backend, and **Node.js** for the frontend.

### 1. Backend

```powershell
cd backend
uv sync
```

Create `backend/.env`:

```ini
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
SECRET_KEY=<random secret, e.g. python -c "import secrets; print(secrets.token_urlsafe(48))">
```

Start the API (tables are created automatically on startup):

```powershell
uv run uvicorn main:app --reload
```

- API: http://127.0.0.1:8000
- Interactive docs: http://127.0.0.1:8000/docs

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the Vite dev server proxies `/api/*` to
`http://127.0.0.1:8000`, so run the backend first.

## Repository structure

```text
IssueTracker/
├── backend/     # FastAPI app (routers, models, schemas, utils)
│   ├── main.py
│   ├── database.py
│   ├── models/  # SQLAlchemy models
│   ├── schema/  # Pydantic request/response schemas
│   ├── routers/ # auth, users, orgs, tasks, comments
│   └── utils/   # password hashing, JWT, auth dependencies
└── frontend/    # React + TypeScript SPA
    └── src/
        ├── api.ts         # typed fetch wrapper (/api base)
        ├── auth.tsx       # auth context
        ├── components/    # Navbar, Modal, ProtectedLayout, ui
        └── pages/         # Auth, Orgs, Org, Task, Settings
```

## Documentation

- [`backend/README.md`](backend/README.md) — full API reference, permission
  rules, and data model
- [`frontend/README.md`](frontend/README.md) — Vite/React template notes

## Development

Backend:

```powershell
cd backend
uv run ruff check .    # lint
uv run ruff format .   # format
```

Frontend:

```powershell
cd frontend
npm run lint           # oxlint
npm run build          # type-check + production build
```
