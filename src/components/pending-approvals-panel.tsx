"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { listPendingApprovals, reviewLeaveRequest } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatRange, formatWorkDays } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type PendingApprovalItem = {
  id: number;
  startDate: string;
  endDate: string;
  workDays: number;
  halfDay: boolean;
  typeName: string;
  note: string | null;
  personName: string;
  department: string;
};

export function PendingApprovalsPanel({
  pendingCount,
}: {
  pendingCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PendingApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PendingApprovalItem | null>(null);
  const [reviewPending, startReview] = useTransition();

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

  function review(status: "approved" | "rejected") {
    if (!selected) return;
    startReview(async () => {
      const result = await reviewLeaveRequest(selected.id, status);
      if (result.ok) {
        toast.success(result.message);
        setSelected(null);
        await load();
        router.refresh();
        return;
      }
      toast.error(result.message);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="relative bg-white"
        aria-label="Jóváhagyásra váró kérelmek"
        onClick={() => setOpen(true)}
      >
        <Bell />
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

      <Dialog
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  Kérelem elbírálása
                </DialogTitle>
                <DialogDescription>
                  {selected.personName} szabadságigénye. A döntésről a dolgozó e-mailt kap.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 rounded-xl bg-[#f4f5f7] px-4 py-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Munkavállaló: </span>
                  <span className="font-semibold">{selected.personName}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Részleg: </span>
                  {selected.department}
                </p>
                <p>
                  <span className="text-muted-foreground">Időszak: </span>
                  {formatRange(selected.startDate, selected.endDate)}
                </p>
                <p>
                  <span className="text-muted-foreground">Hossz: </span>
                  {formatWorkDays(selected.workDays, selected.halfDay)}
                </p>
                <p>
                  <span className="text-muted-foreground">Jogcím: </span>
                  {selected.typeName}
                </p>
                {selected.note ? (
                  <p>
                    <span className="text-muted-foreground">Megjegyzés: </span>
                    {selected.note}
                  </p>
                ) : null}
              </div>
              <DialogFooter className="bg-transparent">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={reviewPending}
                  onClick={() => review("rejected")}
                >
                  Elutasítás
                </Button>
                <Button
                  type="button"
                  disabled={reviewPending}
                  className="font-semibold hover:bg-[#477bf3]"
                  onClick={() => review("approved")}
                >
                  {reviewPending ? "Mentés…" : "Jóváhagyás"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
