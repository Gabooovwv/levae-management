import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser, getReport, getSelectedCompanyId } from "@/lib/data";

const monthLabels = ["Jan", "Febr", "Márc", "Ápr", "Máj", "Jún", "Júl", "Aug", "Szept", "Okt", "Nov", "Dec"];

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const companyId = await getSelectedCompanyId(user.companyId);
  const report = await getReport(companyId);
  const peak = Math.max(...report.months, 1);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Áttekintés</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Riportok</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {report.year}-os összesítő a kiválasztott szervezetre. {report.headcount} munkavállaló,{" "}
          {report.approvedDays} jóváhagyott és {report.pendingDays} függő nap.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
          <CardHeader>
            <CardTitle>Havi felhasználás</CardTitle>
            <CardDescription>Jóváhagyott, keretből levont munkanapok</CardDescription>
          </CardHeader>
          <CardContent className="flex h-48 items-end gap-2">
            {report.months.map((days, index) => (
              <div key={monthLabels[index]} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-36 w-full items-end rounded-md bg-[#f4f5f7]">
                  <div
                    className="w-full rounded-md bg-primary"
                    style={{ height: `${Math.max(4, Math.round((days / peak) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">{monthLabels[index]}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
          <CardHeader>
            <CardTitle>Jogcímek</CardTitle>
            <CardDescription>Nem elutasított igények</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {report.types.length === 0 ? (
              <p className="text-sm text-muted-foreground">Még nincs rögzített igény.</p>
            ) : (
              report.types.map((type) => (
                <div key={type.name} className="grid gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{type.name}</span>
                    <span className="text-muted-foreground">
                      {type.days} nap · {type.count} igény
                    </span>
                  </div>
                  <Progress value={report.approvedDays ? Math.round((type.days / (report.approvedDays + report.pendingDays || 1)) * 100) : 0} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
        <CardHeader>
          <CardTitle>Részlegek</CardTitle>
          <CardDescription>Létszám és napok a keretet érintő és függő igényekből</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {report.departments.map((department) => {
            const quota = department.people * 25;
            const ratio = quota ? Math.round((department.approvedDays / quota) * 100) : 0;
            return (
              <div key={department.name} className="grid gap-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">
                    {department.name}{" "}
                    <span className="font-normal text-muted-foreground">{department.people} fő</span>
                  </span>
                  <span className="text-muted-foreground">
                    {department.approvedDays} jóváhagyva · {department.pendingDays} függőben
                  </span>
                </div>
                <Progress value={ratio} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
