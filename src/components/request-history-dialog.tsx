"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  FileText,
  MessageSquareText,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRange, formatWorkDays, yearOf } from "@/lib/dates";
import type { LeaveStatus, RequestRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "approved" | "rejected";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("hu-HU");
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toLocaleUpperCase("hu-HU");
}

export function RequestHistoryDialog({
  personName,
  department,
  jobTitle,
  requests,
  open,
  onOpenChange,
}: {
  personName: string;
  department: string;
  jobTitle: string;
  requests: RequestRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [filter, setFilter] = useState<Filter>("approved");

  const counts = useMemo(() => {
    const approved = requests.filter((row) => row.status === "approved").length;
    const rejected = requests.filter((row) => row.status === "rejected").length;
    return { approved, rejected, all: requests.length };
  }, [requests]);

  const visible = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((row) => row.status === filter);
  }, [filter, requests]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setFilter("approved");
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        <DialogHeader className="space-y-4 border-b border-border px-6 pt-6 pb-5 text-left">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarFallback className="bg-[#fff1e4] text-sm font-semibold text-[#b86a1b]">
                  {initialsOf(personName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[#b86a1b] uppercase">
                  Korábbi kérelmek
                </p>
                <DialogTitle className="mt-0.5 text-xl font-semibold tracking-tight">
                  {personName}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {department} · {jobTitle}
                </DialogDescription>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[280px]">
              <StatChip label="Összes" value={counts.all} tone="neutral" />
              <StatChip label="Jóváhagyva" value={counts.approved} tone="ok" />
              <StatChip label="Elutasítva" value={counts.rejected} tone="bad" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "all", label: "Mind" },
                { id: "approved", label: "Jóváhagyott" },
                { id: "rejected", label: "Elutasított" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  filter === item.id
                    ? "bg-[#fff1e4] text-[#b86a1b]"
                    : "bg-[#f4f5f7] text-muted-foreground hover:bg-[#ececf3]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="max-h-[min(65vh,640px)] space-y-3 overflow-y-auto bg-[#f8f9fb] px-6 py-4">
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
              Nincs megjeleníthető kérelem ebben a szűrésben.
            </p>
          ) : (
            visible.map((row) => <HistoryCard key={row.id} row={row} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "ok" | "bad";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-center",
        tone === "neutral" && "border-[#eaeaf0] bg-white",
        tone === "ok" && "border-[#cdeedf] bg-[#e5fbf3]",
        tone === "bad" && "border-[#f5c2c2] bg-[#fff7f7]",
      )}
    >
      <p className="text-[10px] font-semibold tracking-wide text-[#aaabc2] uppercase">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tracking-tight",
          tone === "ok" && "text-[#08784c]",
          tone === "bad" && "text-[#d81c1c]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function HistoryCard({ row }: { row: RequestRow }) {
  const approved = row.status === "approved";
  return (
    <article
      className={cn(
        "rounded-xl border bg-white px-4 py-4 shadow-[0_8px_24px_rgba(42,46,103,0.03)]",
        approved ? "border-[#cdeedf]" : "border-[#f5c2c2]",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
              approved ? "bg-[#e5fbf3] text-[#08784c]" : "bg-[#fdecec] text-[#d81c1c]",
            )}
          >
            {approved ? <Check className="size-4" /> : <X className="size-4" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold tracking-tight">
                {formatRange(row.startDate, row.endDate)}
              </p>
              <StatusBadge status={row.status as LeaveStatus} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {yearOf(row.startDate)}
              {row.reviewedAt ? ` · döntés: ${row.reviewedAt}` : null}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Meta
          icon={<Clock3 className="size-3.5" />}
          label="Hossz"
          value={formatWorkDays(row.workDays, row.halfDay)}
        />
        <Meta
          icon={<FileText className="size-3.5" />}
          label="Jogcím"
          value={row.typeName}
        />
        <Meta
          icon={<CalendarDays className="size-3.5" />}
          label="Státusz"
          value={approved ? "Elfogadva" : "Elutasítva"}
        />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <NoteBlock
          title="Igénylő megjegyzése"
          empty="Nincs megjegyzés az igényhez."
          text={row.note}
          tone="neutral"
        />
        <NoteBlock
          title={approved ? "Felettes megjegyzése" : "Elutasítás indoka"}
          empty={approved ? "Nincs felettesi megjegyzés." : "Nincs rögzített indok."}
          text={row.reviewNote}
          tone={approved ? "ok" : "bad"}
        />
      </div>
    </article>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-[#f4f5f7] px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-[#aaabc2] uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#2a2e67]">{value}</p>
    </div>
  );
}

function NoteBlock({
  title,
  text,
  empty,
  tone,
}: {
  title: string;
  text: string | null;
  empty: string;
  tone: "neutral" | "ok" | "bad";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm",
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
    </div>
  );
}
