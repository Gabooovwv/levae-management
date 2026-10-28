"use client";

import { useState, useTransition } from "react";
import { PauseCircle, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deactivateEmployee,
  deleteEmployee,
  reactivateEmployee,
  updateEmployee,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INACTIVE_REASONS, inactiveReasonLabel } from "@/lib/inactive-reasons";
import type { OrgPerson, StaffRoleOption } from "@/lib/org-types";
import { cn } from "@/lib/utils";

function descendants(people: OrgPerson[], id: number): Set<number> {
  const children = people.filter((person) => person.managerId === id);
  const ids = new Set<number>();
  for (const child of children) {
    ids.add(child.id);
    for (const nested of descendants(people, child.id)) ids.add(nested);
  }
  return ids;
}

function matchStaffRole(person: OrgPerson, staffRoles: StaffRoleOption[]) {
  return (
    staffRoles.find((role) => role.name === person.roleTitle) ??
    staffRoles.find((role) => role.kind === person.role) ??
    staffRoles[0]
  );
}

export function EmployeeActions({
  person,
  people,
  departments,
  jobTitles,
  staffRoles,
}: {
  person: OrgPerson;
  people: OrgPerson[];
  departments: { id: number; name: string }[];
  jobTitles: { id: number; name: string }[];
  staffRoles: StaffRoleOption[];
}) {
  const [open, setOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inactiveReason, setInactiveReason] = useState(INACTIVE_REASONS[0].value);
  const [pending, startTransition] = useTransition();
  const matchedTitle =
    jobTitles.find((title) => title.name === person.jobTitle) ?? jobTitles[0];
  const matchedRole = matchStaffRole(person, staffRoles);
  const [departmentId, setDepartmentId] = useState(String(person.departmentId));
  const [jobTitleId, setJobTitleId] = useState(String(matchedTitle?.id ?? ""));
  const [staffRoleId, setStaffRoleId] = useState(String(matchedRole?.id ?? ""));
  const [managerId, setManagerId] = useState(String(person.managerId ?? 0));
  const blocked = descendants(people, person.id);
  const options = people.filter(
    (candidate) =>
      candidate.id !== person.id && !blocked.has(candidate.id) && candidate.active,
  );
  const manager = person.managerId
    ? people.find((candidate) => candidate.id === person.managerId)
    : null;
  const reportCount = people.filter((row) => row.managerId === person.id).length;

  function openEditor() {
    setDepartmentId(String(person.departmentId));
    setJobTitleId(
      String(
        (jobTitles.find((title) => title.name === person.jobTitle) ?? jobTitles[0])?.id ?? "",
      ),
    );
    setStaffRoleId(String(matchStaffRole(person, staffRoles)?.id ?? ""));
    setManagerId(String(person.managerId ?? 0));
    setOpen(true);
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateEmployee(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        return;
      }
      toast.error(result.message);
    });
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteEmployee(person.id);
      if (result.ok) {
        toast.success(result.message);
        setDeleteOpen(false);
        return;
      }
      toast.error(result.message);
    });
  }

  function onDeactivate() {
    startTransition(async () => {
      const result = await deactivateEmployee(person.id, inactiveReason);
      if (result.ok) {
        toast.success(result.message);
        setStatusOpen(false);
        return;
      }
      toast.error(result.message);
    });
  }

  function onReactivate() {
    startTransition(async () => {
      const result = await reactivateEmployee(person.id);
      if (result.ok) {
        toast.success(result.message);
        setStatusOpen(false);
        return;
      }
      toast.error(result.message);
    });
  }

  return (
    <div className="inline-flex shrink-0 items-center gap-0.5">
      <Dialog open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onClick={openEditor}
          aria-label={`${person.lastName} ${person.firstName} szerkesztése`}
          className="grid size-7 shrink-0 place-items-center rounded-md text-[#aaabc2] transition-colors hover:bg-[#f4f5f7] hover:text-primary"
        >
          <Pencil className="size-3.5" />
        </button>
        <DialogContent className="sm:max-w-[470px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Dolgozó szerkesztése
            </DialogTitle>
            <DialogDescription>
              A módosítások azonnal érvényesek a szervezeti fában és a jóváhagyási láncban.
            </DialogDescription>
          </DialogHeader>
          <form action={onSubmit} className="grid gap-3">
            <input type="hidden" name="userId" value={person.id} />
            <input type="hidden" name="departmentId" value={departmentId} />
            <input type="hidden" name="jobTitleId" value={jobTitleId} />
            <input type="hidden" name="staffRoleId" value={staffRoleId} />
            <input type="hidden" name="managerId" value={managerId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`lastName-${person.id}`}>Vezetéknév</Label>
                <Input
                  id={`lastName-${person.id}`}
                  name="lastName"
                  defaultValue={person.lastName}
                  required
                  className="h-12 bg-[#f4f5f7]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`firstName-${person.id}`}>Keresztnév</Label>
                <Input
                  id={`firstName-${person.id}`}
                  name="firstName"
                  defaultValue={person.firstName}
                  required
                  className="h-12 bg-[#f4f5f7]"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`email-${person.id}`}>E-mail</Label>
              <Input
                id={`email-${person.id}`}
                name="email"
                type="email"
                defaultValue={person.email}
                required
                className="h-12 bg-[#f4f5f7]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Beosztás</Label>
              {jobTitles.length === 0 ? (
                <p className="rounded-lg bg-[#fdecec] px-3 py-2 text-sm text-[#d81c1c]">
                  Még nincs beosztás a listában.
                </p>
              ) : (
                <Select value={jobTitleId} onValueChange={(value) => value && setJobTitleId(value)}>
                  <SelectTrigger className="h-10! w-full">
                    <SelectValue>
                      {jobTitles.find((title) => String(title.id) === jobTitleId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {jobTitles.map((title) => (
                      <SelectItem key={title.id} value={String(title.id)}>
                        {title.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Részleg</Label>
              <Select value={departmentId} onValueChange={(value) => value && setDepartmentId(value)}>
                <SelectTrigger className="h-10! w-full">
                  <SelectValue>
                    {departments.find((department) => String(department.id) === departmentId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Felettes</Label>
              <Select value={managerId} onValueChange={(value) => value && setManagerId(value)}>
                <SelectTrigger className="h-10! w-full">
                  <SelectValue>
                    {managerId === "0"
                      ? "Nincs felettese"
                      : (() => {
                          const selected = people.find(
                            (candidate) => String(candidate.id) === managerId,
                          );
                          return selected
                            ? `${selected.lastName} ${selected.firstName}`
                            : "Nincs felettese";
                        })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Nincs felettese</SelectItem>
                  {options.map((candidate) => (
                    <SelectItem key={candidate.id} value={String(candidate.id)}>
                      {candidate.lastName} {candidate.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Szerep</Label>
              {staffRoles.length === 0 ? (
                <p className="rounded-lg bg-[#fdecec] px-3 py-2 text-sm text-[#d81c1c]">
                  Még nincs szerep a listában.
                </p>
              ) : (
                <Select value={staffRoleId} onValueChange={(value) => value && setStaffRoleId(value)}>
                  <SelectTrigger className="h-10! w-full">
                    <SelectValue>
                      {staffRoles.find((role) => String(role.id) === staffRoleId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {staffRoles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`totalDays-${person.id}`}>Éves szabadságkeret (nap)</Label>
              <Input
                id={`totalDays-${person.id}`}
                name="totalDays"
                type="number"
                min={0}
                max={365}
                step={1}
                required
                defaultValue={person.leaveTotalDays || 25}
                className="h-12 bg-[#f4f5f7]"
              />
              <p className="text-xs text-muted-foreground">
                Csak az éves összes keretet állítod. A kiadható a már kivett napok után
                automatikusan számolódik (most {person.leaveTotalDays}/{person.leaveAvailableDays}).
              </p>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={pending || jobTitles.length === 0 || staffRoles.length === 0}
                className="h-12 hover:bg-[#477bf3]"
              >
                {pending ? "Mentés…" : "Mentés"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={statusOpen}
        onOpenChange={(next) => {
          setStatusOpen(next);
          if (next) setInactiveReason(INACTIVE_REASONS[0].value);
        }}
      >
        <button
          type="button"
          onClick={() => setStatusOpen(true)}
          aria-label={
            person.active
              ? `${person.lastName} ${person.firstName} passzívvá tétele`
              : `${person.lastName} ${person.firstName} újraaktiválása`
          }
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-md transition-colors",
            person.active
              ? "text-[#aaabc2] hover:bg-[#fff1e4] hover:text-[#b86a1b]"
              : "text-[#08784c] hover:bg-[#e5fbf3]",
          )}
        >
          {person.active ? <PauseCircle className="size-3.5" /> : <RotateCcw className="size-3.5" />}
        </button>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {person.active ? "Dolgozó passzívvá tétele" : "Dolgozó újraaktiválása"}
            </DialogTitle>
            <DialogDescription>
              {person.active ? (
                <>
                  {person.lastName} {person.firstName} passzív státuszba kerül.
                  {reportCount > 0 ? (
                    <>
                      {" "}
                      A {reportCount} közvetlen beosztott
                      {manager
                        ? ` automatikusan ${manager.lastName} ${manager.firstName} alá kerül.`
                        : " felettes nélkül marad."}
                    </>
                  ) : null}{" "}
                  Passzív dolgozó alá nem rendelhető beosztott.
                </>
              ) : (
                <>
                  {person.lastName} {person.firstName} újra aktív lesz, és ismét rendelhető alá
                  beosztott.
                  {person.inactiveReason
                    ? ` Jelenlegi ok: ${inactiveReasonLabel(person.inactiveReason)}.`
                    : null}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {person.active ? (
            <div className="grid gap-1.5">
              <Label>Passzív ok</Label>
              <Select
                value={inactiveReason}
                onValueChange={(value) => value && setInactiveReason(value as typeof inactiveReason)}
              >
                <SelectTrigger className="h-10! w-full">
                  <SelectValue>
                    {INACTIVE_REASONS.find((reason) => reason.value === inactiveReason)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {INACTIVE_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setStatusOpen(false)}
              className="h-11"
            >
              Mégse
            </Button>
            {person.active ? (
              <Button
                type="button"
                disabled={pending}
                onClick={onDeactivate}
                className="h-11 bg-[#b86a1b] hover:bg-[#9a5716]"
              >
                {pending ? "Mentés…" : "Passzívvá tesz"}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={pending}
                onClick={onReactivate}
                className="h-11 bg-[#08784c] hover:bg-[#06633e]"
              >
                {pending ? "Mentés…" : "Újraaktiválás"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          aria-label={`${person.lastName} ${person.firstName} törlése`}
          className="grid size-7 shrink-0 place-items-center rounded-md text-[#aaabc2] transition-colors hover:bg-[#fdecec] hover:text-[#d81c1c]"
        >
          <Trash2 className="size-3.5" />
        </button>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Dolgozó törlése</DialogTitle>
            <DialogDescription>
              Biztosan törlöd {person.lastName} {person.firstName} felhasználót? Ez a művelet nem
              vonható vissza.
              {reportCount > 0 ? (
                <>
                  {" "}
                  A {reportCount} közvetlen beosztott
                  {manager
                    ? ` automatikusan ${manager.lastName} ${manager.firstName} alá kerül.`
                    : " felettes nélkül marad."}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setDeleteOpen(false)}
              className="h-11"
            >
              Mégse
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={onDelete}
              className="h-11 bg-[#d81c1c] hover:bg-[#b91616]"
            >
              {pending ? "Törlés…" : "Törlés"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
