"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-6 py-24">
      <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Adatbázis</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">A szabadságadatok most nem érhetők el</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Indítsd a MySQL-t a Dockerrel, majd töltsd be a mintát: <code>docker compose up -d</code> és{" "}
        <code>npm run db:setup</code>.
      </p>
      <p className="mt-3 text-sm text-[#d81c1c]">{error.message}</p>
      <Button className="mt-6" onClick={reset}>
        Újrapróbálom
      </Button>
    </div>
  );
}
