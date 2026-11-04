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
import { loadWorkdayRules, loadWorkdayRulesForYear } from "./work-calendar";

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
  halfDay: boolean;
  note: string | null;
  reviewNote?: string | null;
  reviewedAt?: Date | null;
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
    halfDay: row.halfDay,
    typeName: row.leaveType.name,
    deductsBalance: row.leaveType.deductsBalance,
    status: row.status,
    note: row.note,
    reviewNote: row.reviewNote ?? null,
    reviewedAt: row.reviewedAt ? toIso(row.reviewedAt) : null,
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

  if (!user) redirect("/api/auth/logout");
  if (!user.active) redirect("/api/auth/logout");
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
    select: { startDate: true, endDate: true, workDays: true },
  });

  const rules = await loadWorkdayRulesForYear(year);
  const usedByQuarter: [number, number, number, number] = [0, 0, 0, 0];
  let usedDays = 0;
  for (const request of requests) {
    usedDays += request.workDays;
    const days = workdaysOf(toIso(request.startDate), toIso(request.endDate), rules).filter(
      (day) => yearOf(day) === year,
    );
    if (days.length === 0) continue;
    const perDay = request.workDays / days.length;
    for (const day of days) {
      usedByQuarter[quarterIndex(day)] += perDay;
    }
  }

  const totalDays = balance?.totalDays ?? 0;
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

  const [pendingCount, directReportCount, unreadNotifications, notifications] =
    await Promise.all([
      prisma.leaveRequest.count({
        where: {
          status: "pending",
          user: { managerId: user.id, role: { not: "admin" } },
        },
      }),
      prisma.user.count({
        where: { managerId: user.id, role: { not: "admin" }, active: true },
      }),
      prisma.notification.count({
        where: { userId: user.id, readAt: null },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

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
    hasDirectReports: user.role !== "admin" && directReportCount > 0,
    unreadNotifications,
    notifications: notifications.map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      href: item.href,
      read: item.readAt !== null,
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
      status: { in: ["approved", "pending"] },
      endDate: { gte: new Date(`${today}T00:00:00.000Z`) },
      user: { managerId: userId },
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

export type CalendarEvent = {
  date: string;
  kind: "mine" | "team";
  name: string;
  status: "pending" | "approved";
  typeName: string;
  halfDay: boolean;
  requestId: number;
  startDate: string;
  endDate: string;
};

/** Saját + (ha van) közvetlen beosztottak / azonos felettesű kollégák távollétei. */
export async function getCalendarEvents(
  _companyId: number,
  userId: number,
  year: number,
): Promise<CalendarEvent[]> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, managerId: true },
  });
  if (!me) return [];

  const reportIds = (
    await prisma.user.findMany({
      where: { managerId: userId, role: { not: "admin" }, active: true },
      select: { id: true },
    })
  ).map((row) => row.id);

  const peerIds =
    me.managerId != null
      ? (
          await prisma.user.findMany({
            where: {
              managerId: me.managerId,
              id: { not: userId },
              role: { not: "admin" },
              active: true,
            },
            select: { id: true },
          })
        ).map((row) => row.id)
      : [];

  const visibleIds = [...new Set([userId, ...reportIds, ...peerIds])];

  const rows = await prisma.leaveRequest.findMany({
    where: {
      userId: { in: visibleIds },
      status: { in: ["approved", "pending"] },
      startDate: { lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) },
      endDate: { gte: new Date(`${year}-01-01T00:00:00.000Z`) },
    },
    include: requestInclude,
    orderBy: { startDate: "asc" },
  });

  const events: CalendarEvent[] = [];
  const rules = await loadWorkdayRulesForYear(year);

  for (const row of rows) {
    const start = toIso(row.startDate);
    const end = toIso(row.endDate);
    const name = `${row.user.lastName} ${row.user.firstName}`;
    const kind = row.userId === userId ? "mine" : "team";
    const days = workdaysOf(start, end, rules);
    // Fél nap: a kezdőnap akkor is jelenjen meg, ha a rules szerint munkanap.
    const dates =
      row.halfDay && days.length === 0 && yearOf(start) === year
        ? [start]
        : days.filter((date) => yearOf(date) === year);

    for (const date of dates) {
      events.push({
        date,
        kind,
        name,
        status: row.status as "pending" | "approved",
        typeName: row.leaveType.name,
        halfDay: row.halfDay,
        requestId: row.id,
        startDate: start,
        endDate: end,
      });
    }
  }

  return events;
}

export async function getMyLeavePeriods(userId: number, year: number) {
  const rows = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: { in: ["approved", "pending"] },
      startDate: { lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) },
      endDate: { gte: new Date(`${year}-01-01T00:00:00.000Z`) },
    },
    include: { leaveType: true },
    orderBy: { startDate: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    workDays: row.workDays,
    halfDay: row.halfDay,
    status: row.status as "pending" | "approved",
    typeName: row.leaveType.name,
    note: row.note,
  }));
}

/** Közvetlen beosztottak listája (Csapatom) — cégválasztótól függetlenül. */
export async function getTeam(managerId: number) {
  const year = new Date().getFullYear();
  const today = todayIso();
  const reports = await prisma.user.findMany({
    where: {
      managerId,
      role: { not: "admin" },
      active: true,
    },
    include: { department: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const cards = [];
  for (const person of reports) {
    const balance = await getBalance(person.id, year);
    const [next, history] = await Promise.all([
      prisma.leaveRequest.findFirst({
        where: {
          userId: person.id,
          status: { in: ["approved", "pending"] },
          endDate: { gte: new Date(`${today}T00:00:00.000Z`) },
        },
        include: requestInclude,
        orderBy: { startDate: "asc" },
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: person.id,
          status: { in: ["approved", "rejected"] },
        },
        include: requestInclude,
        orderBy: [{ reviewedAt: "desc" }, { startDate: "desc" }],
        take: 40,
      }),
    ]);
    cards.push({
      id: person.id,
      name: `${person.lastName} ${person.firstName}`,
      initials: person.initials,
      department: person.department.name,
      jobTitle: person.jobTitle,
      balance,
      next: next ? mapRequest(next) : null,
      history: history.map(mapRequest),
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

export type ReportSnapshot = {
  year: number;
  scope: "own" | "team" | "company";
  title: string;
  description: string;
  headcount: number;
  approvedDays: number;
  pendingDays: number;
  rejectedDays: number;
  rejectedCount: number;
  availableDays: number;
  totalDays: number;
  departments: { name: string; people: number; approvedDays: number; pendingDays: number }[];
  people: {
    id: number;
    name: string;
    department: string;
    approvedDays: number;
    pendingDays: number;
    availableDays: number;
    totalDays: number;
  }[];
  types: { name: string; days: number; count: number }[];
  months: number[];
};

type ReportUser = {
  id: number;
  firstName: string;
  lastName: string;
  department: { name: string };
};

type ReportRequest = {
  userId: number;
  workDays: number;
  status: "pending" | "approved" | "rejected";
  startDate: Date;
  endDate: Date;
  leaveType: { name: string; deductsBalance: boolean };
  user: { department: { name: string } };
};

async function aggregateReport(
  users: ReportUser[],
  requests: ReportRequest[],
  meta: { scope: ReportSnapshot["scope"]; title: string; description: string },
): Promise<ReportSnapshot> {
  const year = new Date().getFullYear();
  const rules = await loadWorkdayRulesForYear(year);

  const departments = new Map<
    string,
    { name: string; people: number; approvedDays: number; pendingDays: number }
  >();
  const peopleMap = new Map<
    number,
    {
      id: number;
      name: string;
      department: string;
      approvedDays: number;
      pendingDays: number;
      availableDays: number;
      totalDays: number;
    }
  >();

  for (const person of users) {
    const dept = departments.get(person.department.name) ?? {
      name: person.department.name,
      people: 0,
      approvedDays: 0,
      pendingDays: 0,
    };
    dept.people += 1;
    departments.set(person.department.name, dept);

    const balance = await getBalance(person.id, year);
    peopleMap.set(person.id, {
      id: person.id,
      name: `${person.lastName} ${person.firstName}`,
      department: person.department.name,
      approvedDays: 0,
      pendingDays: 0,
      availableDays: balance.availableDays,
      totalDays: balance.totalDays,
    });
  }

  const types = new Map<string, { name: string; days: number; count: number }>();
  const months = Array.from({ length: 12 }, () => 0);
  let rejectedDays = 0;
  let rejectedCount = 0;

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

    if (request.status === "rejected") {
      rejectedDays += request.workDays;
      rejectedCount += 1;
      continue;
    }

    const dept = departments.get(request.user.department.name);
    const person = peopleMap.get(request.userId);
    if (request.status === "approved") {
      if (dept) dept.approvedDays += request.workDays;
      if (person) person.approvedDays += request.workDays;
    }
    if (request.status === "pending") {
      if (dept) dept.pendingDays += request.workDays;
      if (person) person.pendingDays += request.workDays;
    }

    if (request.status === "approved" && request.leaveType.deductsBalance) {
      const days = workdaysOf(toIso(request.startDate), toIso(request.endDate), rules).filter(
        (day) => yearOf(day) === year,
      );
      if (days.length === 0) continue;
      const perDay = request.workDays / days.length;
      for (const day of days) {
        months[monthIndex(day)] += perDay;
      }
    }
  }

  const approvedDays = [...peopleMap.values()].reduce((sum, row) => sum + row.approvedDays, 0);
  const pendingDays = [...peopleMap.values()].reduce((sum, row) => sum + row.pendingDays, 0);
  const totalDays = [...peopleMap.values()].reduce((sum, row) => sum + row.totalDays, 0);
  const availableDays = [...peopleMap.values()].reduce((sum, row) => sum + row.availableDays, 0);

  return {
    year,
    scope: meta.scope,
    title: meta.title,
    description: meta.description,
    headcount: users.length,
    approvedDays,
    pendingDays,
    rejectedDays,
    rejectedCount,
    availableDays,
    totalDays,
    departments: [...departments.values()].sort((a, b) => a.name.localeCompare(b.name, "hu")),
    people: [...peopleMap.values()].sort((a, b) => a.name.localeCompare(b.name, "hu")),
    types: [...types.values()].sort((a, b) => b.days - a.days),
    months,
  };
}

async function yearRequestsForUsers(userIds: number[]) {
  if (userIds.length === 0) return [];
  const year = new Date().getFullYear();
  return prisma.leaveRequest.findMany({
    where: {
      userId: { in: userIds },
      startDate: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
    include: { leaveType: true, user: { include: { department: true } } },
  });
}

export async function getOwnReport(userId: number): Promise<ReportSnapshot> {
  const person = await prisma.user.findUnique({
    where: { id: userId },
    include: { department: true },
  });
  if (!person || person.role === "admin") {
    return aggregateReport([], [], {
      scope: "own",
      title: "Saját riport",
      description: "Nincs megjeleníthető saját adat.",
    });
  }
  const users = [person];
  const requests = await yearRequestsForUsers([person.id]);
  return aggregateReport(users, requests, {
    scope: "own",
    title: "Saját riport",
    description: "A te éves szabadságfelhasználásod és függő igényeid.",
  });
}

export async function getTeamReport(managerId: number): Promise<ReportSnapshot> {
  const reports = await prisma.user.findMany({
    where: { managerId, role: { not: "admin" }, active: true },
    include: { department: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const requests = await yearRequestsForUsers(reports.map((row) => row.id));
  return aggregateReport(reports, requests, {
    scope: "team",
    title: "Csapatom riport",
    description: "A közvetlen beosztottaid összesített szabadságadatai.",
  });
}

export async function getCompanyReport(companyId: number): Promise<ReportSnapshot> {
  const users = await prisma.user.findMany({
    where: { companyId, role: { not: "admin" }, active: true },
    include: { department: true },
  });
  const requests = await yearRequestsForUsers(users.map((row) => row.id));
  return aggregateReport(users, requests, {
    scope: "company",
    title: "Szervezeti riport",
    description: "A teljes szervezet éves összesítője.",
  });
}

/** @deprecated use getCompanyReport / getOwnReport / getTeamReport */
export async function getReport(companyId: number) {
  return getCompanyReport(companyId);
}

export async function markNotificationsRead(userId: number, href: string) {
  await prisma.notification.updateMany({
    where: { userId, href, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function getOrg(companyId: number) {
  const year = new Date().getFullYear();
  const [people, departments, jobTitles, staffRoles] = await Promise.all([
    prisma.user.findMany({
      where: { companyId, role: { not: "admin" } },
      include: { department: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.jobTitle.findMany({ orderBy: { name: "asc" } }),
    prisma.staffRole.findMany({
      where: { kind: { in: ["employee", "manager", "hr"] } },
      orderBy: { name: "asc" },
    }),
  ]);

  const userIds = people.map((person) => person.id);
  const [balances, approvedRequests] = await Promise.all([
    userIds.length === 0
      ? Promise.resolve([])
      : prisma.leaveBalance.findMany({
          where: { userId: { in: userIds }, year },
          select: { userId: true, totalDays: true },
        }),
    userIds.length === 0
      ? Promise.resolve([])
      : prisma.leaveRequest.findMany({
          where: {
            userId: { in: userIds },
            status: "approved",
            leaveType: { deductsBalance: true },
            startDate: {
              gte: new Date(`${year}-01-01T00:00:00.000Z`),
              lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
            },
          },
          select: { userId: true, workDays: true },
        }),
  ]);

  const totalByUser = new Map(balances.map((row) => [row.userId, row.totalDays]));
  const usedByUser = new Map<number, number>();
  for (const request of approvedRequests) {
    usedByUser.set(request.userId, (usedByUser.get(request.userId) ?? 0) + request.workDays);
  }

  return {
    people: people.map((person) => {
      const leaveTotalDays = totalByUser.get(person.id) ?? 0;
      const usedDays = usedByUser.get(person.id) ?? 0;
      return {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        jobTitle: person.jobTitle,
        role: person.role,
        roleTitle: person.roleTitle,
        departmentId: person.departmentId,
        department: person.department.name,
        managerId: person.managerId,
        active: person.active,
        inactiveReason: person.inactiveReason,
        leaveTotalDays,
        leaveAvailableDays: Math.max(leaveTotalDays - usedDays, 0),
      };
    }),
    departments: departments.map((department) => ({
      id: department.id,
      name: department.name,
    })),
    jobTitles: jobTitles.map((title) => ({
      id: title.id,
      name: title.name,
    })),
    staffRoles: staffRoles.map((role) => ({
      id: role.id,
      name: role.name,
      kind: role.kind,
    })),
  };
}
