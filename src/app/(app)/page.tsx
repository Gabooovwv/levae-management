import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  Check,
  Hourglass,
  Network,
  TreePalm,
} from "lucide-react";
import { LeaveCalendar } from "@/components/leave-calendar";
import { RequestDialog } from "@/components/request-dialog";
import { RequestsTable } from "@/components/requests-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { QUARTER_META, formatRange, weekdayName } from "@/lib/dates";
import { getCurrentUser, getDashboard, getLeaveTypes, getSelectedCompanyId } from "@/lib/data";

const tones = [
  "bg-[#e8effd] text-primary",
  "bg-[#e5fbf3] text-[#08784c]",
  "bg-[#fff1e4] text-[#b86a1b]",
  "bg-[#f3eeff] text-[#673cf5]",
];

const adminLinks = [
  {
    href: "/szervezet",
    title: "Dolgozók",
    description: "Szervezeti fa, beosztások, részlegek és szerepek kezelése.",
    icon: Network,
  },
  {
    href: "/riportok",
    title: "Riportok",
    description: "Összesített szabadságstatisztikák a szervezetről.",
    icon: BarChart3,
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user.role === "admin") {
    return (
      <div className="grid gap-6">
        <section>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
            Adminisztráció
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Szia, {user.firstName}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Adminisztrátorként a szervezeti felületeket kezelheted. Saját szabadságigényt innen nem lehet
            leadni.
          </p>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="group">
                <Card className="h-full gap-3 py-5 shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border transition-colors group-hover:bg-[#f8f9fc]">
                  <CardHeader>
                    <CardDescription className="font-semibold">{link.title}</CardDescription>
                    <CardAction>
                      <div className="grid size-8 place-items-center rounded-lg bg-[#e8effd] text-primary">
                        <Icon className="size-4" />
                      </div>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      </div>
    );
  }

  const companyId = await getSelectedCompanyId(user.companyId);
  const [dashboard, types] = await Promise.all([
    getDashboard(user.id, companyId),
    getLeaveTypes(),
  ]);
  const { balance } = dashboard;
  const usedRatio = balance.totalDays ? Math.round((balance.usedDays / balance.totalDays) * 100) : 0;
  const availableRatio = balance.totalDays
    ? Math.round((balance.availableDays / balance.totalDays) * 100)
    : 0;
  const today = new Date();

  return (
    <div className="grid gap-6">
      <section className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
            Szervezetten, egyszerűen
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Szia, {user.firstName}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Itt találod a szabadságaid és a közelgő távolléteid összefoglalóját.
          </p>
        </div>
        <RequestDialog types={types} today={dashboard.today} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Éves szabadságkeret"
          icon={<CalendarClock className="size-4" />}
          tone={tones[0]}
          value={String(balance.totalDays)}
          unit="nap"
          foot="Teljes éves keret"
        />
        <Stat
          label="Felhasználható"
          icon={<Check className="size-4" />}
          tone={tones[1]}
          value={String(balance.availableDays)}
          unit="nap"
          foot={<span className="font-semibold text-[#08784c]">{availableRatio}% még rendelkezésre áll</span>}
        />
        <Stat
          label="Elbírálás alatt"
          icon={<Hourglass className="size-4" />}
          tone={tones[2]}
          value={String(dashboard.pendingCount)}
          unit="igény"
          foot="Vezetői jóváhagyásra vár"
        />
        <Stat
          label="Következő távollét"
          icon={<TreePalm className="size-4" />}
          tone={tones[3]}
          value={dashboard.nextAbsence ? formatRange(dashboard.nextAbsence.startDate, dashboard.nextAbsence.startDate) : "—"}
          foot={
            dashboard.nextAbsence
              ? `${weekdayName(dashboard.nextAbsence.startDate)} · ${dashboard.nextAbsence.workDays} munkanap`
              : "Nincs közelgő távollét"
          }
        />
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
        <div className="grid gap-5">
          <Card className="gap-0 py-0 shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
            <CardHeader className="border-b">
              <CardTitle>Szabadságkeretem</CardTitle>
              <CardDescription>{balance.year}-os év · Negyedéves bontás</CardDescription>
              <CardAction>
                <Link href="/szabadsagaim" className="text-xs font-semibold text-primary">
                  Részletek
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-4 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Felhasznált szabadság</p>
                  <p className="text-xs text-muted-foreground">
                    {balance.usedDays} nap a {balance.totalDays} napos éves keretből
                  </p>
                </div>
                <p className="text-2xl font-semibold tracking-tight">
                  {balance.availableDays}{" "}
                  <span className="text-xs font-semibold text-muted-foreground">/ {balance.totalDays} nap</span>
                </p>
              </div>
              <Progress value={usedRatio} />
              <div className="flex justify-between text-[11px] text-[#aaabc2]">
                <span>0 nap</span>
                <span>{usedRatio}% felhasználva</span>
                <span>{balance.totalDays} nap</span>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {QUARTER_META.map((quarter) => {
                  const quota = balance.quotas[quarter.index];
                  const used = balance.usedByQuarter[quarter.index];
                  const width = quota ? Math.min(100, Math.round((used / quota) * 100)) : 0;
                  return (
                    <div key={quarter.label} className="rounded-lg border border-[#eeeff5] bg-[#fafaff] p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground">{quarter.label}</p>
                      <p className="mt-1 text-lg font-semibold">
                        {used} / {quota}
                      </p>
                      <p className="text-[10px] text-[#aaabc2]">nap felhasználva</p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#e8eaf5]">
                        <div className="h-full rounded-full bg-[#195af0]" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
            <CardHeader className="border-b">
              <CardTitle>Legutóbbi igényeim</CardTitle>
              <CardDescription>Kérelmeid állapota egy helyen</CardDescription>
              <CardAction>
                <Link href="/szabadsagaim" className="text-xs font-semibold text-primary">
                  Összes megtekintése
                </Link>
              </CardAction>
            </CardHeader>
            <RequestsTable rows={dashboard.recent} />
          </Card>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
          <Card className="gap-0 py-0 shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
            <CardHeader className="border-b">
              <CardTitle>Szabadságnaptár</CardTitle>
              <CardDescription>Jóváhagyott és függő távollétek</CardDescription>
              <CardAction>
                <Link href="/naptar" className="text-xs font-semibold text-primary">
                  Teljes naptár
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="py-4">
              <LeaveCalendar
                events={dashboard.calendarEvents}
                today={dashboard.today}
                initialYear={today.getFullYear()}
                initialMonth={today.getMonth()}
              />
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
            <CardHeader className="border-b">
              <CardTitle>Csapatom távollétei</CardTitle>
              <CardDescription>Közelgő távollétek</CardDescription>
              <CardAction>
                <Link href="/csapatom" className="text-xs font-semibold text-primary">
                  Összes
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="py-2">
              {dashboard.team.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">Nincs közelgő csapattávollét.</p>
              ) : (
                dashboard.team.map((person) => (
                  <div key={person.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                    <Avatar className="rounded-lg">
                      <AvatarFallback className="rounded-lg bg-[#e8effd] text-xs font-semibold text-primary">
                        {person.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{person.personName}</p>
                      <p className="text-xs text-muted-foreground">{person.department}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p className="font-semibold text-[#08784c]">{formatRange(person.startDate, person.endDate)}</p>
                      <p>{person.workDays} nap</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 bg-[#fff8ee] py-0 ring-[#f3e2c4] md:col-span-2 xl:col-span-1">
            <CardContent className="flex gap-3 py-4">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#fff1e4] text-[#b86a1b]">
                <TreePalm className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Tervezd előre a szabadságod!</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Nézd át a csapat távolléteit, hogy könnyebben megtaláld a megfelelő időpontot.
                </p>
                <Link href="/naptar" className="mt-2 inline-block text-xs font-semibold text-primary">
                  Naptár megnyitása
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  icon,
  tone,
  value,
  unit,
  foot,
}: {
  label: string;
  icon: React.ReactNode;
  tone: string;
  value: string;
  unit?: string;
  foot: React.ReactNode;
}) {
  return (
    <Card className="gap-2 py-5 shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
      <CardHeader>
        <CardDescription className="font-semibold">{label}</CardDescription>
        <CardAction>
          <div className={`grid size-8 place-items-center rounded-lg ${tone}`}>{icon}</div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">
          {value} {unit ? <span className="text-sm font-semibold text-[#aaabc2]">{unit}</span> : null}
        </p>
        <p className="mt-1 text-xs text-[#aaabc2]">{foot}</p>
      </CardContent>
    </Card>
  );
}
