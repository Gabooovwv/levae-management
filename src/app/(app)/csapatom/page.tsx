import { redirect } from "next/navigation";
import { TeamPeopleList } from "@/components/team-people-list";
import { getCurrentUser, getTeam } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (user.role === "admin") redirect("/");

  const reportCount = await prisma.user.count({
    where: { managerId: user.id, role: { not: "admin" }, active: true },
  });
  if (reportCount === 0) redirect("/");

  const team = await getTeam(user.id);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Szervezet</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Csapatom</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A közvetlen beosztottaid · {team.people.length} fő · {team.year}-os keretek és a következő
          rögzített távollétek. A függőben lévő igényekre kattintva elbírálhatod őket.
        </p>
      </div>
      {team.people.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-[#f8f9fb] px-4 py-10 text-center text-sm text-muted-foreground">
          Nincs aktív közvetlen beosztottad.
        </p>
      ) : (
        <TeamPeopleList people={team.people} />
      )}
    </div>
  );
}
