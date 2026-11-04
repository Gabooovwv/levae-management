"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { listPendingApprovals } from "@/app/actions";
import {
  ReviewRequestDialog,
  type ReviewableRequest,
} from "@/components/review-request-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatRange, formatWorkDays } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function PendingApprovalsPanel({
  pendingCount,
}: {
  pendingCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ReviewableRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ReviewableRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listPendingApprovals();
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="relative bg-white"
        aria-label="Jóváhagyásra váró kérelmek"
        onClick={() => setOpen(true)}
      >
        <ClipboardCheck />
        {pendingCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d81c1c] px-1 text-[11px] font-semibold text-white ring-2 ring-white">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-[420px] bg-white p-0 sm:max-w-[420px]">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle>Jóváhagyásra vár</SheetTitle>
            <SheetDescription>
              A még el nem bírált szabadságigények a közvetlen beosztottaidtól.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-3" style={{ maxHeight: "calc(100vh - 110px)" }}>
            {loading ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">Betöltés…</p>
            ) : items.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Nincs függőben lévő kérelem.
              </p>
            ) : (
              <ul className="grid gap-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className={cn(
                        "w-full rounded-xl border border-border bg-[#f8f9fb] px-4 py-3 text-left transition-colors",
                        "hover:border-primary/40 hover:bg-[#eef3fd]",
                      )}
                    >
                      <p className="text-sm font-semibold">{item.personName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.department}</p>
                      <p className="mt-2 text-sm">
                        {formatRange(item.startDate, item.endDate)}
                        <span className="text-muted-foreground">
                          {" "}
                          · {formatWorkDays(item.workDays, item.halfDay)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.typeName}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ReviewRequestDialog
        request={selected}
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
        onReviewed={async () => {
          setSelected(null);
          await load();
          router.refresh();
        }}
      />
    </>
  );
}
