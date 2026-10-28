import Link from "next/link";
import { RequestDialog } from "@/components/request-dialog";
import { RequestsTable } from "@/components/requests-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayIso } from "@/lib/dates";
import { getBalance, getCurrentUser, getLeaveTypes, getMyRequests, markNotificationsRead } from "@/lib/data";
import { cn } from "@/lib/utils";

const filters = [
  { href: "/szabadsagaim", label: "Összes", value: "" },
  { href: "/szabadsagaim?status=pending", label: "Függőben", value: "pending" },
  { href: "/szabadsagaim?status=approved", label: "Jóváhagyva", value: "approved" },
  { href: "/szabadsagaim?status=rejected", label: "Elutasítva", value: "rejected" },
];

export default async function MyLeavePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await getCurrentUser();
  const year = new Date().getFullYear();
  const [rows, balance, types] = await Promise.all([
    getMyRequests(user.id, status),
    getBalance(user.id, year),
    getLeaveTypes(),
    markNotificationsRead(user.id, "/szabadsagaim"),
  ]);
  const active = filters.some((filter) => filter.value === status) ? status ?? "" : "";

  return (
    <div className="grid gap-6">
      <section className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Saját keret</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Szabadságaim</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {balance.availableDays} nap még felhasználható a {balance.totalDays} napos keretből.{" "}
            {balance.pendingDays} nap elbírálás alatt.
          </p>
        </div>
        <RequestDialog types={types} today={todayIso()} />
      </section>
      <Card className="gap-0 py-0 shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
        <CardHeader className="border-b">
          <CardTitle>Igények</CardTitle>
          <CardDescription>A benyújtott kérelmeid állapota</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 py-4">
          {filters.map((filter) => (
            <Link
              key={filter.href}
              href={filter.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground",
                active === filter.value ? "bg-[#e8effd] text-primary" : "bg-[#f4f5f7]",
              )}
            >
              {filter.label}
            </Link>
          ))}
        </CardContent>
        <RequestsTable rows={rows} />
      </Card>
    </div>
  );
}
