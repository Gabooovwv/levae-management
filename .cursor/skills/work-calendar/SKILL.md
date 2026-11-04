---
name: work-calendar
description: >-
  Admin yearly work calendar (holidays and relocated workdays) and leave day
  counting. Use when changing /munkarend, CalendarDay, isWorkday, countWorkdays,
  or when the user mentions munkaszüneti, áthelyezett munkanap, or munkarend.
---

# Work calendar

## Model

`CalendarDay`: unique `date`, `kind` = `holiday` | `workday`.

## Admin UI

- Route: `/munkarend` (admin only)
- Component: `work-calendar-admin.tsx`
- Click cycle: default → holiday → workday → default
- Persist: `setCalendarDay(date, kind | null)` in `actions.ts`

## Counting

```ts
const rules = await loadWorkdayRules(start, end);
countWorkdays(start, end, rules);
isWorkday(iso, rules);
```

Loaders: `src/lib/work-calendar.ts`. Pure logic: `src/lib/dates.ts`.

## Rules of thumb

- Weekend off unless `workday` override
- Holiday never counts toward leave length
- Relocated Saturday inside a leave range **does** count
- Seed defaults: `DEFAULT_HOLIDAYS_2026` in dates.ts → seed into `CalendarDay`

## After admin calendar change

`setCalendarDay` calls `recalculateLeaveRequestsOverlapping(date)`:
- finds pending/approved requests spanning that date
- recomputes `workDays` with current rules (add or remove the day)
- e.g. remove relocated Saturday → Dec 10–16 drops from 6 to 5 days

## After schema change

Create/alter table (docker MySQL on 3307), `npm run db:generate`. Prefer not wiping seed data unless user asks `db:setup`.
