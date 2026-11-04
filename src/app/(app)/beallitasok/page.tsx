import { redirect } from "next/navigation";
import { listApprovalNotifyEmails } from "@/app/actions";
import { ApprovalNotifyEmails } from "@/components/approval-notify-emails";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/data";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/");

  const emails = await listApprovalNotifyEmails();

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
          Adminisztráció
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Beállítások</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Extra e-mail címek, amelyek minden jóváhagyott szabadságigényről másolatot kapnak.
        </p>
      </section>

      <Card className="max-w-xl gap-0 py-0 shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
        <CardHeader className="border-b">
          <CardTitle>Jóváhagyási értesítések</CardTitle>
          <CardDescription>
            A listán szereplő címek minden elfogadott kérelemről automatikus e-mailt kapnak (a
            dolgozó mellett). Elutasításról nem.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-5">
          <ApprovalNotifyEmails initialEmails={emails} />
        </CardContent>
      </Card>
    </div>
  );
}
