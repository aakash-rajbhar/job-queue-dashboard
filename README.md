# Job Queue Management Dashboard

A mini job queue dashboard: React frontend + NestJS backend, with a job state
machine and concurrency-safe status transitions.

- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: React (Vite + TypeScript), Tailwind CSS v4 + shadcn/ui

## Project layout

```
backend/   NestJS API (PostgreSQL persistence via Prisma)
frontend/  React dashboard
```

## Requirements

- Node.js 18+
- npm
- A reachable PostgreSQL 13+ database

## Running locally

### 1. Database

The backend reads the connection string from `DATABASE_URL` in
`backend/.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

Set this to any PostgreSQL instance you can reach from where the app runs
(and from your shell, below).

### 2. Apply migrations

The migration SQL is checked in under `backend/prisma/migrations`. From
`backend/`, run:

```bash
cd backend
npm install
npx prisma migrate deploy   # creates tables/indexes/enums in the target DB
```

`migrate deploy` only applies migrations that are not yet recorded in the
database's `_prisma_migrations` table, so it is safe to re-run.

### 3. Seed mock data (optional)

Populates 12 jobs across all four statuses and types so the dashboard is not
empty. Safe to re-run; it clears the table first.

```bash
cd backend
npm run db:seed
```

### 4. Start the backend

```bash
npm run start:dev        # or npm run build && npm run start:prod
```

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

The Vite dev server proxies `/api/*` → `http://localhost:3000/api/*` unchanged
(the backend serves all routes under the `/api` global prefix), so no CORS
configuration is needed locally. In production the frontend calls the backend
via the same prefix through `VITE_API_URL`.

## API

All endpoints are under `/api/jobs` and accept/return JSON.

| Method | Path                  | Description                                     |
| ------ | --------------------- | ----------------------------------------------- |
| POST   | `/api/jobs`           | Create a job                                    |
| GET    | `/api/jobs`           | List jobs (paginated, `?status=` filters)       |
| GET    | `/api/jobs/counts`    | Count jobs per status                           |
| PATCH  | `/api/jobs/:id/status`| Transition a job to a new status                |
| DELETE | `/api/jobs/:id`       | Delete a job (204)                              |

**Create** `POST /api/jobs`

```json
{ "title": "Generate weekly report", "type": "report" }
```

`title` is a required non-empty string. `type` must be one of
`email | report | sync | export`. A new job always starts as `pending`.

**List** `GET /api/jobs`

Query parameters:

| Param      | Default | Notes                                   |
| ---------- | ------- | --------------------------------------- |
| `status`   | (none)  | Optional `pending` / `running` / `completed` / `failed` filter |
| `page`     | `1`     | 1-based page number (must be ≥ 1)       |
| `pageSize` | `10`    | Items per page, `1`–`100`               |

Newest first. Unknown query parameters are rejected with `400`. The response
is an envelope so the client knows how to render pagination controls:

```json
{
  "data": [
    { "id": "...", "title": "Generate weekly report", "type": "report", "status": "running", "createdAt": "2026-09-15T16:11:36Z", "version": 0 }
  ],
  "meta": { "page": 1, "pageSize": 10, "total": 12, "totalPages": 2 }
}
```

The frontend keeps a `page`/`pageSize` in state, resets to page 1 when the
filter or the data set changes, and steps back a page when a delete empties
the current one.

**Update status** `PATCH /api/jobs/:id/status`

```json
{ "status": "running" }
```

## Status model

A job follows this state machine:

```
pending ──▶ running ──▶ completed
                    └─▶ failed
```

- `pending` → `running` (the only legal move from `pending`)
- `running` → `completed` or `failed`
- `completed`/`failed` are terminal — no further transitions

The allowed `status` and `type` values are PostgreSQL `ENUM` types, so the
database itself rejects unknown values as a last line of defense. Invalid
transitions return `400` and explain the allowed moves.

## Concurrency: "two tabs both press start"

This was the trickiest requirement, so it deserves an explanation.

**Where the rule is enforced.** In the service layer, not the UI. The state
machine transitions live in `backend/src/jobs/jobs.service.ts` and are the only
path that mutates a job. Any client — the React app, curl, Postman — goes
through exactly the same validation. Rejecting transitions on the frontend is
only a UX nicety; the API is the source of truth.

**What happens when two requests arrive at nearly the same time.** A naive
read-then-write would let both requests read `pending` and both write
`running`, silently satisfying both users. To prevent that, every job carries a
`version` column, and the transition is a single conditional `UPDATE`:

```sql
UPDATE jobs
SET status = :new, version = version + 1
WHERE id = :id AND version = :version
```

In Prisma this is `prisma.job.updateMany({ where: { id, version }, data: ... })`.
PostgreSQL executes it as one atomic statement that takes a row lock for the
duration of the write. When two tabs race, the first request increments the
version; the second waits on the row lock, re-evaluates the WHERE clause,
matches zero rows, and receives a `409 Conflict` instead of a silent success.
This is optimistic concurrency control — no long-held transactions, no
distributed coordination, and it works even if someone bypasses the app and
calls the API directly, or the service is scaled to multiple instances (the
WHERE clause is evaluated per-request).

The frontend catches the `409` and shows the server's message ("This job was
modified by another request. Refresh and try again."), then re-fetches so the
user sees the job's actual state instead of a stale one.

**Why not `SELECT ... FOR UPDATE`?** That is a valid alternative and worth
using under heavier contention. I chose the conditional update because it
expresses the invariant (transition only from the version you observed)
directly in the write, never holds a transaction open across the request, and
needs no coordination between multiple app instances.

## Testing

`backend/test/jobs.e2e-spec.ts` is a Jest + Supertest end-to-end suite that boots
the real Nest application (against the same PostgreSQL `DATABASE_URL`) and
exercises every endpoint, including the race condition:

```bash
cd backend
npm run test:e2e
```

It covers creation and its validation (empty trimmed title, unknown `type`),
the paginated envelope and `400`s on bad query params, counts, the full state
machine (`pending → running → completed`, illegal transitions → `400`, missing
id → `404`), double-delete → `404`, and the headline concurrency case: two
simultaneous `pending → running` requests must yield exactly one `200` and one
`409`, with the surviving row at `version = 1`. A smoke script in the repo
environment also asserts the full flow through the Vite dev proxy.

## Decisions and trade-offs

- **PostgreSQL + Prisma**: a typed client with checked-in migrations, native
  `ENUM` types for `status`/`type`, and a single statement for the optimistic
  transition. The app was developed against Supabase's managed Postgres.
- **API ↔ Prisma enum mapping keeps responses lowercase**: Prisma stores
  `PENDING/RUNNING/...`, the API speaks `pending/running/...`. The mapping
  lives in one file (`backend/src/jobs/job.types.ts`).
- **One table, no separate queue**: the assignment asks for a dashboard, not a
  scheduler. There is no worker process; statuses are flipped by users. A real
  queue would have a worker claim jobs (`pending` → `running` on pickup).
- **Synchronous REST**: polling on each mutation keeps the UI correct with two
  tabs without websockets/polling loops. Simpler to reason about, still
  eventual consistency for the counts.
- **Indexed `(status, createdAt)`**: the filter and default sort are covered by
  one index.
- **Pagination on `GET /jobs`**: server-side `skip/take` + `count`, with a
  `data`/`meta` envelope and a 1–100 `pageSize` cap so one account can't ask
  for the whole table in a single request.
- **Atomic delete**: `DELETE` is a single `deleteMany` counting affected rows —
  no read-before-delete, and a second delete of the same id returns `404`
  instead of an uncaught Prisma exception.
- **Global `/api` prefix + structured logs**: `app.setGlobalPrefix('api')`
  matches the frontend's default (`/api`) so the same origin works in dev and
  production; a global interceptor logs one JSON line per request
  (`method`, `url`, `status`, `durationMs`, `ip`).
- **Server-side input trimming**: `POST /jobs` trims `title` via
  `@Transform(...)` so `"  hello  "` and `"   "` are handled server-side, not
  just in the UI.
- **Migrations over `db push`**: the migration is in the repo and applied with
  `prisma migrate deploy`, so environments converge on the same schema.

## Bonus: what would make this production-ready

The two additions with the highest payoff for this system:

1. **Enabled-on-request idempotency key on `POST /jobs`** — retrying a create
   that timed out on the network currently duplicates the job. Accepting a
   client-generated idempotency key and deduping on it turns that silent
   duplicate into a safe replayable operation.

2. **Per-job log/audit of status transitions** (one row per transition with
   `from`, `to`, and a timestamp). It is the natural source of truth for
   debugging the exact scenario the assignment describes — two tabs racing —
   since it shows precisely what happened and in what order.

Both are small, additive, and do not complicate the read path. Other candidates
worth doing on a real system: `PATCH` with an `If-Match` version header instead
of the baked-in optimistic check, `helmet` + rate limiting, and a health
endpoint for the load balancer.