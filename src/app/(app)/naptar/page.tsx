import { redirect } from "next/navigation";
import { LeaveCalendar } from "@/components/leave-calendar";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCalendarEvents,
  getCurrentUser,
  getMyLeavePeriods,
  getSelectedCompanyId,
} from "@/lib/data";
import { formatRange, formatWorkDays, todayIso } from "@/lib/dates";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (user.role === "admin") redirect("/");

  const companyId = await getSelectedCompanyId(user.companyId);
  const today = todayIso();
  const year = new Date().getFullYear();
  const [events, periods] = await Promise.all([
    getCalendarEvents(companyId, user.id, year),
    getMyLeavePeriods(user.id, year),
  ]);

  const upcoming = periods.filter((row) => row.endDate >= today);
  const mineDays = new Set(events.filter((event) => event.kind === "mine").map((event) => event.date))
    .size;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Tervezés</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Naptár</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A saját, adatbázisból jövő szabadságaid és a csapatod távollétei. Idén {mineDays} saját
          munkanap van a naptárban.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <Card className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
          <CardHeader>
            <CardTitle>{year}</CardTitle>
            <CardDescription>
              Jóváhagyott és függőben lévő igények munkanapokra vetítve (ünnepnap / áthelyezett
              munkanap figyelembevételevel).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveCalendar
              events={events}
              today={today}
              initialYear={year}
              initialMonth={new Date().getMonth()}
              large
            />
          </CardContent>
        </Card>

        <Card className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
          <CardHeader>
            <CardTitle>Saját távolléteid</CardTitle>
            <CardDescription>
              {upcoming.length > 0
                ? `${upcoming.length} közelgő / folyamatban lévő igény`
                : "Nincs közelgő saját távollét"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {periods.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Még nincs rögzített szabadságigényed erre az évre.
              </p>
            ) : (
              periods.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-border bg-[#f8f9fb] px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {formatRange(row.startDate, row.endDate)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.typeName} · {formatWorkDays(row.workDays, row.halfDay)}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  {row.note ? (
                    <p className="mt-2 text-xs text-muted-foreground">{row.note}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
