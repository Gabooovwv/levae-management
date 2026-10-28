"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { createEmployee, createJobTitle, setEmployeeManager, updateEmployee } from "@/app/actions";
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
import { cn } from "@/lib/utils";

export type OrgPerson = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  role: string;
  departmentId: number;
  department: string;
  managerId: number | null;
};

const roleLabel: Record<string, string> = {
  employee: "Munkavállaló",
  manager: "Vezető",
  hr: "HR",
};

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

function TreeLevel({
  people,
  departments,
  jobTitles,
  parentId,
  depth,
  openIds,
  onToggle,
}: {
  people: OrgPerson[];
  departments: { id: number; name: string }[];
  jobTitles: { id: number; name: string }[];
  parentId: number | null;
  depth: number;
  openIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  const ids = new Set(people.map((person) => person.id));
  const nodes = people.filter((person) =>
    parentId === null ? person.managerId === null || !ids.has(person.managerId) : person.managerId === parentId,
  );
  if (nodes.length === 0) return null;

  return (
    <ul className={depth === 0 ? "grid gap-3" : "mt-3 grid gap-3 border-l border-[#d4d5e1] pl-4"}>
      {nodes.map((person) => {
        const reports = directReports(people, person.id);
        const hasGroup = reports.length > 0;
        const expanded = openIds.has(person.id);

        return (
          <li key={person.id}>
            <PersonCard
              person={person}
              people={people}
              departments={departments}
              jobTitles={jobTitles}
              reportCount={reports.length}
              expanded={expanded}
              onToggle={hasGroup ? () => onToggle(person.id) : undefined}
            />
            {hasGroup && expanded ? (
              <TreeLevel
                people={people}
                departments={departments}
                jobTitles={jobTitles}
                parentId={person.id}
                depth={depth + 1}
                openIds={openIds}
                onToggle={onToggle}
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
  reportCount,
  expanded,
  onToggle,
}: {
  person: OrgPerson;
  people: OrgPerson[];
  departments: { id: number; name: string }[];
  jobTitles: { id: number; name: string }[];
  reportCount: number;
  expanded: boolean;
  onToggle?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const matchedTitle =
    jobTitles.find((title) => title.name === person.jobTitle) ?? jobTitles[0];
  const [departmentId, setDepartmentId] = useState(String(person.departmentId));
  const [jobTitleId, setJobTitleId] = useState(String(matchedTitle?.id ?? ""));
  const [managerId, setManagerId] = useState(String(person.managerId ?? 0));
  const [role, setRole] = useState(person.role === "manager" || person.role === "hr" ? person.role : "employee");
  const blocked = descendants(people, person.id);
  const options = people.filter((candidate) => candidate.id !== person.id && !blocked.has(candidate.id));
  const manager = person.managerId ? people.find((candidate) => candidate.id === person.managerId) : null;

  function openEditor() {
    setDepartmentId(String(person.departmentId));
    setJobTitleId(String((jobTitles.find((title) => title.name === person.jobTitle) ?? jobTitles[0])?.id ?? ""));
    setManagerId(String(person.managerId ?? 0));
    setRole(person.role === "manager" || person.role === "hr" ? person.role : "employee");
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

  return (
    <div className="rounded-xl border border-[#eaeaf0] bg-white px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-2">
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
              <p className="truncate font-semibold">
                {person.lastName} {person.firstName}
              </p>
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
              <DialogTitle className="text-xl font-semibold tracking-tight">Dolgozó szerkesztése</DialogTitle>
              <DialogDescription>
                A módosítások azonnal érvényesek a szervezeti fában és a jóváhagyási láncban.
              </DialogDescription>
            </DialogHeader>
            <form action={onSubmit} className="grid gap-3">
              <input type="hidden" name="userId" value={person.id} />
              <input type="hidden" name="departmentId" value={departmentId} />
              <input type="hidden" name="jobTitleId" value={jobTitleId} />
              <input type="hidden" name="managerId" value={managerId} />
              <input type="hidden" name="role" value={role} />
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
                            const selected = people.find((candidate) => String(candidate.id) === managerId);
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
                <Select value={role} onValueChange={(value) => value && setRole(value)}>
                  <SelectTrigger className="h-10! w-full">
                    <SelectValue>{roleLabel[role]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Munkavállaló</SelectItem>
                    <SelectItem value="manager">Vezető</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={pending || jobTitles.length === 0}
                  className="h-12 hover:bg-[#477bf3]"
                >
                  {pending ? "Mentés…" : "Mentés"}
                </Button>
              </DialogFooter>
            </form>
                </DialogContent>
              </Dialog>
              {reportCount > 0 ? (
                <span className="text-xs font-medium text-[#aaabc2]">{reportCount} beosztott</span>
              ) : null}
            </div>
            <p className="truncate text-sm text-[#555885]">
              {person.jobTitle} · {person.department} · {roleLabel[person.role] ?? person.role}
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

export function OrgTree({
  people,
  departments,
  jobTitles,
  companyId,
}: {
  people: OrgPerson[];
  departments: { id: number; name: string }[];
  jobTitles: { id: number; name: string }[];
  companyId: number;
}) {
  const [open, setOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [departmentId, setDepartmentId] = useState(String(departments[0]?.id ?? ""));
  const [jobTitleId, setJobTitleId] = useState(String(jobTitles[0]?.id ?? ""));
  const [managerId, setManagerId] = useState("0");
  const [role, setRole] = useState("employee");
  const [openIds, setOpenIds] = useState(() => {
    const withReports = people.filter((person) => people.some((other) => other.managerId === person.id));
    return new Set(withReports.map((person) => person.id));
  });

  function toggleGroup(id: number) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createEmployee(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setManagerId("0");
        setRole("employee");
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

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-end gap-2">
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
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {jobTitles.map((title) => (
                      <li
                        key={title.id}
                        className="rounded-full border border-[#d4d5e1] bg-white px-2.5 py-0.5 text-xs text-[#555885]"
                      >
                        {title.name}
                      </li>
                    ))}
                  </ul>
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
              <input type="hidden" name="managerId" value={managerId} />
              <input type="hidden" name="role" value={role} />
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
                            const manager = people.find((person) => String(person.id) === managerId);
                            return manager ? `${manager.lastName} ${manager.firstName}` : "Nincs felettese";
                          })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nincs felettese</SelectItem>
                    {people.map((person) => (
                      <SelectItem key={person.id} value={String(person.id)}>
                        {person.lastName} {person.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Szerep</Label>
                <Select value={role} onValueChange={(value) => value && setRole(value)}>
                  <SelectTrigger className="h-10! w-full">
                    <SelectValue>{roleLabel[role]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Munkavállaló</SelectItem>
                    <SelectItem value="manager">Vezető</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={pending || jobTitles.length === 0}
                  className="h-12 hover:bg-[#477bf3]"
                >
                  {pending ? "Mentés…" : "Felvétel"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {people.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#d4d5e1] px-4 py-8 text-center text-sm text-[#555885]">
          Ebben a szervezetben még nincs dolgozó.
        </p>
      ) : (
        <TreeLevel
          people={people}
          departments={departments}
          jobTitles={jobTitles}
          parentId={null}
          depth={0}
          openIds={openIds}
          onToggle={toggleGroup}
        />
      )}
    </div>
  );
}
