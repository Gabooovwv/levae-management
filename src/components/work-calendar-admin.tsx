"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { setCalendarDay } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { monthGrid, monthTitle, weekdayShortHeaders } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Kind = "holiday" | "workday";

function nextKind(current: Kind | null): Kind | null {
  if (current === null) return "holiday";
  if (current === "holiday") return "workday";
  return null;
}

export function WorkCalendarAdmin({
  year: initialYear,
  days,
}: {
  year: number;
  days: { date: string; kind: Kind }[];
}) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState<Record<string, Kind>>(() =>
    Object.fromEntries(days.map((day) => [day.date, day.kind])),
  );

  const headers = weekdayShortHeaders();

  const stats = useMemo(() => {
    let holidays = 0;
    let workdays = 0;
    for (const [iso, kind] of Object.entries(local)) {
      if (!iso.startsWith(String(year))) continue;
      if (kind === "holiday") holidays += 1;
      else workdays += 1;
    }
    return { holidays, workdays };
  }, [local, year]);

  function changeYear(next: number) {
    setYear(next);
    router.push(`/munkarend?year=${next}`);
  }

  function onDayClick(iso: string) {
    const current = local[iso] ?? null;
    const kind = nextKind(current);
    startTransition(async () => {
      const result = await setCalendarDay(iso, kind);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setLocal((prev) => {
        const copy = { ...prev };
        if (kind === null) delete copy[iso];
        else copy[iso] = kind;
        return copy;
      });
      toast.success(result.message);
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Előző év"
            disabled={pending}
            onClick={() => changeYear(year - 1)}
          >
            <ChevronLeft />
          </Button>
          <p className="min-w-24 text-center text-xl font-semibold tracking-tight">{year}</p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Következő év"
            disabled={pending}
            onClick={() => changeYear(year + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#f4f5f7] px-3 py-1.5 text-[#555885]">
            <span className="size-2.5 rounded-sm bg-[#e8eaf5]" /> Hétköznap
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#f4f5f7] px-3 py-1.5 text-[#555885]">
            <span className="size-2.5 rounded-sm bg-[#f0f1f6]" /> Hétvége
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#fde8e8] px-3 py-1.5 text-[#a31d1d]">
            <span className="size-2.5 rounded-sm bg-[#d81c1c]" /> Munkaszüneti ({stats.holidays})
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#e8effd] px-3 py-1.5 text-primary">
            <span className="size-2.5 rounded-sm bg-primary" /> Áthelyezett munkanap ({stats.workdays})
          </span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Kattints egy napra a váltáshoz: alap → munkaszüneti → áthelyezett munkanap → alap. A
        szabadságigények hosszánál a hétvége és a munkaszüneti nap nem számít, az áthelyezett
        munkanap viszont igen.
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const cells = monthGrid(year, monthIndex);
          return (
            <div
              key={monthIndex}
              className="rounded-xl border border-border bg-white p-3 shadow-[0_8px_24px_rgba(42,46,103,0.03)]"
            >
              <p className="mb-2 text-sm font-semibold">{monthTitle(year, monthIndex)}</p>
              <div className="grid grid-cols-7 gap-1">
                {headers.map((label) => (
                  <div
                    key={`${monthIndex}-${label}`}
                    className="py-1 text-center text-[10px] font-semibold tracking-wide text-[#aaabc2] uppercase"
                  >
                    {label}
                  </div>
                ))}
                {cells.map((iso, index) => {
                  if (!iso) {
                    return <div key={`empty-${monthIndex}-${index}`} className="aspect-square" />;
                  }
                  const dayNum = Number(iso.slice(8, 10));
                  const weekday = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
                  const isWeekend = weekday === 0 || weekday === 6;
                  const kind = local[iso] ?? null;

                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={pending}
                      onClick={() => onDayClick(iso)}
                      title={
                        kind === "holiday"
                          ? "Munkaszüneti nap"
                          : kind === "workday"
                            ? "Áthelyezett munkanap"
                            : isWeekend
                              ? "Hétvége"
                              : "Hétköznap"
                      }
                      className={cn(
                        "aspect-square rounded-md text-xs font-semibold transition-colors",
                        "hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        kind === "holiday" && "bg-[#d81c1c] text-white hover:bg-[#c01818]",
                        kind === "workday" && "bg-primary text-white hover:bg-[#477bf3]",
                        kind === null && isWeekend && "bg-[#f0f1f6] text-[#8a8ba8]",
                        kind === null && !isWeekend && "bg-[#e8eaf5] text-[#2a2e67]",
                      )}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
