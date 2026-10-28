import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSession } from "./session";
import {
  monthIndex,
  quarterIndex,
  todayIso,
  toIso,
  workdaysOf,
  yearOf,
} from "./dates";
import type { BalanceSnapshot, RequestRow, ShellData } from "./types";

const requestInclude = {
  leaveType: true,
  user: { include: { department: true } },
} as const;

type RequestRecord = {
  id: number;
  userId: number;
  startDate: Date;
  endDate: Date;
  workDays: number;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  leaveType: { name: string; deductsBalance: boolean };
  user: {
    firstName: string;
    lastName: string;
    initials: string;
    department: { name: string };
  };
};

function mapRequest(row: RequestRecord): RequestRow {
  return {
    id: row.id,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    workDays: row.workDays,
    typeName: row.leaveType.name,
    deductsBalance: row.leaveType.deductsBalance,
    status: row.status,
    note: row.note,
    personName: `${row.user.firstName} ${row.user.lastName}`,
    initials: row.user.initials,
    department: row.user.department.name,
    userId: row.userId,
  };
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { company: true, department: true },
  });

  if (!user) redirect("/login");
  return user;
}

export async function getSelectedCompanyId(fallback: number) {
  const jar = await cookies();
  const raw = Number(jar.get("virgo_company")?.value);
  if (!Number.isFinite(raw)) return fallback;
  const company = await prisma.company.findUnique({ where: { id: raw } });
  return company ? company.id : fallback;
}

export async function sumWorkDays(
  userId: number,
  year: number,
  status: "approved" | "pending",
  excludeId?: number,
) {
  const rows = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status,
      id: excludeId ? { not: excludeId } : undefined,
      leaveType: { deductsBalance: true },
      startDate: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
    select: { workDays: true },
  });

  return rows.reduce((sum, row) => sum + row.workDays, 0);
}

export async function getBalance(
  userId: number,
  year: number,
): Promise<BalanceSnapshot> {
  const balance = await prisma.leaveBalance.findUnique({
    where: { userId_year: { userId, year } },
  });
  const requests = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: "approved",
      leaveType: { deductsBalance: true },
      startDate: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
    select: { startDate: true, endDate: true },
  });

  const usedByQuarter: [number, number, number, number] = [0, 0, 0, 0];
  for (const request of requests) {
    for (const day of workdaysOf(toIso(request.startDate), toIso(request.endDate))) {
      if (yearOf(day) !== year) continue;
      usedByQuarter[quarterIndex(day)] += 1;
    }
  }

  const totalDays = balance?.totalDays ?? 0;
  const usedDays = usedByQuarter.reduce((sum, days) => sum + days, 0);
  const pendingDays = await sumWorkDays(userId, year, "pending");

  return {
    year,
    totalDays,
    usedDays,
    pendingDays,
    availableDays: Math.max(totalDays - usedDays, 0),
    quotas: [
      balance?.q1Quota ?? 0,
      balance?.q2Quota ?? 0,
      balance?.q3Quota ?? 0,
      balance?.q4Quota ?? 0,
    ],
    usedByQuarter,
  };
}

export async function getShell(): Promise<ShellData> {
  const user = await getCurrentUser();
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  const selectedCompanyId = await getSelectedCompanyId(user.companyId);
  const selected =
    companies.find((company) => company.id === selectedCompanyId) ?? companies[0];

  const pendingWhere = {
    status: "pending" as const,
    companyId: selected.id,
    user: { managerId: user.id },
  };
  const pendingCount = await prisma.leaveRequest.count({ where: pendingWhere });

  const hr = await prisma.user.findMany({
    where: { role: "hr" },
    orderBy: { firstName: "asc" },
  });

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      initials: user.initials,
      jobTitle: user.jobTitle,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    },
    companies: companies.map((company) => ({ id: company.id, name: company.name })),
    selectedCompanyId: selected.id,
    selectedCompanyName: selected.name,
    pendingApprovals: pendingCount,
    notifications: (
      await prisma.notification.findMany({
        where: { userId: user.id, readAt: null },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    ).map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      href: item.href,
    })),
    hrContacts: hr.map((person) => ({
      name: `${person.firstName} ${person.lastName}`,
      email: person.email,
    })),
  };
}

export async function getMyRequests(userId: number, status?: string) {
  const rows = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status:
        status === "pending" || status === "approved" || status === "rejected"
          ? status
          : undefined,
    },
    include: requestInclude,
    orderBy: { startDate: "desc" },
  });

  return rows.map(mapRequest);
}

export async function getLeaveTypes() {
  return prisma.leaveType.findMany({ orderBy: { id: "asc" } });
}

export async function getDashboard(userId: number, companyId: number) {
  const year = new Date().getFullYear();
  const today = todayIso();
  const balance = await getBalance(userId, year);
  const mine = await getMyRequests(userId);
  const pendingCount = mine.filter((row) => row.status === "pending").length;
  const upcoming = mine
    .filter(
      (row) =>
        (row.status === "approved" || row.status === "pending") &&
        row.endDate >= today,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  const team = await prisma.leaveRequest.findMany({
    where: {
      companyId,
      userId: { not: userId },
      status: { in: ["approved", "pending"] },
      endDate: { gte: new Date(`${today}T00:00:00.000Z`) },
    },
    include: requestInclude,
    orderBy: { startDate: "asc" },
  });

  return {
    year,
    today,
    balance,
    recent: mine.slice(0, 4),
    pendingCount,
    nextAbsence: upcoming ?? null,
    team: team.map(mapRequest).slice(0, 4),
    calendarEvents: await getCalendarEvents(companyId, userId, year),
  };
}

export async function getCalendarEvents(
  companyId: number,
  userId: number,
  year: number,
) {
  const rows = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ["approved", "pending"] },
      startDate: { lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) },
      endDate: { gte: new Date(`${year}-01-01T00:00:00.000Z`) },
      OR: [{ companyId }, { userId }],
    },
    include: requestInclude,
  });

  const events: {
    date: string;
    kind: "mine" | "team";
    name: string;
  }[] = [];

  for (const row of rows) {
    for (const date of workdaysOf(toIso(row.startDate), toIso(row.endDate))) {
      if (yearOf(date) !== year) continue;
      events.push({
        date,
        kind: row.userId === userId ? "mine" : "team",
        name: `${row.user.firstName} ${row.user.lastName}`,
      });
    }
  }

  return events;
}

export async function getTeam(
  companyId: number,
  managerId: number,
  ownCompanyId: number,
) {
  const year = new Date().getFullYear();
  const today = todayIso();
  const visible = await prisma.user.findMany({
    where:
      companyId === ownCompanyId
        ? {
            companyId,
            role: { in: ["employee", "manager"] },
            OR: [{ id: managerId }, { managerId }],
          }
        : { companyId, role: { in: ["employee", "manager"] } },
    include: { department: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const cards = [];
  for (const person of visible) {
    const balance = await getBalance(person.id, year);
    const next = await prisma.leaveRequest.findFirst({
      where: {
        userId: person.id,
        status: { in: ["approved", "pending"] },
        endDate: { gte: new Date(`${today}T00:00:00.000Z`) },
      },
      include: requestInclude,
      orderBy: { startDate: "asc" },
    });
    cards.push({
      id: person.id,
      name: `${person.firstName} ${person.lastName}`,
      initials: person.initials,
      department: person.department.name,
      jobTitle: person.jobTitle,
      isSelf: person.id === managerId,
      balance,
      next: next ? mapRequest(next) : null,
    });
  }

  return { year, people: cards };
}

export async function getApprovals(managerId: number, companyId: number) {
  const pending = await prisma.leaveRequest.findMany({
    where: { status: "pending", companyId, user: { managerId } },
    include: requestInclude,
    orderBy: { startDate: "asc" },
  });
  const history = await prisma.leaveRequest.findMany({
    where: {
      companyId,
      reviewerId: managerId,
      status: { in: ["approved", "rejected"] },
    },
    include: requestInclude,
    orderBy: { reviewedAt: "desc" },
    take: 8,
  });

  return {
    pending: pending.map(mapRequest),
    history: history.map(mapRequest),
  };
}

export async function getReport(companyId: number) {
  const year = new Date().getFullYear();
  const users = await prisma.user.findMany({
    where: { companyId, role: { in: ["employee", "manager"] } },
    include: { department: true },
  });
  const requests = await prisma.leaveRequest.findMany({
    where: {
      companyId,
      startDate: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
    include: { leaveType: true, user: { include: { department: true } } },
  });

  const departments = new Map<
    string,
    { name: string; people: number; approvedDays: number; pendingDays: number }
  >();

  for (const user of users) {
    const current = departments.get(user.department.name) ?? {
      name: user.department.name,
      people: 0,
      approvedDays: 0,
      pendingDays: 0,
    };
    current.people += 1;
    departments.set(user.department.name, current);
  }

  const types = new Map<string, { name: string; days: number; count: number }>();
  const months = Array.from({ length: 12 }, () => 0);

  for (const request of requests) {
    const type = types.get(request.leaveType.name) ?? {
      name: request.leaveType.name,
      days: 0,
      count: 0,
    };
    if (request.status !== "rejected") {
      type.days += request.workDays;
      type.count += 1;
    }
    types.set(request.leaveType.name, type);

    if (request.status === "rejected") continue;
    const bucket = departments.get(request.user.department.name);
    if (bucket) {
      if (request.status === "approved") bucket.approvedDays += request.workDays;
      if (request.status === "pending") bucket.pendingDays += request.workDays;
    }

    if (request.status === "approved" && request.leaveType.deductsBalance) {
      for (const day of workdaysOf(toIso(request.startDate), toIso(request.endDate))) {
        if (yearOf(day) === year) months[monthIndex(day)] += 1;
      }
    }
  }

  const approvedDays = months.reduce((sum, days) => sum + days, 0);
  const pendingDays = requests
    .filter((request) => request.status === "pending")
    .reduce((sum, request) => sum + request.workDays, 0);

  return {
    year,
    headcount: users.length,
    approvedDays,
    pendingDays,
    departments: [...departments.values()],
    types: [...types.values()].sort((a, b) => b.days - a.days),
    months,
  };
}

export async function markNotificationsRead(userId: number, href: string) {
  await prisma.notification.updateMany({
    where: { userId, href, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function getOrg(companyId: number) {
  const [people, departments, jobTitles] = await Promise.all([
    prisma.user.findMany({
      where: { companyId, role: { not: "admin" } },
      include: { department: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.jobTitle.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    people: people.map((person) => ({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      jobTitle: person.jobTitle,
      role: person.role,
      departmentId: person.departmentId,
      department: person.department.name,
      managerId: person.managerId,
    })),
    departments: departments.map((department) => ({
      id: department.id,
      name: department.name,
    })),
    jobTitles: jobTitles.map((title) => ({
      id: title.id,
      name: title.name,
    })),
  };
}
