"use client";

import { useState, useTransition, type DragEvent } from "react";
import { ChevronDown, GripVertical, List, ListFilter, Network, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  createDepartment,
  createEmployee,
  createJobTitle,
  createStaffRole,
  deleteDepartment,
  deleteJobTitle,
  deleteStaffRole,
  setEmployeeManager,
} from "@/app/actions";
import { EmployeeActions } from "@/components/employee-actions";
import { OrgPeopleList } from "@/components/org-people-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { inactiveReasonLabel } from "@/lib/inactive-reasons";
import type { OrgPerson, StaffRoleOption } from "@/lib/org-types";
import { cn } from "@/lib/utils";

export type { OrgPerson, StaffRoleOption };

type DropMode = "beside" | "under";

type DropTarget = {
  id: number;
  mode: DropMode;
};

const kindLabel: Record<string, string> = {
  employee: "Alap jogosultság",
  manager: "Vezetői jogosultság",
  hr: "HR jogosultság",
};

const LEVEL_TONES = [
  { card: "border-[#b7c9f5] bg-[#eaf0fc]", rail: "border-[#195af0]/40" },
  { card: "border-[#9fdcc4] bg-[#e8faf2]", rail: "border-[#08784c]/35" },
  { card: "border-[#efc89a] bg-[#fff4e8]", rail: "border-[#b86a1b]/35" },
  { card: "border-[#f0b8c4] bg-[#fff0f3]", rail: "border-[#c43d5a]/30" },
  { card: "border-[#b8d8e8] bg-[#eef7fb]", rail: "border-[#2a7a9b]/35" },
] as const;

function levelTone(depth: number) {
  return LEVEL_TONES[depth % LEVEL_TONES.length];
}

function descendants(people: OrgPerson[], id: number): Set<number> {
  const children = people.filter((person) => person.managerId === id);
  const ids = new Set<number>();
  for (const child of children) {
    ids.add(child.id);
    for (const nested of descendants(people, child.id)) ids.add(nested);
  }
  return ids;
}

function directReports(people: OrgPerson[], id: number) {
  return people.filter((person) => person.managerId === id);
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("hu-HU");
}

function matchesEmployeeName(person: OrgPerson, query: string) {
  if (!query.trim()) return true;
  const needle = normalizeName(query);
  const full = normalizeName(`${person.lastName} ${person.firstName}`);
  const reverse = normalizeName(`${person.firstName} ${person.lastName}`);
  return (
    normalizeName(person.lastName).includes(needle) ||
    normalizeName(person.firstName).includes(needle) ||
    full.includes(needle) ||
    reverse.includes(needle)
  );
}

type EmployeeFilters = {
  query: string;
  inactiveOnly: boolean;
  jobTitle: string;
  departmentId: string;
  roleTitle: string;
  managerId: string;
};

function filterEmployees(people: OrgPerson[], filters: EmployeeFilters) {
  return people.filter((person) => {
    if (filters.inactiveOnly && person.active) return false;
    if (!matchesEmployeeName(person, filters.query)) return false;
    if (filters.jobTitle !== "all" && person.jobTitle !== filters.jobTitle) return false;
    if (filters.departmentId !== "all" && String(person.departmentId) !== filters.departmentId) {
      return false;
    }
    if (filters.roleTitle !== "all" && person.roleTitle !== filters.roleTitle) return false;
    if (filters.managerId === "none") {
      if (person.managerId !== null) return false;
    } else if (filters.managerId !== "all" && String(person.managerId) !== filters.managerId) {
      return false;
    }
    return true;
  });
}

function withAncestors(people: OrgPerson[], matched: OrgPerson[]) {
  if (matched.length === 0) return [];
  const byId = new Map(people.map((person) => [person.id, person]));
  const ids = new Set(matched.map((person) => person.id));
  for (const person of matched) {
    let current = person.managerId;
    while (current != null && !ids.has(current)) {
      ids.add(current);
      current = byId.get(current)?.managerId ?? null;
    }
  }
  return people.filter((person) => ids.has(person.id));
}

function TreeLevel({
  people,
  directory,
  departments,
  jobTitles,
  staffRoles,
  parentId,
  depth,
  openIds,
  onToggle,
  draggingId,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDropTarget,
  onDropPerson,
}: {
  people: OrgPerson[];
  directory: OrgPerson[];
  departments: { id: number; name: string }[];
  jobTitles: { id: number; name: string }[];
  staffRoles: StaffRoleOption[];
  parentId: number | null;
  depth: number;
  openIds: Set<number>;
  onToggle: (id: number) => void;
  draggingId: number | null;
  dropTarget: DropTarget | null;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onDropTarget: (target: DropTarget | null) => void;
  onDropPerson: (targetId: number, mode: DropMode) => void;
}) {
  const ids = new Set(people.map((person) => person.id));
  const nodes = people.filter((person) =>
    parentId === null ? person.managerId === null || !ids.has(person.managerId) : person.managerId === parentId,
  );
  if (nodes.length === 0) return null;

  const tone = levelTone(depth);

  return (
    <ul
      className={cn(
        "grid gap-3",
        depth > 0 && cn("mt-3 border-l-2 pl-4", tone.rail),
      )}
    >
      {nodes.map((person) => {
        const reports = directReports(people, person.id);
        const hasGroup = reports.length > 0;
        const expanded = openIds.has(person.id);

        return (
          <li key={person.id}>
            <PersonCard
              person={person}
              people={directory}
              departments={departments}
              jobTitles={jobTitles}
              staffRoles={staffRoles}
              depth={depth}
              reportCount={reports.length}
              expanded={expanded}
              onToggle={hasGroup ? () => onToggle(person.id) : undefined}
              draggingId={draggingId}
              dropTarget={dropTarget}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDropTarget={onDropTarget}
              onDropPerson={onDropPerson}
            />
            {hasGroup && expanded ? (
              <TreeLevel
                people={people}
                directory={directory}
                departments={departments}
                jobTitles={jobTitles}
                staffRoles={staffRoles}
                parentId={person.id}
                depth={depth + 1}
                openIds={openIds}
                onToggle={onToggle}
                draggingId={draggingId}
                dropTarget={dropTarget}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDropTarget={onDropTarget}
                onDropPerson={onDropPerson}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function PersonCard({
  person,
  people,
  departments,
  jobTitles,
  staffRoles,
  depth,
  reportCount,
  expanded,
  onToggle,
  draggingId,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDropTarget,
  onDropPerson,
}: {
  person: OrgPerson;
  people: OrgPerson[];
  departments: { id: number; name: string }[];
  jobTitles: { id: number; name: string }[];
  staffRoles: StaffRoleOption[];
  depth: number;
  reportCount: number;
  expanded: boolean;
  onToggle?: () => void;
  draggingId: number | null;
  dropTarget: DropTarget | null;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onDropTarget: (target: DropTarget | null) => void;
  onDropPerson: (targetId: number, mode: DropMode) => void;
}) {
  const [pending, startTransition] = useTransition();
  const blocked = descendants(people, person.id);
  const options = people.filter(
    (candidate) =>
      candidate.id !== person.id && !blocked.has(candidate.id) && candidate.active,
  );
  const manager = person.managerId ? people.find((candidate) => candidate.id === person.managerId) : null;
  const isDragging = draggingId === person.id;
  const isDropBlocked =
    draggingId === null ||
    draggingId === person.id ||
    descendants(people, draggingId).has(person.id);
  const activeDrop = dropTarget?.id === person.id ? dropTarget.mode : null;
  const tone = levelTone(depth);

  function resolveDropMode(event: DragEvent<HTMLDivElement>): DropMode {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - bounds.top) / bounds.height;
    if (!person.active) return "beside";
    return ratio < 0.45 ? "beside" : "under";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (isDropBlocked || draggingId === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const mode = resolveDropMode(event);
    if (dropTarget?.id !== person.id || dropTarget.mode !== mode) {
      onDropTarget({ id: person.id, mode });
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (isDropBlocked || draggingId === null) return;
    event.preventDefault();
    onDropPerson(person.id, resolveDropMode(event));
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border px-4 py-3 transition-shadow",
        person.active ? tone.card : "border-[#d4d5e1] bg-[#f4f5f7]",
        isDragging && "border-primary/40 opacity-50",
        !person.active && "opacity-70",
        activeDrop === "beside" && "ring-2 ring-[#195af0]/35",
        activeDrop === "under" && "ring-2 ring-[#0af09b]/50",
      )}
      onDragOver={handleDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          if (dropTarget?.id === person.id) onDropTarget(null);
        }
      }}
      onDrop={handleDrop}
    >
      {draggingId !== null && !isDropBlocked && activeDrop ? (
        <div className="pointer-events-none absolute inset-x-3 top-2 z-10 flex justify-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
              activeDrop === "beside"
                ? "bg-[#195af0] text-white"
                : "bg-white/90 text-[#555885] ring-1 ring-[#d4d5e1]",
            )}
          >
            Mellé
          </span>
          {person.active ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
                activeDrop === "under"
                  ? "bg-[#0af09b] text-[#12463a]"
                  : "bg-white/90 text-[#555885] ring-1 ring-[#d4d5e1]",
              )}
            >
              Alá
            </span>
          ) : (
            <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-[#8b8ea3] uppercase ring-1 ring-[#d4d5e1]">
              Passzív
            </span>
          )}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <button
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", String(person.id));
              event.dataTransfer.effectAllowed = "move";
              onDragStart(person.id);
            }}
            onDragEnd={onDragEnd}
            aria-label={`${person.lastName} ${person.firstName} áthelyezése`}
            className="mt-0.5 grid size-8 shrink-0 cursor-grab place-items-center rounded-lg text-[#aaabc2] transition-colors hover:bg-[#f4f5f7] hover:text-primary active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-label={
                expanded
                  ? `${person.lastName} ${person.firstName} csoportjának becsukása`
                  : `${person.lastName} ${person.firstName} csoportjának kinyitása`
              }
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-[#555885] transition-colors hover:bg-[#f4f5f7] hover:text-primary"
            >
              <ChevronDown className={cn("size-4 transition-transform", !expanded && "-rotate-90")} />
            </button>
          ) : (
            <span className="mt-0.5 size-8 shrink-0" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className={cn("truncate font-semibold", !person.active && "text-[#8b8ea3]")}>
                {person.lastName} {person.firstName}
              </p>
              {!person.active ? (
                <span className="shrink-0 rounded-full border border-[#d4d5e1] bg-white px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-[#8b8ea3] uppercase">
                  {inactiveReasonLabel(person.inactiveReason)}
                </span>
              ) : null}
              <EmployeeActions
                person={person}
                people={people}
                departments={departments}
                jobTitles={jobTitles}
                staffRoles={staffRoles}
              />
              {reportCount > 0 ? (
                <span className="text-xs font-medium text-[#aaabc2]">{reportCount} beosztott</span>
              ) : null}
            </div>
            <p className="truncate text-sm text-[#555885]">
              {person.jobTitle} · {person.department} · {person.roleTitle}
            </p>
            <p className="truncate text-xs text-[#aaabc2]">{person.email}</p>
          </div>
        </div>
        <div className="grid w-full gap-1 sm:w-64">
          <Label className="text-xs text-[#555885]">Felettes</Label>
          <Select
            value={String(person.managerId ?? 0)}
            disabled={pending}
            onValueChange={(value) => {
              if (!value) return;
              const next = value === "0" ? null : Number(value);
              if (next === person.managerId) return;
              startTransition(async () => {
                const result = await setEmployeeManager(person.id, next);
                if (result.ok) toast.success(result.message);
                else toast.error(result.message);
              });
            }}
          >
            <SelectTrigger className="h-10! w-full bg-[#f4f5f7]">
              <SelectValue>
                {manager ? `${manager.lastName} ${manager.firstName}` : "Nincs felettese"}
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
      </div>
    </div>
  );
}


function CatalogBadges({
  items,
  pending,
  onDelete,
}: {
  items: { id: number; name: string }[];
  pending: boolean;
  onDelete: (id: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item.id}
          className="group inline-flex items-center gap-0 rounded-full border border-[#d4d5e1] bg-white py-0.5 pr-1.5 pl-2.5 text-xs text-[#555885] transition-colors hover:border-[#c5c7d6] hover:bg-white"
        >
          <span>{item.name}</span>
          <button
            type="button"
            disabled={pending}
            aria-label={`${item.name} törlése`}
            onClick={(event) => {
              event.preventDefault();
              onDelete(item.id);
            }}
            className="ml-0 grid size-0 place-items-center overflow-hidden rounded-full text-[#aaabc2] opacity-0 transition-all hover:bg-[#fdecec] hover:text-[#d81c1c] group-hover:ml-1 group-hover:size-4 group-hover:opacity-100 focus-visible:ml-1 focus-visible:size-4 focus-visible:opacity-100 focus-visible:outline-none disabled:pointer-events-none"
          >
            <X className="size-3" strokeWidth={2.5} />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function OrgTree({
  people,
  departments,
  jobTitles,
  staffRoles,
  companyId,
}: {
  people: OrgPerson[];
  departments: { id: number; name: string }[];
  jobTitles: { id: number; name: string }[];
  staffRoles: StaffRoleOption[];
  companyId: number;
}) {
  const [view, setView] = useState<"tree" | "list">("list");
  const [query, setQuery] = useState("");
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [jobTitleFilter, setJobTitleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [departmentId, setDepartmentId] = useState(String(departments[0]?.id ?? ""));
  const [jobTitleId, setJobTitleId] = useState(String(jobTitles[0]?.id ?? ""));
  const [staffRoleId, setStaffRoleId] = useState(String(staffRoles[0]?.id ?? ""));
  const [newRoleKind, setNewRoleKind] = useState("employee");
  const [managerId, setManagerId] = useState("0");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [rootDropActive, setRootDropActive] = useState(false);
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());

  function toggleGroup(id: number) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function moveEmployee(userId: number, nextManagerId: number | null) {
    const person = people.find((row) => row.id === userId);
    if (!person) return;
    if (person.managerId === nextManagerId) {
      setDraggingId(null);
      setDropTarget(null);
      setRootDropActive(false);
      return;
    }
    startTransition(async () => {
      const result = await setEmployeeManager(userId, nextManagerId);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      setDraggingId(null);
      setDropTarget(null);
      setRootDropActive(false);
    });
  }

  function handleDropPerson(targetId: number, mode: DropMode) {
    if (draggingId === null) return;
    const target = people.find((row) => row.id === targetId);
    if (!target) return;
    if (mode === "under") {
      setOpenIds((current) => new Set(current).add(targetId));
      moveEmployee(draggingId, targetId);
      return;
    }
    moveEmployee(draggingId, target.managerId);
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createEmployee(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setManagerId("0");
        setStaffRoleId(String(staffRoles[0]?.id ?? ""));
        return;
      }
      toast.error(result.message);
    });
  }

  function onCreateTitle(formData: FormData) {
    startTransition(async () => {
      const result = await createJobTitle(formData);
      if (result.ok) {
        toast.success(result.message);
        setTitleOpen(false);
        return;
      }
      toast.error(result.message);
    });
  }

  function onCreateDepartment(formData: FormData) {
    startTransition(async () => {
      const result = await createDepartment(formData);
      if (result.ok) {
        toast.success(result.message);
        setDepartmentOpen(false);
        return;
      }
      toast.error(result.message);
    });
  }

  function onCreateStaffRole(formData: FormData) {
    startTransition(async () => {
      const result = await createStaffRole(formData);
      if (result.ok) {
        toast.success(result.message);
        setRoleOpen(false);
        setNewRoleKind("employee");
        return;
      }
      toast.error(result.message);
    });
  }

  function onDeleteJobTitle(id: number) {
    startTransition(async () => {
      const result = await deleteJobTitle(id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function onDeleteDepartment(id: number) {
    startTransition(async () => {
      const result = await deleteDepartment(id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function onDeleteStaffRole(id: number) {
    startTransition(async () => {
      const result = await deleteStaffRole(id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  const matchedPeople = filterEmployees(people, {
    query,
    inactiveOnly,
    jobTitle: jobTitleFilter,
    departmentId: departmentFilter,
    roleTitle: roleFilter,
    managerId: managerFilter,
  });
  const treePeople = withAncestors(people, matchedPeople);
  const panelFilterCount =
    (jobTitleFilter !== "all" ? 1 : 0) +
    (departmentFilter !== "all" ? 1 : 0) +
    (roleFilter !== "all" ? 1 : 0) +
    (managerFilter !== "all" ? 1 : 0) +
    (inactiveOnly ? 1 : 0);
  const hasFilters = Boolean(query.trim()) || panelFilterCount > 0;
  const managerOptions = [...people].sort((a, b) => {
    const byLast = a.lastName.localeCompare(b.lastName, "hu");
    if (byLast !== 0) return byLast;
    return a.firstName.localeCompare(b.firstName, "hu");
  });

  function applyFilter(setter: (value: string) => void, value: string | null) {
    if (!value) return;
    setter(value);
    setFilterOpen(false);
  }

  function clearPanelFilters() {
    setJobTitleFilter("all");
    setDepartmentFilter("all");
    setRoleFilter("all");
    setManagerFilter("all");
    setInactiveOnly(false);
    setFilterOpen(false);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dolgozók</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Fa vagy lista nézetben kezelheted a dolgozókat. Új dolgozó felvételekor a felettes kapja a
            szabadságkérelmet, és ő fogadja el vagy utasítja el. Felettes nélkül a kérelem nem küldhető el.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
        <Dialog open={titleOpen} onOpenChange={setTitleOpen}>
          <DialogTrigger
            render={<Button variant="outline" className="h-12 bg-white px-5 text-sm font-semibold" />}
          >
            <Plus />
            Új beosztás
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">Új beosztás</DialogTitle>
              <DialogDescription>
                A felvett beosztások a dolgozó űrlap select listájában jelennek meg.
              </DialogDescription>
            </DialogHeader>
            <form action={onCreateTitle} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="jobTitleName">Megnevezés</Label>
                <Input
                  id="jobTitleName"
                  name="name"
                  required
                  placeholder="pl. Frontend fejlesztő"
                  className="h-12 bg-[#f4f5f7]"
                />
              </div>
              {jobTitles.length > 0 ? (
                <div className="rounded-lg border border-[#eaeaf0] bg-[#f4f5f7] px-3 py-2">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[#aaabc2] uppercase">
                    Meglévő beosztások
                  </p>
                  <CatalogBadges items={jobTitles} pending={pending} onDelete={onDeleteJobTitle} />
                </div>
              ) : null}
              <DialogFooter>
                <Button type="submit" disabled={pending} className="h-12 hover:bg-[#477bf3]">
                  {pending ? "Mentés…" : "Felvétel"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={departmentOpen} onOpenChange={setDepartmentOpen}>
          <DialogTrigger
            render={<Button variant="outline" className="h-12 bg-white px-5 text-sm font-semibold" />}
          >
            <Plus />
            Új részleg
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">Új részleg</DialogTitle>
              <DialogDescription>
                A felvett részlegek a dolgozó űrlap select listájában jelennek meg.
              </DialogDescription>
            </DialogHeader>
            <form action={onCreateDepartment} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="departmentName">Megnevezés</Label>
                <Input
                  id="departmentName"
                  name="name"
                  required
                  placeholder="pl. Ügyfélszolgálat"
                  className="h-12 bg-[#f4f5f7]"
                />
              </div>
              {departments.length > 0 ? (
                <div className="rounded-lg border border-[#eaeaf0] bg-[#f4f5f7] px-3 py-2">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[#aaabc2] uppercase">
                    Meglévő részlegek
                  </p>
                  <CatalogBadges
                    items={departments}
                    pending={pending}
                    onDelete={onDeleteDepartment}
                  />
                </div>
              ) : null}
              <DialogFooter>
                <Button type="submit" disabled={pending} className="h-12 hover:bg-[#477bf3]">
                  {pending ? "Mentés…" : "Felvétel"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
          <DialogTrigger
            render={<Button variant="outline" className="h-12 bg-white px-5 text-sm font-semibold" />}
          >
            <Plus />
            Új szerep
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">Új szerep</DialogTitle>
              <DialogDescription>
                A megnevezés a listában jelenik meg. A jogosultság típusa határozza meg a rendszerbeli
                szerepet.
              </DialogDescription>
            </DialogHeader>
            <form action={onCreateStaffRole} className="grid gap-3">
              <input type="hidden" name="kind" value={newRoleKind} />
              <div className="grid gap-1.5">
                <Label htmlFor="staffRoleName">Megnevezés</Label>
                <Input
                  id="staffRoleName"
                  name="name"
                  required
                  placeholder="pl. Gyakornok"
                  className="h-12 bg-[#f4f5f7]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Jogosultság</Label>
                <Select value={newRoleKind} onValueChange={(value) => value && setNewRoleKind(value)}>
                  <SelectTrigger className="h-10! w-full">
                    <SelectValue>{kindLabel[newRoleKind]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Alap jogosultság</SelectItem>
                    <SelectItem value="manager">Vezetői jogosultság</SelectItem>
                    <SelectItem value="hr">HR jogosultság</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {staffRoles.length > 0 ? (
                <div className="rounded-lg border border-[#eaeaf0] bg-[#f4f5f7] px-3 py-2">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[#aaabc2] uppercase">
                    Meglévő szerepek
                  </p>
                  <CatalogBadges
                    items={staffRoles}
                    pending={pending}
                    onDelete={onDeleteStaffRole}
                  />
                </div>
              ) : null}
              <DialogFooter>
                <Button type="submit" disabled={pending} className="h-12 hover:bg-[#477bf3]">
                  {pending ? "Mentés…" : "Felvétel"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="h-12 px-5 text-sm font-semibold hover:bg-[#477bf3]" />}>
            <Plus />
            Új dolgozó
          </DialogTrigger>
          <DialogContent className="sm:max-w-[470px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">Új dolgozó</DialogTitle>
              <DialogDescription>
                A felettes kapja a szabadságkérelmet, és ő tudja elfogadni vagy elutasítani.
              </DialogDescription>
            </DialogHeader>
            <form action={onSubmit} className="grid gap-3">
              <input type="hidden" name="companyId" value={companyId} />
              <input type="hidden" name="departmentId" value={departmentId} />
              <input type="hidden" name="jobTitleId" value={jobTitleId} />
              <input type="hidden" name="staffRoleId" value={staffRoleId} />
              <input type="hidden" name="managerId" value={managerId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="lastName">Vezetéknév</Label>
                  <Input id="lastName" name="lastName" required className="h-12 bg-[#f4f5f7]" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="firstName">Keresztnév</Label>
                  <Input id="firstName" name="firstName" required className="h-12 bg-[#f4f5f7]" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required className="h-12 bg-[#f4f5f7]" />
              </div>
              <div className="grid gap-1.5">
                <Label>Beosztás</Label>
                {jobTitles.length === 0 ? (
                  <p className="rounded-lg bg-[#fdecec] px-3 py-2 text-sm text-[#d81c1c]">
                    Még nincs beosztás. Előbb vedd fel az Új beosztás gombbal.
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
                {departments.length === 0 ? (
                  <p className="rounded-lg bg-[#fdecec] px-3 py-2 text-sm text-[#d81c1c]">
                    Még nincs részleg. Előbb vedd fel az Új részleg gombbal.
                  </p>
                ) : (
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
                )}
              </div>
              <div className="grid gap-1.5">
                <Label>Felettes</Label>
                <Select value={managerId} onValueChange={(value) => value && setManagerId(value)}>
                  <SelectTrigger className="h-10! w-full">
                    <SelectValue>
                      {managerId === "0"
                        ? "Nincs felettese"
                        : (() => {
                            const manager = people.find((person) => String(person.id) === managerId);
                            return manager ? `${manager.lastName} ${manager.firstName}` : "Nincs felettese";
                          })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nincs felettese</SelectItem>
                    {people
                      .filter((person) => person.active)
                      .map((person) => (
                        <SelectItem key={person.id} value={String(person.id)}>
                          {person.lastName} {person.firstName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Szerep</Label>
                {staffRoles.length === 0 ? (
                  <p className="rounded-lg bg-[#fdecec] px-3 py-2 text-sm text-[#d81c1c]">
                    Még nincs szerep. Előbb vedd fel az Új szerep gombbal.
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
                <Label htmlFor="totalDays">Éves szabadságkeret (nap)</Label>
                <Input
                  id="totalDays"
                  name="totalDays"
                  type="number"
                  min={0}
                  max={365}
                  step={1}
                  required
                  defaultValue={25}
                  className="h-12 bg-[#f4f5f7]"
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={
                    pending ||
                    jobTitles.length === 0 ||
                    departments.length === 0 ||
                    staffRoles.length === 0
                  }
                  className="h-12 hover:bg-[#477bf3]"
                >
                  {pending ? "Mentés…" : "Felvétel"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1 sm:max-w-[260px]">
            <span className="sr-only">Keresés név szerint</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#aaabc2]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Keresés név szerint…"
              className="h-10 bg-white pr-3 pl-9"
            />
          </label>
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilterOpen(true)}
              className="h-10 bg-white px-3 text-sm font-semibold"
            >
              <ListFilter className="size-4" />
              Szűrő
              {panelFilterCount > 0 ? (
                <span className="ml-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">
                  {panelFilterCount}
                </span>
              ) : null}
            </Button>
            <SheetContent side="right" className="w-full gap-0 bg-white p-0 sm:max-w-[360px]">
              <SheetHeader className="border-b border-[#eaeaf0] px-5 py-4">
                <SheetTitle className="text-lg font-semibold tracking-tight">Szűrők</SheetTitle>
                <SheetDescription>
                  Válassz szűrőt — a panel a választás után bezárul.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 px-5 py-5">
                <div className="grid gap-1.5">
                  <Label>Beosztás</Label>
                  <Select
                    value={jobTitleFilter}
                    onValueChange={(value) => applyFilter(setJobTitleFilter, value)}
                  >
                    <SelectTrigger className="h-10! w-full bg-[#f4f5f7]">
                      <SelectValue>
                        {jobTitleFilter === "all"
                          ? "Összes beosztás"
                          : jobTitles.find((title) => title.name === jobTitleFilter)?.name ??
                            "Összes beosztás"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Összes beosztás</SelectItem>
                      {jobTitles.map((title) => (
                        <SelectItem key={title.id} value={title.name}>
                          {title.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Részleg</Label>
                  <Select
                    value={departmentFilter}
                    onValueChange={(value) => applyFilter(setDepartmentFilter, value)}
                  >
                    <SelectTrigger className="h-10! w-full bg-[#f4f5f7]">
                      <SelectValue>
                        {departmentFilter === "all"
                          ? "Összes részleg"
                          : departments.find(
                              (department) => String(department.id) === departmentFilter,
                            )?.name ?? "Összes részleg"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Összes részleg</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={String(department.id)}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Szerep</Label>
                  <Select value={roleFilter} onValueChange={(value) => applyFilter(setRoleFilter, value)}>
                    <SelectTrigger className="h-10! w-full bg-[#f4f5f7]">
                      <SelectValue>
                        {roleFilter === "all"
                          ? "Összes szerep"
                          : staffRoles.find((role) => role.name === roleFilter)?.name ??
                            "Összes szerep"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Összes szerep</SelectItem>
                      {staffRoles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Felettes</Label>
                  <Select
                    value={managerFilter}
                    onValueChange={(value) => applyFilter(setManagerFilter, value)}
                  >
                    <SelectTrigger className="h-10! w-full bg-[#f4f5f7]">
                      <SelectValue>
                        {managerFilter === "all"
                          ? "Összes felettes"
                          : managerFilter === "none"
                            ? "Nincs felettese"
                            : (() => {
                                const manager = people.find(
                                  (person) => String(person.id) === managerFilter,
                                );
                                return manager
                                  ? `${manager.lastName} ${manager.firstName}`
                                  : "Összes felettes";
                              })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Összes felettes</SelectItem>
                      <SelectItem value="none">Nincs felettese</SelectItem>
                      {managerOptions.map((person) => (
                        <SelectItem key={person.id} value={String(person.id)}>
                          {person.lastName} {person.firstName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#eaeaf0] bg-[#f4f5f7] px-3 py-3 text-sm font-semibold text-[#555885]">
                  <input
                    type="checkbox"
                    checked={inactiveOnly}
                    onChange={(event) => {
                      setInactiveOnly(event.target.checked);
                      setFilterOpen(false);
                    }}
                    className="size-4 rounded border-[#d4d5e1] accent-primary"
                  />
                  Csak inaktívak
                </label>
              </div>
              <SheetFooter className="border-t border-[#eaeaf0] px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={panelFilterCount === 0}
                  onClick={clearPanelFilters}
                  className="h-11 w-full bg-white font-semibold"
                >
                  Szűrők törlése
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
        <div
          className="inline-flex rounded-lg border border-[#eaeaf0] bg-white p-1"
          role="group"
          aria-label="Nézet váltása"
        >
          <button
            type="button"
            onClick={() => setView("tree")}
            aria-pressed={view === "tree"}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors",
              view === "tree" ? "bg-[#e8effd] text-primary" : "text-[#555885] hover:bg-[#f4f5f7]",
            )}
          >
            <Network className="size-4" />
            Fa nézet
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors",
              view === "list" ? "bg-[#e8effd] text-primary" : "text-[#555885] hover:bg-[#f4f5f7]",
            )}
          >
            <List className="size-4" />
            Lista
          </button>
        </div>
      </div>

      {people.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#d4d5e1] px-4 py-8 text-center text-sm text-[#555885]">
          Ebben a szervezetben még nincs dolgozó.
        </p>
      ) : matchedPeople.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#d4d5e1] px-4 py-8 text-center text-sm text-[#555885]">
          Nincs a szűrésnek megfelelő dolgozó.
        </p>
      ) : view === "list" ? (
        <OrgPeopleList
          rows={matchedPeople}
          people={people}
          departments={departments}
          jobTitles={jobTitles}
          staffRoles={staffRoles}
        />
      ) : (
        <div className="grid gap-3">
          <p className="text-xs text-[#555885]">
            {hasFilters
              ? "A szűrés a találatokat és a felettesi láncot mutatja."
              : "A fogóponttal húzd a dolgozót. A kártya felső része: mellé, az alsó: alá. A legfelső szintre a lenti sávra dobhatod."}
          </p>
          <TreeLevel
            people={treePeople}
            directory={people}
            departments={departments}
            jobTitles={jobTitles}
            staffRoles={staffRoles}
            parentId={null}
            depth={0}
            openIds={openIds}
            onToggle={toggleGroup}
            draggingId={draggingId}
            dropTarget={dropTarget}
            onDragStart={setDraggingId}
            onDragEnd={() => {
              setDraggingId(null);
              setDropTarget(null);
              setRootDropActive(false);
            }}
            onDropTarget={setDropTarget}
            onDropPerson={handleDropPerson}
          />
          {!hasFilters ? (
            <div
              onDragOver={(event) => {
                if (draggingId === null) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setRootDropActive(true);
                setDropTarget(null);
              }}
              onDragLeave={() => setRootDropActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingId === null) return;
                moveEmployee(draggingId, null);
              }}
              className={cn(
                "rounded-xl border border-dashed px-4 py-5 text-center text-sm transition-colors",
                rootDropActive
                  ? "border-primary bg-[#e8effd] text-primary"
                  : "border-[#d4d5e1] text-[#555885]",
              )}
            >
              Ide dobva a dolgozó a legfelső szintre kerül (nincs felettese).
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
