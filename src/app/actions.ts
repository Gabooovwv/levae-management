"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { countWorkdays, toIso, yearOf } from "@/lib/dates";
import { getCurrentUser, sumWorkDays } from "@/lib/data";

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
  const companyId = Number(formData.get("companyId"));
  const departmentId = Number(formData.get("departmentId"));
  const managerRaw = String(formData.get("managerId") ?? "");
  const managerId = managerRaw && managerRaw !== "0" ? Number(managerRaw) : null;
  const roleRaw = String(formData.get("role") ?? "employee");
  const role = roleRaw === "manager" || roleRaw === "hr" ? roleRaw : "employee";

  if (!lastName || !firstName) {
    return { ok: false, message: "Add meg a nevet." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Érvényes e-mail cím kell a belépéshez." };
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  const jobTitle = await prisma.jobTitle.findUnique({ where: { id: jobTitleId } });
  if (!company || !department) return { ok: false, message: "Ismeretlen szervezet vagy részleg." };
  if (!jobTitle) return { ok: false, message: "Válassz beosztást a listából." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, message: "Ez az e-mail cím már foglalt." };

  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || manager.role === "admin" || manager.companyId !== companyId) {
      return { ok: false, message: "A felettes ugyanahhoz a szervezethez tartozzon." };
    }
  }

  const year = new Date().getFullYear();
  await prisma.user.create({
    data: {
      lastName,
      firstName,
      email,
      role,
      jobTitle: jobTitle.name,
      initials: initialsOf(lastName, firstName),
      companyId,
      departmentId,
      managerId,
      balances: {
        create: {
          year,
          totalDays: 25,
          q1Quota: 6,
          q2Quota: 7,
          q3Quota: 6,
          q4Quota: 6,
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
  const departmentId = Number(formData.get("departmentId"));
  const managerRaw = String(formData.get("managerId") ?? "");
  const managerId = managerRaw && managerRaw !== "0" ? Number(managerRaw) : null;
  const roleRaw = String(formData.get("role") ?? "employee");
  const role = roleRaw === "manager" || roleRaw === "hr" ? roleRaw : "employee";

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
  if (!department) return { ok: false, message: "Ismeretlen részleg." };
  if (!jobTitle) return { ok: false, message: "Válassz beosztást a listából." };

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
    if (await managerCreatesCycle(person.id, managerId)) {
      return { ok: false, message: "Ez a beállítás kört hozna létre a fában." };
    }
  }

  await prisma.user.update({
    where: { id: person.id },
    data: {
      lastName,
      firstName,
      email,
      role,
      jobTitle: jobTitle.name,
      initials: initialsOf(lastName, firstName),
      departmentId,
      managerId,
    },
  });

  refresh();
  return { ok: true, message: `${lastName} ${firstName} adatai frissültek.` };
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
