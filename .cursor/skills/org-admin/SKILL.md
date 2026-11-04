---
name: org-admin
description: >-
  Organization admin: employee tree/list, catalogs (job title, department,
  staff role), deactivate/delete with reassignment, leave days editing. Use when
  working on /szervezet, org-tree, org-people-list, employee-actions, or
  dolgozó / részleg / beosztás features.
---

# Org admin

## Route

`/szervezet` — admin only. Components: `org-tree.tsx`, `org-people-list.tsx`, `employee-actions.tsx`.

## Patterns

- Default view: **list**; tree collapsed; per-level non-gray colors.
- Search / inactive filters: sheet (list filters from right).
- Catalogs (JobTitle, Department, StaffRole): add + hover delete; block delete if in use.
- Employee: create/update, set `managerId`, annual leave days, deactivate (`active` + reason), reactivate, delete with report reassignment.
- List shows `összes / kiadható`; double-click quick-edit **total days only** (delta keeps available semantics via used).

## Actions

See `src/app/actions.ts`: create/update/delete employee, catalogs, `updateEmployeeLeaveDays`, manager change.

## Constraints

- Do not allow admin users as leave requesters or as assignable managers for leave chain.
- Passzív user cannot log in (`getCurrentUser` / login).
