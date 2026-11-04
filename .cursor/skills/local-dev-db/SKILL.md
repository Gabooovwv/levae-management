---
name: local-dev-db
description: >-
  Local Docker MySQL, Prisma setup, connection pool recovery, phpMyAdmin. Use
  when DB is down, pool errors (45028), db:setup, docker compose, or
  "szabadságadatok most nem érhetők el".
---

# Local DB

## Start

```bash
docker compose up -d
# wait healthy: leave-mysql on 3307, phpMyAdmin 8081
```

Env: `DATABASE_HOST=127.0.0.1`, `DATABASE_PORT=3307`, user/pass `leave`/`leave`.

## Schema / seed

```bash
npm run db:generate   # client only
npm run db:setup      # generate + push + seed (wipes seed data)
```

If `prisma db push --accept-data-loss` is blocked by Prisma AI guard, apply DDL via:

`docker exec leave-mysql mysql -uleave -pleave leave_management -e "..."`.

## Pool error after MySQL was down

Prisma keeps a dead pool in the Next process:

1. `docker compose up -d` (confirm healthy)
2. Kill Next on 3002 (and stray 3000 for this repo)
3. `npm run dev -- --port 3002`

App origin/OAuth expect **3002**.

## Smoke

- Login page without „Adatbázis / szabadságadatok” banner
- `SHOW TABLES` includes `User`, `LeaveRequest`, `CalendarDay`
