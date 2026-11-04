"use client";

import type { ReactNode } from "react";
import { CalendarDays, Clock3, FileText, MessageSquareText } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRange, formatWorkDays, yearOf } from "@/lib/dates";
import type { RequestRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RequestDetailDialog({
  request,
  open,
  onOpenChange,
}: {
  request: RequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-130">
        {request ? (
          <>
            <DialogHeader className="space-y-3 border-b border-border px-6 pt-6 pb-5 text-left">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
                    Szabadságigény
                  </p>
                  <DialogTitle className="mt-1 text-xl font-semibold tracking-tight">
                    {formatRange(request.startDate, request.endDate)}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {yearOf(request.startDate)} · {request.typeName}
                  </DialogDescription>
                </div>
                <StatusBadge status={request.status} />
              </div>
            </DialogHeader>

            <div className="grid gap-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <Meta
                  icon={<CalendarDays className="size-3.5" />}
                  label="Időszak"
                  value={formatRange(request.startDate, request.endDate)}
                  foot={yearOf(request.startDate).toString()}
                />
                <Meta
                  icon={<Clock3 className="size-3.5" />}
                  label="Hossz"
                  value={formatWorkDays(request.workDays, request.halfDay)}
                  foot="munkanap alapján"
                />
              </div>

              <div className="rounded-xl border border-[#eaeaf0] bg-[#fafaff] px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#aaabc2] uppercase">
                  <FileText className="size-3.5" />
                  Jogcím
                </p>
                <p className="mt-1.5 text-sm font-semibold">{request.typeName}</p>
              </div>

              <NoteBlock
                title="Te megjegyzésed"
                text={request.note}
                empty="Nem írtál megjegyzést az igényhez."
                tone="neutral"
              />

              {request.status === "pending" ? (
                <div className="rounded-xl border border-[#f5d5a8] bg-[#fff8f0] px-3.5 py-3 text-sm text-[#b86a1b]">
                  A kérelem még elbírálásra vár. A felettes döntése itt fog megjelenni.
                </div>
              ) : (
                <NoteBlock
                  title={
                    request.status === "approved"
                      ? "Felettes válasza / megjegyzése"
                      : "Elutasítás indoka"
                  }
                  text={request.reviewNote}
                  empty={
                    request.status === "approved"
                      ? "A felettes nem írt megjegyzést."
                      : "Nincs rögzített indok."
                  }
                  tone={request.status === "approved" ? "ok" : "bad"}
                  foot={
                    request.reviewedAt
                      ? `Döntés dátuma: ${new Date(`${request.reviewedAt}T12:00:00`).toLocaleDateString("hu-HU")}`
                      : null
                  }
                />
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Meta({
  icon,
  label,
  value,
  foot,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  foot: string;
}) {
  return (
    <div className="rounded-xl border border-[#eaeaf0] bg-white px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#aaabc2] uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{foot}</p>
    </div>
  );
}

function NoteBlock({
  title,
  text,
  empty,
  tone,
  foot,
}: {
  title: string;
  text: string | null;
  empty: string;
  tone: "neutral" | "ok" | "bad";
  foot?: string | null;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3 text-sm",
        tone === "neutral" && "border-[#eaeaf0] bg-[#fafaff]",
        tone === "ok" && "border-[#cdeedf] bg-[#f3fcf8]",
        tone === "bad" && "border-[#f5c2c2] bg-[#fff7f7]",
      )}
    >
      <p
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase",
          tone === "neutral" && "text-[#aaabc2]",
          tone === "ok" && "text-[#08784c]",
          tone === "bad" && "text-[#d81c1c]",
        )}
      >
        <MessageSquareText className="size-3.5" />
        {title}
      </p>
      {text ? (
        <p className="mt-1.5 leading-relaxed text-[#2a2e67]">{text}</p>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">{empty}</p>
      )}
      {foot ? <p className="mt-2 text-[11px] text-[#aaabc2]">{foot}</p> : null}
    </div>
  );
}
