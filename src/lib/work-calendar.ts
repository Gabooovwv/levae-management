import { prisma } from "@/lib/prisma";
import { toIso, type WorkdayRules } from "@/lib/dates";

export type CalendarDayRow = {
  date: string;
  kind: "holiday" | "workday";
  note: string | null;
};

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
