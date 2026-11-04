---
name: leave-domain
description: >-
  Virgo szabadságkezelő termékdomain: szerepkörök, oldalak, keret, jóváhagyás,
  munkarend, e-mail, auth. Use when working on leave-management features,
  approvals, org tree, work calendar, balance, or when the user mentions
  szabadság, felettes, munkarend, vagy szervezeti fa.
---

# Leave domain

Olvass először: [README.md](../../../README.md). Rövid agent tippek: [AGENTS.md](../../../AGENTS.md).

## Szerepek → UI

| Ki | Hol |
| --- | --- |
| admin | `/szervezet`, `/munkarend`, `/beallitasok`, `/riportok` — nincs leave UX |
| dolgozó+ | `/`, `/szabadsagaim`, `/naptar`, `/riportok` |
| van beosztottja | + `/csapatom`, `/jovahagyasok`, harang pending sheet |

Felettes = `User.managerId`, nem a `role === "manager"` önmagában.

## Keret és napok

- `LeaveBalance.totalDays` éves keret
- used = approved + `deductsBalance` jogcímek `workDays` összege
- available = total − used
- pending beleszámít új igény ellenőrzésébe
- half day: 0.5 munkanap

## Munkanap

`isWorkday(iso, rules)`:

1. `CalendarDay.workday` → igen (pl. szombat)
2. `CalendarDay.holiday` → nem
3. egyébként hétköznap igen, hétvége nem

## E-mail

Localhost → `emails/[to].[stamp].txt` via `src/lib/mail.ts`. Gitignore: `/emails`.

Jóváhagyáskor másolat: `ApprovalNotifyEmail` címek (admin `/beallitasok`). Elutasításról nem.

## Kulcs fájlok

- `src/app/actions.ts` — create/review/org/calendar actions
- `src/lib/data.ts` — shell, balance, lists
- `src/lib/dates.ts` + `work-calendar.ts`
- `src/components/request-dialog.tsx`, `pending-approvals-panel.tsx`, `work-calendar-admin.tsx`
- `prisma/schema.prisma`
