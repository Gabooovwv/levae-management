"use client";

import { useEffect, useState, useTransition } from "react";
import { Building2, CalendarDays, Clock3, FileText, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { reviewLeaveRequest } from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatRange, formatWorkDays, yearOf } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type ReviewableRequest = {
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

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("hu-HU");
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toLocaleUpperCase("hu-HU");
}

export function ReviewRequestDialog({
  request,
  open,
  onOpenChange,
  onReviewed,
}: {
  request: ReviewableRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewed?: () => void;
}) {
  const [withComment, setWithComment] = useState(false);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setWithComment(false);
      setComment("");
    }
  }, [open]);

  function review(status: "approved" | "rejected") {
    if (!request) return;
    const reviewNote = withComment ? comment.trim() : "";
    if (withComment && !reviewNote) {
      toast.error("Írd meg a megjegyzést, vagy vedd ki a pipát.");
      return;
    }
    startTransition(async () => {
      const result = await reviewLeaveRequest(request.id, status, reviewNote || null);
      if (result.ok) {
        toast.success(result.message);
        onOpenChange(false);
        onReviewed?.();
        return;
      }
      toast.error(result.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        {request ? (
          <>
            <DialogHeader className="space-y-4 border-b border-border px-6 pt-6 pb-5 text-left">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
                    Elbírálás
                  </p>
                  <DialogTitle className="mt-1 text-xl font-semibold tracking-tight">
                    Szabadságigény
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    A döntésről a dolgozó e-mailt kap.
                  </DialogDescription>
                </div>
                <StatusBadge status="pending" />
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-[#f4f5f7] px-3 py-3">
                <Avatar className="size-11">
                  <AvatarFallback className="bg-[#e8effd] text-sm font-semibold text-primary">
                    {initialsOf(request.personName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold tracking-tight">
                    {request.personName}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="size-3.5 shrink-0" />
                    <span className="truncate">{request.department}</span>
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="grid gap-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#eaeaf0] bg-white px-3.5 py-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#aaabc2] uppercase">
                    <CalendarDays className="size-3.5" />
                    Időszak
                  </p>
                  <p className="mt-1.5 text-sm font-semibold tracking-tight">
                    {formatRange(request.startDate, request.endDate)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{yearOf(request.startDate)}</p>
                </div>
                <div className="rounded-xl border border-[#eaeaf0] bg-white px-3.5 py-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#aaabc2] uppercase">
                    <Clock3 className="size-3.5" />
                    Hossz
                  </p>
                  <p className="mt-1.5 text-sm font-semibold tracking-tight">
                    {formatWorkDays(request.workDays, request.halfDay)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">munkanap alapján</p>
                </div>
              </div>

              <div className="rounded-xl border border-[#eaeaf0] bg-[#fafaff] px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#aaabc2] uppercase">
                  <FileText className="size-3.5" />
                  Jogcím
                </p>
                <p className="mt-1.5 text-sm font-semibold">{request.typeName}</p>
              </div>

              {request.note ? (
                <div className="rounded-xl border border-[#e8effd] bg-[#f5f8ff] px-3.5 py-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-primary uppercase">
                    <MessageSquareText className="size-3.5" />
                    Igénylő megjegyzése
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#2a2e67]">{request.note}</p>
                </div>
              ) : null}

              <div className="grid gap-2">
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-semibold transition-colors",
                    withComment
                      ? "border-primary/30 bg-[#e8effd] text-primary"
                      : "border-[#eaeaf0] bg-[#f4f5f7] text-[#555885]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={withComment}
                    onChange={(event) => setWithComment(event.target.checked)}
                    className="size-4 rounded border-[#d4d5e1] accent-primary"
                  />
                  Saját megjegyzés a döntéshez
                </label>
                {withComment ? (
                  <Textarea
                    id="review-comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Pl. miért utasítod el, vagy egyéb megjegyzés a dolgozónak…"
                    rows={3}
                    className="min-h-20 resize-none"
                    autoFocus
                  />
                ) : null}
              </div>
            </div>

            <DialogFooter className="h-20 gap-2 border-t border-border bg-[#f8f9fb] px-6 py-4 pb-5 sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                className="font-semibold text-[#d81c1c] hover:bg-[#fdecec] hover:text-[#d81c1c]"
                onClick={() => review("rejected")}
              >
                Elutasítás
              </Button>
              <Button
                type="button"
                disabled={pending}
                className="min-w-32 font-semibold hover:bg-[#477bf3]"
                onClick={() => review("approved")}
              >
                {pending ? "Mentés…" : "Jóváhagyás"}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
