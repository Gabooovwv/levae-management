import { LeaveCalendar } from "@/components/leave-calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCalendarEvents, getCurrentUser, getSelectedCompanyId } from "@/lib/data";
import { todayIso } from "@/lib/dates";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  const companyId = await getSelectedCompanyId(user.companyId);
  const today = todayIso();
  const year = new Date().getFullYear();
  const events = await getCalendarEvents(companyId, user.id, year);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Tervezés</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Naptár</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A saját igényeid és a kiválasztott szervezet távollétei egy nézetben.
        </p>
      </div>
      <Card className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
        <CardHeader>
          <CardTitle>{year}</CardTitle>
          <CardDescription>A munkanapokra eső távollétek jelennek meg.</CardDescription>
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
    </div>
  );
}
