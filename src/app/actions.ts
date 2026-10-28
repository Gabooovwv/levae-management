"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { countWorkdays, toIso, yearOf } from "@/lib/dates";
import { getCurrentUser, sumWorkDays } from "@/lib/data";
import { inactiveReasonLabel, isInactiveReason } from "@/lib/inactive-reasons";

export type ActionResult = { ok: boolean; message: string };

function refresh() {
  revalidatePath("/", "layout");
}

export async function setCompany(companyId: number): Promise<ActionResult> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return { ok: false, message: "Ismeretlen szervezet." };

  const jar = await cookies();
  jar.set("virgo_company", String(company.id), { path: "/", sameSite: "lax" });
  refresh();
  return { ok: true, message: `Kiválasztott szervezet: ${company.name}` };
}

export async function createLeaveRequest(formData: FormData): Promise<ActionResult> {
  const leaveTypeId = Number(formData.get("leaveTypeId"));
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const noteRaw = String(formData.get("note") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return { ok: false, message: "Add meg a kezdő- és az utolsó napot." };
  }
  if (endDate < startDate) {
    return { ok: false, message: "Az utolsó nap nem lehet a kezdőnap előtt." };
  }

  const workDays = countWorkdays(startDate, endDate);
  if (workDays < 1) {
    return { ok: false, message: "A kijelölt időszakban nincs munkanap." };
  }

  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveType) return { ok: false, message: "Ismeretlen szabadságjogcím." };

  const user = await getCurrentUser();
  if (user.role === "admin") {
    return { ok: false, message: "Adminisztrátorként nem lehet szabadságot igényelni." };
  }
  const manager = user.managerId
    ? await prisma.user.findUnique({ where: { id: user.managerId } })
    : null;
  if (!manager) {
    return {
      ok: false,
      message: "Nincs felettesed a szervezeti fában, ezért a kérelmet senki nem tudja elbírálni.",
    };
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      userId: user.id,
      status: { in: ["pending", "approved"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) {
    return { ok: false, message: "Erre az időszakra már van rögzített igényed." };
  }

  if (leaveType.deductsBalance) {
    const year = yearOf(startDate);
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_year: { userId: user.id, year } },
    });
    const approved = await sumWorkDays(user.id, year, "approved");
    const pending = await sumWorkDays(user.id, year, "pending");
    const total = balance?.totalDays ?? 0;
    if (approved + pending + workDays > total) {
      const left = Math.max(total - approved - pending, 0);
      return {
        ok: false,
        message: `Nincs elég szabad keret. Még ${left} nap igényelhető.`,
      };
    }
  }

  const created = await prisma.leaveRequest.create({
    data: {
      userId: user.id,
      companyId: user.companyId,
      leaveTypeId: leaveType.id,
      startDate: start,
      endDate: end,
      workDays,
      note: noteRaw || null,
      status: "pending",
    },
  });

  const span = startDate === endDate ? startDate : `${startDate} – ${endDate}`;
  await prisma.notification.create({
    data: {
      userId: manager.id,
      requestId: created.id,
      title: `${user.lastName} ${user.firstName}`,
      detail: `${span} · ${workDays} nap jóváhagyásra vár`,
      href: "/jovahagyasok",
    },
  });

  refresh();
  return {
    ok: true,
    message: `Az igényt elküldtük ${manager.lastName} ${manager.firstName} részére. Ő tudja elfogadni vagy elutasítani.`,
  };
}

export async function reviewLeaveRequest(
  requestId: number,
  status: "approved" | "rejected",
): Promise<ActionResult> {
  const reviewer = await getCurrentUser();
  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: { user: true, leaveType: true },
  });

  if (!request || request.status !== "pending") {
    return { ok: false, message: "Ez az igény már nem függőben van." };
  }
  if (request.user.managerId !== reviewer.id) {
    return { ok: false, message: "Ezt az igényt nem hagyhatod jóvá." };
  }

  if (status === "approved" && request.leaveType.deductsBalance) {
    const year = request.startDate.getUTCFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_year: { userId: request.userId, year } },
    });
    const approved = await sumWorkDays(request.userId, year, "approved");
    const total = balance?.totalDays ?? 0;
    if (approved + request.workDays > total) {
      return {
        ok: false,
        message: "A jóváhagyás túllépné a munkavállaló éves keretét.",
      };
    }
  }

  await prisma.leaveRequest.update({
    where: { id: request.id },
    data: {
      status,
      reviewerId: reviewer.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.notification.updateMany({
    where: { requestId: request.id, readAt: null },
    data: { readAt: new Date() },
  });

  const start = toIso(request.startDate);
  const end = toIso(request.endDate);
  const span = start === end ? start : `${start} – ${end}`;
  await prisma.notification.create({
    data: {
      userId: request.userId,
      requestId: request.id,
      title: status === "approved" ? "A felettesed jóváhagyta a kérelmed" : "A felettesed elutasította a kérelmed",
      detail: `${span} · ${reviewer.lastName} ${reviewer.firstName}`,
      href: "/szabadsagaim",
    },
  });

  refresh();
  return {
    ok: true,
    message: status === "approved" ? "Az igényt jóváhagytad." : "Az igényt elutasítottad.",
  };
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") return null;
  return user;
}

function initialsOf(lastName: string, firstName: string) {
  const last = lastName.trim().charAt(0);
  const first = firstName.trim().charAt(0);
  return `${last}${first}`.toLocaleUpperCase("hu-HU").slice(0, 4);
}

function distributeQuotas(totalDays: number) {
  const base = Math.floor(totalDays / 4);
  const rem = totalDays % 4;
  return {
    q1Quota: base + (rem > 0 ? 1 : 0),
    q2Quota: base + (rem > 1 ? 1 : 0),
    q3Quota: base + (rem > 2 ? 1 : 0),
    q4Quota: base,
  };
}

function parseTotalLeaveDays(formData: FormData): number | ActionResult {
  const raw = Number(formData.get("totalDays"));
  if (!Number.isInteger(raw) || raw < 0 || raw > 365) {
    return { ok: false, message: "Az éves szabadságkeret 0 és 365 közötti egész szám legyen." };
  }
  return raw;
}

async function managerCreatesCycle(userId: number, managerId: number) {
  let current: number | null = managerId;
  const seen = new Set<number>();
  while (current) {
    if (current === userId || seen.has(current)) return true;
    seen.add(current);
    const row: { managerId: number | null } | null = await prisma.user.findUnique({
      where: { id: current },
      select: { managerId: true },
    });
    current = row?.managerId ?? null;
  }
  return false;
}

export async function createEmployee(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin vehet fel dolgozót." };

  const lastName = String(formData.get("lastName") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const jobTitleId = Number(formData.get("jobTitleId"));
  const staffRoleId = Number(formData.get("staffRoleId"));
  const companyId = Number(formData.get("companyId"));
  const departmentId = Number(formData.get("departmentId"));
  const managerRaw = String(formData.get("managerId") ?? "");
  const managerId = managerRaw && managerRaw !== "0" ? Number(managerRaw) : null;
  const totalDaysParsed = parseTotalLeaveDays(formData);
  if (typeof totalDaysParsed !== "number") return totalDaysParsed;

  if (!lastName || !firstName) {
    return { ok: false, message: "Add meg a nevet." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Érvényes e-mail cím kell a belépéshez." };
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  const jobTitle = await prisma.jobTitle.findUnique({ where: { id: jobTitleId } });
  const staffRole = await prisma.staffRole.findUnique({ where: { id: staffRoleId } });
  if (!company || !department) return { ok: false, message: "Ismeretlen szervezet vagy részleg." };
  if (!jobTitle) return { ok: false, message: "Válassz beosztást a listából." };
  if (!staffRole || staffRole.kind === "admin") {
    return { ok: false, message: "Válassz szerepet a listából." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, message: "Ez az e-mail cím már foglalt." };

  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || manager.role === "admin" || manager.companyId !== companyId) {
      return { ok: false, message: "A felettes ugyanahhoz a szervezethez tartozzon." };
    }
    if (!manager.active) {
      return { ok: false, message: "Passzív dolgozó alá nem rendelhető beosztott." };
    }
  }

  const year = new Date().getFullYear();
  const quotas = distributeQuotas(totalDaysParsed);
  await prisma.user.create({
    data: {
      lastName,
      firstName,
      email,
      role: staffRole.kind,
      roleTitle: staffRole.name,
      jobTitle: jobTitle.name,
      initials: initialsOf(lastName, firstName),
      companyId,
      departmentId,
      managerId,
      balances: {
        create: {
          year,
          totalDays: totalDaysParsed,
          ...quotas,
        },
      },
    },
  });

  refresh();
  return { ok: true, message: `${lastName} ${firstName} bekerült a szervezeti fába.` };
}

export async function updateEmployee(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin szerkeszthet dolgozót." };

  const userId = Number(formData.get("userId"));
  const lastName = String(formData.get("lastName") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const jobTitleId = Number(formData.get("jobTitleId"));
  const staffRoleId = Number(formData.get("staffRoleId"));
  const departmentId = Number(formData.get("departmentId"));
  const managerRaw = String(formData.get("managerId") ?? "");
  const managerId = managerRaw && managerRaw !== "0" ? Number(managerRaw) : null;
  const totalDaysParsed = parseTotalLeaveDays(formData);
  if (typeof totalDaysParsed !== "number") return totalDaysParsed;

  const person = await prisma.user.findUnique({ where: { id: userId } });
  if (!person || person.role === "admin") {
    return { ok: false, message: "Ez a dolgozó nem szerkeszthető." };
  }

  if (!lastName || !firstName) {
    return { ok: false, message: "Add meg a nevet." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Érvényes e-mail cím kell a belépéshez." };
  }

  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  const jobTitle = await prisma.jobTitle.findUnique({ where: { id: jobTitleId } });
  const staffRole = await prisma.staffRole.findUnique({ where: { id: staffRoleId } });
  if (!department) return { ok: false, message: "Ismeretlen részleg." };
  if (!jobTitle) return { ok: false, message: "Válassz beosztást a listából." };
  if (!staffRole || staffRole.kind === "admin") {
    return { ok: false, message: "Válassz szerepet a listából." };
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email, id: { not: person.id } },
  });
  if (emailTaken) return { ok: false, message: "Ez az e-mail cím már foglalt." };

  if (managerId === person.id) {
    return { ok: false, message: "A dolgozó nem lehet a saját felettese." };
  }

  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || manager.role === "admin" || manager.companyId !== person.companyId) {
      return { ok: false, message: "A felettes ugyanahhoz a szervezethez tartozzon." };
    }
    if (!manager.active) {
      return { ok: false, message: "Passzív dolgozó alá nem rendelhető beosztott." };
    }
    if (await managerCreatesCycle(person.id, managerId)) {
      return { ok: false, message: "Ez a beállítás kört hozna létre a fában." };
    }
  }

  const year = new Date().getFullYear();
  const quotas = distributeQuotas(totalDaysParsed);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: person.id },
      data: {
        lastName,
        firstName,
        email,
        role: staffRole.kind,
        roleTitle: staffRole.name,
        jobTitle: jobTitle.name,
        initials: initialsOf(lastName, firstName),
        departmentId,
        managerId,
      },
    });

    await tx.leaveBalance.upsert({
      where: { userId_year: { userId: person.id, year } },
      create: {
        userId: person.id,
        year,
        totalDays: totalDaysParsed,
        ...quotas,
      },
      update: {
        totalDays: totalDaysParsed,
        ...quotas,
      },
    });
  });

  refresh();
  return { ok: true, message: `${lastName} ${firstName} adatai frissültek.` };
}

export async function updateEmployeeLeaveDays(
  userId: number,
  totalDays: number,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin módosíthatja a szabadságkeretet." };

  if (!Number.isInteger(totalDays) || totalDays < 0 || totalDays > 365) {
    return { ok: false, message: "Az éves szabadságkeret 0 és 365 közötti egész szám legyen." };
  }

  const person = await prisma.user.findUnique({ where: { id: userId } });
  if (!person || person.role === "admin") {
    return { ok: false, message: "Ehhez a dolgozóhoz nem állítható be szabadságkeret." };
  }

  const year = new Date().getFullYear();
  const quotas = distributeQuotas(totalDays);

  await prisma.leaveBalance.upsert({
    where: { userId_year: { userId: person.id, year } },
    create: {
      userId: person.id,
      year,
      totalDays,
      ...quotas,
    },
    update: {
      totalDays,
      ...quotas,
    },
  });

  const usedDays = await sumWorkDays(person.id, year, "approved");
  const availableDays = Math.max(totalDays - usedDays, 0);

  refresh();
  return {
    ok: true,
    message: `${person.lastName} ${person.firstName}: ${totalDays}/${availableDays} (összes / kiadható).`,
  };
}

export async function deactivateEmployee(
  userId: number,
  reason: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin teheti passzívvá a dolgozót." };

  if (!isInactiveReason(reason)) {
    return { ok: false, message: "Válassz érvényes passzív okot." };
  }

  const person = await prisma.user.findUnique({ where: { id: userId } });
  if (!person || person.role === "admin") {
    return { ok: false, message: "Ez a dolgozó nem tehető passzívvá." };
  }
  if (!person.active) {
    return { ok: false, message: "A dolgozó már passzív." };
  }

  const reportCount = await prisma.user.count({ where: { managerId: person.id } });
  const nextManagerId = person.managerId;

  await prisma.$transaction(async (tx) => {
    if (reportCount > 0) {
      await tx.user.updateMany({
        where: { managerId: person.id },
        data: { managerId: nextManagerId },
      });
    }
    await tx.user.update({
      where: { id: person.id },
      data: {
        active: false,
        inactiveReason: reason,
        inactiveAt: new Date(),
      },
    });
  });

  refresh();
  const name = `${person.lastName} ${person.firstName}`;
  const reasonLabel = inactiveReasonLabel(reason);
  if (reportCount > 0) {
    return {
      ok: true,
      message: nextManagerId
        ? `${name} passzív (${reasonLabel}). ${reportCount} beosztott a feletteséhez került.`
        : `${name} passzív (${reasonLabel}). ${reportCount} beosztottnak most nincs felettese.`,
    };
  }
  return { ok: true, message: `${name} passzív státuszba került (${reasonLabel}).` };
}

export async function reactivateEmployee(userId: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin aktiválhatja újra a dolgozót." };

  const person = await prisma.user.findUnique({ where: { id: userId } });
  if (!person || person.role === "admin") {
    return { ok: false, message: "Ez a dolgozó nem aktiválható." };
  }
  if (person.active) {
    return { ok: false, message: "A dolgozó már aktív." };
  }

  await prisma.user.update({
    where: { id: person.id },
    data: {
      active: true,
      inactiveReason: null,
      inactiveAt: null,
    },
  });

  refresh();
  return {
    ok: true,
    message: `${person.lastName} ${person.firstName} újra aktív. Ismét rendelhető alá beosztott.`,
  };
}

export async function deleteEmployee(userId: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin törölhet dolgozót." };

  const person = await prisma.user.findUnique({ where: { id: userId } });
  if (!person || person.role === "admin") {
    return { ok: false, message: "Ez a dolgozó nem törölhető." };
  }

  const reportCount = await prisma.user.count({ where: { managerId: person.id } });
  const nextManagerId = person.managerId;

  await prisma.$transaction(async (tx) => {
    if (reportCount > 0) {
      await tx.user.updateMany({
        where: { managerId: person.id },
        data: { managerId: nextManagerId },
      });
    }

    await tx.leaveRequest.updateMany({
      where: { reviewerId: person.id },
      data: { reviewerId: null },
    });

    const requests = await tx.leaveRequest.findMany({
      where: { userId: person.id },
      select: { id: true },
    });
    const requestIds = requests.map((request) => request.id);

    await tx.notification.deleteMany({
      where: {
        OR: [
          { userId: person.id },
          ...(requestIds.length > 0 ? [{ requestId: { in: requestIds } }] : []),
        ],
      },
    });

    await tx.leaveRequest.deleteMany({ where: { userId: person.id } });
    await tx.leaveBalance.deleteMany({ where: { userId: person.id } });
    await tx.user.delete({ where: { id: person.id } });
  });

  refresh();

  const name = `${person.lastName} ${person.firstName}`;
  if (reportCount > 0) {
    return {
      ok: true,
      message: nextManagerId
        ? `${name} törölve. ${reportCount} beosztott a feletteséhez került.`
        : `${name} törölve. ${reportCount} beosztottnak most nincs felettese.`,
    };
  }
  return { ok: true, message: `${name} törölve.` };
}

export async function setEmployeeManager(userId: number, managerId: number | null): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin módosíthatja a felettest." };

  const person = await prisma.user.findUnique({ where: { id: userId } });
  if (!person || person.role === "admin") {
    return { ok: false, message: "Ez a dolgozó nem helyezhető át." };
  }

  if (managerId === person.id) {
    return { ok: false, message: "A dolgozó nem lehet a saját felettese." };
  }

  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || manager.role === "admin" || manager.companyId !== person.companyId) {
      return { ok: false, message: "A felettes ugyanahhoz a szervezethez tartozzon." };
    }
    if (!manager.active) {
      return { ok: false, message: "Passzív dolgozó alá nem rendelhető beosztott." };
    }
    if (await managerCreatesCycle(person.id, managerId)) {
      return { ok: false, message: "Ez a beállítás kört hozna létre a fában." };
    }
  }

  await prisma.user.update({
    where: { id: person.id },
    data: { managerId },
  });

  refresh();
  return {
    ok: true,
    message: managerId ? "A felettes frissült." : "A dolgozónak most nincs felettese.",
  };
}

export async function createJobTitle(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin vehet fel beosztást." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Add meg a beosztás nevét." };
  if (name.length > 120) return { ok: false, message: "A beosztás neve túl hosszú." };

  const existing = await prisma.jobTitle.findFirst({
    where: { name },
  });
  if (existing) return { ok: false, message: "Ez a beosztás már létezik." };

  await prisma.jobTitle.create({ data: { name } });
  refresh();
  return { ok: true, message: `A(z) ${name} beosztás felkerült a listára.` };
}

export async function createDepartment(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin vehet fel részleget." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Add meg a részleg nevét." };
  if (name.length > 120) return { ok: false, message: "A részleg neve túl hosszú." };

  const existing = await prisma.department.findFirst({ where: { name } });
  if (existing) return { ok: false, message: "Ez a részleg már létezik." };

  await prisma.department.create({ data: { name } });
  refresh();
  return { ok: true, message: `A(z) ${name} részleg felkerült a listára.` };
}

export async function createStaffRole(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin vehet fel szerepet." };

  const name = String(formData.get("name") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "employee");
  const kind = kindRaw === "manager" || kindRaw === "hr" ? kindRaw : "employee";

  if (!name) return { ok: false, message: "Add meg a szerep nevét." };
  if (name.length > 120) return { ok: false, message: "A szerep neve túl hosszú." };

  const existing = await prisma.staffRole.findFirst({ where: { name } });
  if (existing) return { ok: false, message: "Ez a szerep már létezik." };

  await prisma.staffRole.create({ data: { name, kind } });
  refresh();
  return { ok: true, message: `A(z) ${name} szerep felkerült a listára.` };
}

export async function deleteJobTitle(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin törölhet beosztást." };

  const title = await prisma.jobTitle.findUnique({ where: { id } });
  if (!title) return { ok: false, message: "A beosztás nem található." };

  const inUse = await prisma.user.count({ where: { jobTitle: title.name } });
  if (inUse > 0) {
    return {
      ok: false,
      message: `A(z) ${title.name} beosztás nem törölhető, mert ${inUse} dolgozóhoz van rendelve.`,
    };
  }

  await prisma.jobTitle.delete({ where: { id } });
  refresh();
  return { ok: true, message: `A(z) ${title.name} beosztás törölve.` };
}

export async function deleteDepartment(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin törölhet részleget." };

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) return { ok: false, message: "A részleg nem található." };

  const inUse = await prisma.user.count({ where: { departmentId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      message: `A(z) ${department.name} részleg nem törölhető, mert ${inUse} dolgozóhoz van rendelve.`,
    };
  }

  await prisma.department.delete({ where: { id } });
  refresh();
  return { ok: true, message: `A(z) ${department.name} részleg törölve.` };
}

export async function deleteStaffRole(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Csak az admin törölhet szerepet." };

  const role = await prisma.staffRole.findUnique({ where: { id } });
  if (!role) return { ok: false, message: "A szerep nem található." };

  const inUse = await prisma.user.count({ where: { roleTitle: role.name } });
  if (inUse > 0) {
    return {
      ok: false,
      message: `A(z) ${role.name} szerep nem törölhető, mert ${inUse} dolgozóhoz van rendelve.`,
    };
  }

  await prisma.staffRole.delete({ where: { id } });
  refresh();
  return { ok: true, message: `A(z) ${role.name} szerep törölve.` };
}
