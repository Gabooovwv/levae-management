import { RequestsTable } from "@/components/requests-table";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApprovals, getCurrentUser, getSelectedCompanyId } from "@/lib/data";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  const companyId = await getSelectedCompanyId(user.companyId);
  const { pending, history } = await getApprovals(user.id, companyId);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Csapat</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Jóváhagyások</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pending.length} igény vár a döntésedre a kiválasztott szervezetben.
        </p>
      </div>
      <Card className="gap-0 py-0 shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
        <CardHeader className="border-b">
          <CardTitle>Függő igények</CardTitle>
          <CardDescription>A közvetlen csapatod kérelmei</CardDescription>
        </CardHeader>
        <RequestsTable rows={pending} showPerson review />
      </Card>
      <Card className="gap-0 py-0 shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
        <CardHeader className="border-b">
          <CardTitle>Korábbi döntések</CardTitle>
          <CardDescription>Az általad lezárt kérelmek</CardDescription>
        </CardHeader>
        <RequestsTable rows={history} showPerson />
      </Card>
    </div>
  );
}
