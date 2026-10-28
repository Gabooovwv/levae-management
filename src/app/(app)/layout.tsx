import Link from "next/link";
import { ShellFrame } from "@/components/shell-frame";
import { Button } from "@/components/ui/button";
import { getShell } from "@/lib/data";
import { isRedirectError } from "@/lib/session";
import type { ShellData } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let data: ShellData | null = null;
  let message = "";

  try {
    data = await getShell();
  } catch (error) {
    if (isRedirectError(error)) throw error;
    message = error instanceof Error ? error.message : "Ismeretlen hiba";
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Adatbázis</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">A szabadságadatok most nem érhetők el</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Indítsd a MySQL-t: <code>docker compose up -d</code>, majd töltsd be a mintát:{" "}
          <code>npm run db:setup</code>. A phpMyAdmin a 8081-es porton érhető el.
        </p>
        <p className="mt-3 text-sm text-[#d81c1c]">{message}</p>
        <Button className="mt-6" render={<Link href="/" />}>
          Újrapróbálom
        </Button>
      </div>
    );
  }

  return <ShellFrame data={data}>{children}</ShellFrame>;
}
