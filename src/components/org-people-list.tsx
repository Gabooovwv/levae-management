"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateEmployeeLeaveDays } from "@/app/actions";
import { EmployeeActions } from "@/components/employee-actions";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inactiveReasonLabel } from "@/lib/inactive-reasons";
import type { OrgPerson, StaffRoleOption } from "@/lib/org-types";
import { cn } from "@/lib/utils";

function LeaveDaysCell({ person }: { person: OrgPerson }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(person.leaveTotalDays));
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setValue(String(person.leaveTotalDays));
  }, [open, person.leaveTotalDays]);

  const nextTotal = Number(value);
  const totalValid = Number.isInteger(nextTotal) && nextTotal >= 0 && nextTotal <= 365;
  const delta = totalValid ? nextTotal - person.leaveTotalDays : 0;
  const nextAvailable = totalValid
    ? Math.max(0, Math.min(nextTotal, person.leaveAvailableDays + delta))
    : person.leaveAvailableDays;

  function save() {
    const totalDays = Number(value);
    startTransition(async () => {
      const result = await updateEmployeeLeaveDays(person.id, totalDays);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        return;
      }
      toast.error(result.message);
    });
  }

  return (
    <>
      <button
        type="button"
        onDoubleClick={() => setOpen(true)}
        title="Dupla kattintás: éves keret módosítása"
        className="rounded-md px-1 py-0.5 text-left transition-colors hover:bg-[#e8effd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span className="font-semibold tabular-nums text-foreground">
          {person.leaveTotalDays}/{person.leaveAvailableDays}
        </span>
        <span className="mt-0.5 block text-[10px] text-[#aaabc2]">összes / kiadható</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Éves szabadságkeret
            </DialogTitle>
            <DialogDescription>
              {person.lastName} {person.firstName}. Csak az összes napot módosítod; a kiadható a
              különbséggel változik (most {person.leaveTotalDays}/{person.leaveAvailableDays}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor={`quick-totalDays-${person.id}`}>Összes nap / év</Label>
            <Input
              id={`quick-totalDays-${person.id}`}
              type="number"
              min={0}
              max={365}
              step={1}
              value={value}
              autoFocus
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  save();
                }
              }}
              className="h-12 bg-[#f4f5f7]"
            />
            {totalValid ? (
              <p className="text-xs text-muted-foreground">
                Mentés után:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {nextTotal}/{nextAvailable}
                </span>
                {delta === 0
                  ? null
                  : ` (kiadható ${delta > 0 ? "+" : ""}${delta} nap)`}
              </p>
            ) : (
              <p className="text-xs text-[#d81c1c]">0 és 365 közötti egész szám kell.</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="h-11"
            >
              Mégse
            </Button>
            <Button
              type="button"
              disabled={pending || !totalValid}
              onClick={save}
              className="h-11 hover:bg-[#477bf3]"
            >
              {pending ? "Mentés…" : "Mentés"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OrgPeopleList({
  rows,
  people,
  departments,
  jobTitles,
  staffRoles,
}: {
  rows: OrgPerson[];
  people: OrgPerson[];
  departments: { id: number; name: string }[];
  jobTitles: { id: number; name: string }[];
  staffRoles: StaffRoleOption[];
}) {
  const sorted = [...rows].sort((a, b) => {
    const byLast = a.lastName.localeCompare(b.lastName, "hu");
    if (byLast !== 0) return byLast;
    return a.firstName.localeCompare(b.firstName, "hu");
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-[#eaeaf0] bg-white px-4 py-10 text-center text-sm text-muted-foreground">
        Nincs a szűrésnek megfelelő dolgozó.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#eaeaf0] bg-white">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-11 px-4">Név</TableHead>
            <TableHead className="h-11 px-3">Beosztás</TableHead>
            <TableHead className="h-11 px-3">Részleg</TableHead>
            <TableHead className="h-11 px-3">Szerep</TableHead>
            <TableHead className="h-11 px-3">Felettes</TableHead>
            <TableHead className="h-11 px-3">Szabadság</TableHead>
            <TableHead className="h-11 px-3">Státusz</TableHead>
            <TableHead className="h-11 px-4 text-right">Műveletek</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((person) => {
            const manager = person.managerId
              ? people.find((candidate) => candidate.id === person.managerId)
              : null;
            return (
              <TableRow
                key={person.id}
                className={cn(!person.active && "bg-[#f4f5f7] text-[#8b8ea3] hover:bg-[#f0f1f5]")}
              >
                <TableCell className="px-4 py-2.5">
                  <div className="min-w-0">
                    <p className={cn("truncate font-semibold text-foreground", !person.active && "text-[#8b8ea3]")}>
                      {person.lastName} {person.firstName}
                    </p>
                    <p className="truncate text-xs text-[#aaabc2]">{person.email}</p>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2.5 text-[#555885]">{person.jobTitle}</TableCell>
                <TableCell className="px-3 py-2.5 text-[#555885]">{person.department}</TableCell>
                <TableCell className="px-3 py-2.5 text-[#555885]">{person.roleTitle}</TableCell>
                <TableCell className="px-3 py-2.5 text-[#555885]">
                  {manager ? `${manager.lastName} ${manager.firstName}` : "—"}
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  <LeaveDaysCell person={person} />
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  {person.active ? (
                    <span className="text-xs font-semibold text-[#08784c]">Aktív</span>
                  ) : (
                    <span className="rounded-full border border-[#d4d5e1] bg-white px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-[#8b8ea3] uppercase">
                      {inactiveReasonLabel(person.inactiveReason)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right">
                  <div className="flex justify-end">
                    <EmployeeActions
                      person={person}
                      people={people}
                      departments={departments}
                      jobTitles={jobTitles}
                      staffRoles={staffRoles}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
