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
3. Set reviewer/reviewedAt; mark related notifications read; notify employee; email employee.
4. On **approved** only: also email every `ApprovalNotifyEmail` (admin list at `/beallitasok`).
5. Refresh shell pending badge (`revalidatePath` + client `router.refresh` in panel).

## UI

- Shared review modal: `review-request-dialog.tsx` (optional megjegyzés checkbox → `reviewNote`)
- Employee: `request-dialog.tsx`
- Manager header: `pending-approvals-panel.tsx` in `shell-frame.tsx` when `hasDirectReports`
- Csapatom pending next: `team-people-list.tsx` opens same modal
- Table review: `review-buttons.tsx` + `/jovahagyasok`

## Checklist

- [ ] Workday rules from DB, not hardcoded holidays
- [ ] Half-day end date disabled in UI + server
- [ ] Emails logged under `emails/`
- [ ] Pending count on bell for managers
