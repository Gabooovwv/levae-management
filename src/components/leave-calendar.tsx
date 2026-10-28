"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthTitle, weekdayShortHeaders } from "@/lib/dates";
import { cn } from "@/lib/utils";

type CalendarEvent = { date: string; kind: "mine" | "team"; name: string };

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
    const map = new Map<string, { mine: boolean; team: boolean; names: string[] }>();
    for (const event of events) {
      const current = map.get(event.date) ?? { mine: false, team: false, names: [] };
      if (event.kind === "mine") current.mine = true;
      else current.team = true;
      if (!current.names.includes(event.name)) current.names.push(event.name);
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

  const monthEvents = events
    .filter((event) => event.date.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`))
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, "hu"));

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
          return (
            <div
              key={cell.key}
              title={info?.names.join(", ")}
              className={cn(
                "relative grid place-items-center rounded-lg text-[11px] text-[#3f4376]",
                large ? "h-11 text-sm" : "h-8",
                !cell.date && "text-[#d4d5e1]",
                info?.team && !info.mine && !isToday && "bg-[#e5fbf3] font-semibold text-[#08784c]",
                info?.mine && !isToday && "bg-[#e8effd] font-semibold text-primary",
                isToday && "bg-primary font-semibold text-white shadow-[0_4px_10px_rgba(25,90,240,0.28)]",
              )}
            >
              {cell.day}
              {info && !isToday ? (
                <span className="absolute bottom-1 size-1 rounded-full bg-current" />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-1.5 rounded-full bg-[#0af09b]" />
          Csapattag távolléte
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-1.5 rounded-full bg-primary" />
          Saját igény / mai nap
        </span>
      </div>
      {large ? (
        <ul className="mt-4 grid gap-2">
          {monthEvents.length === 0 ? (
            <li className="text-sm text-muted-foreground">Ebben a hónapban nincs rögzített távollét.</li>
          ) : (
            monthEvents.map((event, index) => (
              <li key={`${event.date}-${event.name}-${index}`} className="flex items-center justify-between text-sm">
                <span className="font-medium">{event.name}</span>
                <span className="text-muted-foreground">
                  {event.date.slice(8, 10)}. · {event.kind === "mine" ? "saját" : "csapat"}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
