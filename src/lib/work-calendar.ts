import { prisma } from "@/lib/prisma";
import { countWorkdays, isWorkday, toIso, type WorkdayRules } from "@/lib/dates";

export type CalendarDayRow = {
  date: string;
  kind: "holiday" | "workday";
  note: string | null;
};

export function computeLeaveWorkDays(
  startIso: string,
  endIso: string,
  halfDay: boolean,
  rules: WorkdayRules,
) {
  if (halfDay) {
    return isWorkday(startIso, rules) ? 0.5 : 0;
  }
  return countWorkdays(startIso, endIso, rules);
}

export async function loadWorkdayRules(
  fromIso: string,
  toIsoDate: string,
): Promise<WorkdayRules> {
  const rows = await prisma.calendarDay.findMany({
    where: {
      date: {
        gte: new Date(`${fromIso}T00:00:00.000Z`),
        lte: new Date(`${toIsoDate}T00:00:00.000Z`),
      },
    },
    select: { date: true, kind: true },
  });

  const holidays = new Set<string>();
  const workdays = new Set<string>();
  for (const row of rows) {
    const iso = toIso(row.date);
    if (row.kind === "holiday") holidays.add(iso);
    else workdays.add(iso);
  }
  return { holidays, workdays };
}

export async function loadWorkdayRulesForYear(year: number): Promise<WorkdayRules> {
  return loadWorkdayRules(`${year}-01-01`, `${year}-12-31`);
}

export async function listCalendarDays(year: number): Promise<CalendarDayRow[]> {
  const rows = await prisma.calendarDay.findMany({
    where: {
      date: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T00:00:00.000Z`),
      },
    },
    orderBy: { date: "asc" },
  });

  return rows.map((row) => ({
    date: toIso(row.date),
    kind: row.kind,
    note: row.note,
  }));
}

/**
 * Munkarend-változás után újraszámolja az adott napot tartalmazó
 * pending/approved szabadságigények workDays értékét.
 */
export async function recalculateLeaveRequestsOverlapping(isoDate: string) {
  const day = new Date(`${isoDate}T00:00:00.000Z`);
  const rows = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ["pending", "approved"] },
      startDate: { lte: day },
      endDate: { gte: day },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      halfDay: true,
      workDays: true,
    },
  });

  if (rows.length === 0) {
    return { checked: 0, updated: 0, changes: [] as { id: number; from: number; to: number }[] };
  }

  const starts = rows.map((row) => toIso(row.startDate));
  const ends = rows.map((row) => toIso(row.endDate));
  const fromIso = starts.reduce((min, value) => (value < min ? value : min));
  const toIsoDate = ends.reduce((max, value) => (value > max ? value : max));
  const rules = await loadWorkdayRules(fromIso, toIsoDate);

  const changes: { id: number; from: number; to: number }[] = [];
  for (const row of rows) {
    const start = toIso(row.startDate);
    const end = toIso(row.endDate);
    const next = computeLeaveWorkDays(start, end, row.halfDay, rules);
    if (next === row.workDays) continue;
    await prisma.leaveRequest.update({
      where: { id: row.id },
      data: { workDays: next },
    });
    changes.push({ id: row.id, from: row.workDays, to: next });
  }

  return { checked: rows.length, updated: changes.length, changes };
}
