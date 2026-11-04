---
name: leave-request-flow
description: >-
  Implement or change leave request create/approve/reject flow, half-day,
  balance checks, manager bell sheet, and notification emails. Use when editing
  RequestDialog, pending approvals, createLeaveRequest, reviewLeaveRequest, or
  szabadságigény / jóváhagyás features.
---

# Leave request flow

## Create (`createLeaveRequest`)

1. Parse dates; halfDay → end = start, workDays = 0.5 (must be workday).
2. Else `countWorkdays(start, end, await loadWorkdayRules(...))`.
3. Require non-admin user with `managerId`.
4. Block overlap with pending/approved.
5. If `deductsBalance`: approved + pending + new ≤ totalDays.
6. Insert `LeaveRequest` pending; notify manager; `sendMails` to employee + manager.
7. Disable CTA when bookable days `< 0.5` (`RequestDialog` props: availableDays, pendingDays).

## Review (`reviewLeaveRequest`)

1. Only direct manager; status must be pending.
2. Approve: re-check balance if deducts.
3. Optional `reviewNote` (shown later in employee detail/history).
4. Set reviewer/reviewedAt; mark related notifications read; notify employee; email employee.
5. On **approved** only: also email every `ApprovalNotifyEmail` (admin list at `/beallitasok`).
6. Refresh shell pending badge (`revalidatePath` + client `router.refresh` in panel).

## UI

- Shared review modal: `review-request-dialog.tsx` (optional megjegyzés checkbox → `reviewNote`)
- Employee create: `request-dialog.tsx`
- Employee detail (Szabadságaim double-click): `request-detail-dialog.tsx` via `RequestsTable` `detailsOnDoubleClick`
- History icon/modal: `request-history-dialog.tsx`
- Manager header pending: `pending-approvals-panel.tsx` (ClipboardCheck) when `hasDirectReports`
- Employee notifications: `notifications-panel.tsx` (Bell) — per-item + clear-all delete with exit animation
- Csapatom pending next: `team-people-list.tsx` opens same review modal
- Table review: `review-buttons.tsx` + `/jovahagyasok`
- Calendar half-day: diagonal triangle fill in `leave-calendar.tsx`

## Checklist

- [ ] Workday rules from DB, not hardcoded holidays
- [ ] Half-day end date disabled in UI + server
- [ ] Half-day calendar cell is triangle, not full square
- [ ] Emails logged under `emails/`
- [ ] Pending count for managers; notifications delete/clear for employees
