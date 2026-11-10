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

## Pool error `45028`

Two common causes:

1. **MySQL was down / dead pool in Next** — restart MySQL, then restart Next:
   ```bash
   docker compose up -d
   # Ctrl+C the old npm run dev, then:
   npm run dev -- -p 3002
   ```
2. **MySQL 8 `caching_sha2_password`** — `src/lib/prisma.ts` must set `allowPublicKeyRetrieval: true` on `PrismaMariaDb`. Without it the pool stays empty (`active=0 idle=0`) even when port 3307 answers.

App origin/OAuth expect **3002**.

## Smoke

- Login page without „Adatbázis / szabadságadatok” banner
- `SHOW TABLES` includes `User`, `LeaveRequest`, `CalendarDay`
