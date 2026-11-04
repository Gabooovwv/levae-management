"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatRange, formatWorkDays, monthTitle, weekdayShortHeaders } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  date: string;
  kind: "mine" | "team";
  name: string;
  status?: "pending" | "approved";
  typeName?: string;
  halfDay?: boolean;
  requestId?: number;
  startDate?: string;
  endDate?: string;
};

export function LeaveCalendar({
  events,
  today,
  initialYear,
  initialMonth,
  large = false,
}: {
  events: CalendarEvent[];
  today: string;
  initialYear: number;
  initialMonth: number;
  large?: boolean;
}) {
  const [cursor, setCursor] = useState({ year: initialYear, month: initialMonth });
  const headers = weekdayShortHeaders();

  const byDate = useMemo(() => {
    const map = new Map<
      string,
      {
        mine: boolean;
        team: boolean;
        pending: boolean;
        halfDay: boolean;
        names: string[];
        titles: string[];
      }
    >();
    for (const event of events) {
      const current = map.get(event.date) ?? {
        mine: false,
        team: false,
        pending: false,
        halfDay: false,
        names: [],
        titles: [],
      };
      if (event.kind === "mine") current.mine = true;
      else current.team = true;
      if (event.status === "pending") current.pending = true;
      if (event.halfDay) current.halfDay = true;
      if (!current.names.includes(event.name)) current.names.push(event.name);
      const label = [
        event.name,
        event.typeName,
        event.status === "pending" ? "függőben" : "jóváhagyva",
        event.halfDay ? "fél nap" : null,
      ]
        .filter(Boolean)
        .join(" · ");
      if (!current.titles.includes(label)) current.titles.push(label);
      map.set(event.date, current);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const { year, month } = cursor;
    const first = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const prev = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const total = Math.ceil((first + days) / 7) * 7;
    return Array.from({ length: total }, (_, index) => {
      const n = index - first + 1;
      if (n < 1) return { key: `p-${index}`, day: prev + n, date: null as string | null };
      if (n > days) return { key: `n-${index}`, day: n - days, date: null as string | null };
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
      return { key: date, day: n, date };
    });
  }, [cursor]);

  function shift(step: number) {
    setCursor((current) => {
      const next = new Date(Date.UTC(current.year, current.month + step, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const monthEvents = events
    .filter((event) => event.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, "hu"));

  const monthPeriods = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        kind: "mine" | "team";
        name: string;
        status: "pending" | "approved";
        typeName: string;
        halfDay: boolean;
        startDate: string;
        endDate: string;
        dates: string[];
      }
    >();
    for (const event of monthEvents) {
      const key = `${event.requestId ?? event.name}-${event.startDate ?? event.date}-${event.kind}`;
      const current = map.get(key) ?? {
        key,
        kind: event.kind,
        name: event.name,
        status: event.status ?? "approved",
        typeName: event.typeName ?? "Szabadság",
        halfDay: event.halfDay ?? false,
        startDate: event.startDate ?? event.date,
        endDate: event.endDate ?? event.date,
        dates: [] as string[],
      };
      current.dates.push(event.date);
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [monthEvents]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="secondary" size="icon" onClick={() => shift(-1)} aria-label="Előző hónap">
          <ChevronLeft />
        </Button>
        <strong className="text-sm font-semibold capitalize">
          {monthTitle(cursor.year, cursor.month)}
        </strong>
        <Button variant="secondary" size="icon" onClick={() => shift(1)} aria-label="Következő hónap">
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {headers.map((day) => (
          <div key={day} className="pb-2 text-[10px] font-semibold tracking-wide text-[#aaabc2]">
            {day}
          </div>
        ))}
        {cells.map((cell) => {
          const info = cell.date ? byDate.get(cell.date) : undefined;
          const isToday = cell.date === today;
          const halfDay = Boolean(info?.halfDay);
          const fullMine = info?.mine && !halfDay;
          const fullTeam = info?.team && !info.mine && !halfDay;
          return (
            <div
              key={cell.key}
              title={info?.titles.join("\n")}
              className={cn(
                "relative grid place-items-center overflow-hidden rounded-lg text-[11px] text-[#3f4376]",
                large ? "h-11 text-sm" : "h-8",
                !cell.date && "text-[#d4d5e1]",
                fullTeam && !isToday && "bg-[#e5fbf3] font-semibold text-[#08784c]",
                fullMine && !info?.pending && !isToday && "bg-[#e8effd] font-semibold text-primary",
                fullMine && info?.pending && !isToday && "bg-[#fff1e4] font-semibold text-[#b86a1b]",
                halfDay && info?.mine && !info.pending && !isToday && "font-semibold text-primary",
                halfDay && info?.mine && info.pending && !isToday && "font-semibold text-[#b86a1b]",
                halfDay && info?.team && !info.mine && !isToday && "font-semibold text-[#08784c]",
                isToday && "bg-primary font-semibold text-white shadow-[0_4px_10px_rgba(25,90,240,0.28)]",
              )}
            >
              {halfDay && info && !isToday ? (
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0",
                    info.mine && !info.pending && "bg-[#e8effd]",
                    info.mine && info.pending && "bg-[#fff1e4]",
                    info.team && !info.mine && "bg-[#e5fbf3]",
                  )}
                  style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                />
              ) : null}
              <span className="relative z-10">{cell.day}</span>
              {info && !isToday ? (
                <span className="absolute bottom-1 z-10 size-1 rounded-full bg-current" />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-sm bg-[#e8effd] ring-1 ring-primary/30" />
          Saját (jóváhagyott)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-sm bg-[#fff1e4] ring-1 ring-[#b86a1b]/30" />
          Saját (függőben)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i
            className="size-2 rounded-sm ring-1 ring-primary/30"
            style={{
              background: "linear-gradient(to bottom right, #e8effd 50%, transparent 50%)",
            }}
          />
          Fél nap
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-sm bg-[#e5fbf3] ring-1 ring-[#08784c]/30" />
          Csapat távolléte
        </span>
      </div>
      {large ? (
        <ul className="mt-4 grid gap-2">
          {monthPeriods.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Ebben a hónapban nincs rögzített távollét.
            </li>
          ) : (
            monthPeriods.map((period) => (
              <li
                key={period.key}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between",
                  period.kind === "mine"
                    ? period.status === "pending"
                      ? "border-[#f5d5a8] bg-[#fff8f0]"
                      : "border-[#c9d8fb] bg-[#f5f8ff]"
                    : "border-[#cdeedf] bg-[#f3fcf8]",
                )}
              >
                <div>
                  <p className="text-sm font-semibold">
                    {period.kind === "mine" ? "Te" : period.name}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {formatRange(period.startDate, period.endDate)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {period.typeName}
                    {" · "}
                    {formatWorkDays(
                      period.halfDay ? 0.5 : period.dates.length,
                      period.halfDay,
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {period.kind === "mine" ? "saját" : "csapat"}
                  </span>
                  <StatusBadge status={period.status} />
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
