# Agent útmutató — Virgo szabadságkezelés

Részletes termékdokumentáció: [README.md](README.md).

## Gyors szabályok

- UI nyelv: **magyar**. Stack: Next.js 16 App Router, Prisma 7 + MySQL, shadcn, Tailwind 4.
- Dev: `http://localhost:3002` · MySQL Docker `3307` · phpMyAdmin `8081`.
- Mutációk: Server Actions (`src/app/actions.ts`). Adatolvasás: `src/lib/data.ts`.
- Munkanap-számítás: `src/lib/dates.ts` + `src/lib/work-calendar.ts` (`CalendarDay`).
- Localhost e-mail: csak fájlba (`emails/`), SMTP nincs.
- Commit csak kérésre. Ne commitolj `.env`-et / `emails/`-t.

## Cursor

- Always-on szabályok: `.cursor/rules/`
- Projekt skill-ek: `.cursor/skills/` (szabadság-folyamat, munkarend, szervezet, helyi DB)
