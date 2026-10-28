import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRange } from "@/lib/dates";
import { getCurrentUser, getSelectedCompanyId, getTeam } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (user.role === "admin") redirect("/");

  const reportCount = await prisma.user.count({
    where: { managerId: user.id, role: { not: "admin" } },
  });
  if (reportCount === 0) redirect("/");

  const companyId = await getSelectedCompanyId(user.companyId);
  const team = await getTeam(companyId, user.id, user.companyId);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Szervezet</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Csapatom</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {team.year}-os keretek és a következő rögzített távollétek.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {team.people.map((person) => (
          <Card key={person.id} className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-[#e8effd] font-semibold text-primary">
                    {person.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{person.name}</CardTitle>
                  <CardDescription>
                    {person.department} · {person.jobTitle}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex items-end justify-between">
                <p className="text-sm text-muted-foreground">Felhasználható keret</p>
                <p className="text-2xl font-semibold tracking-tight">
                  {person.balance.availableDays}
                  <span className="ml-1 text-xs font-semibold text-[#aaabc2]">/ {person.balance.totalDays} nap</span>
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#eaeaf0]">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${person.balance.totalDays ? Math.round((person.balance.usedDays / person.balance.totalDays) * 100) : 0}%`,
                  }}
                />
              </div>
              {person.next ? (
                <div className="flex items-center justify-between rounded-lg bg-[#f4f5f7] px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">{formatRange(person.next.startDate, person.next.endDate)}</p>
                    <p className="text-xs text-muted-foreground">{person.next.workDays} munkanap</p>
                  </div>
                  <StatusBadge status={person.next.status} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nincs közelgő távollét.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
