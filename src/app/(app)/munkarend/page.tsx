import { redirect } from "next/navigation";
import { WorkCalendarAdmin } from "@/components/work-calendar-admin";
import { getCurrentUser } from "@/lib/data";
import { listCalendarDays } from "@/lib/work-calendar";

export default async function WorkSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/");

  const params = await searchParams;
  const parsed = Number(params.year);
  const year = Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100
    ? parsed
    : new Date().getFullYear();

  const days = await listCalendarDays(year);

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
          Adminisztráció
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Munkarend naptár</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Állítsd be az éves munkaszüneti napokat és az áthelyezett munkanapokat. Ezeket a
          szabadságigények hosszának számításánál figyelembe vesszük.
        </p>
      </section>
      <WorkCalendarAdmin key={year} year={year} days={days} />
    </div>
  );
}
