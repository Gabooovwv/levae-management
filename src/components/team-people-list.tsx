"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { RequestHistoryDialog } from "@/components/request-history-dialog";
import {
  ReviewRequestDialog,
  type ReviewableRequest,
} from "@/components/review-request-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDayCount, formatRange, formatWorkDays } from "@/lib/dates";
import type { BalanceSnapshot, RequestRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type TeamPerson = {
  id: number;
  name: string;
  initials: string;
  department: string;
  jobTitle: string;
  balance: BalanceSnapshot;
  next: RequestRow | null;
  history: RequestRow[];
};

export function TeamPeopleList({ people }: { people: TeamPerson[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReviewableRequest | null>(null);
  const [historyPerson, setHistoryPerson] = useState<TeamPerson | null>(null);

  function openPending(person: TeamPerson) {
    if (!person.next || person.next.status !== "pending") return;
    setSelected({
      id: person.next.id,
      startDate: person.next.startDate,
      endDate: person.next.endDate,
      workDays: person.next.workDays,
      halfDay: person.next.halfDay,
      typeName: person.next.typeName,
      note: person.next.note,
      personName: person.name,
      department: person.department,
    });
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {people.map((person) => {
          const pendingNext = person.next?.status === "pending";
          const historyCount = person.history.length;
          return (
            <Card key={person.id} className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-[#e8effd] font-semibold text-primary">
                        {person.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{person.name}</CardTitle>
                      <CardDescription>
                        {person.department} · {person.jobTitle}
                      </CardDescription>
                    </div>
                  </div>
                  {historyCount > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-[#e67e22] hover:bg-[#fff1e4] hover:text-[#d35400]"
                      title={`Korábbi kérelmek (${historyCount})`}
                      aria-label={`Korábbi kérelmek (${historyCount})`}
                      onClick={() => setHistoryPerson(person)}
                    >
                      <History className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-end justify-between">
                  <p className="text-sm text-muted-foreground">Felhasználható keret</p>
                  <p className="text-2xl font-semibold tracking-tight">
                    {formatDayCount(person.balance.availableDays)}
                    <span className="ml-1 text-xs font-semibold text-[#aaabc2]">
                      / {formatDayCount(person.balance.totalDays)} nap
                    </span>
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#eaeaf0]">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${person.balance.totalDays ? Math.round((person.balance.usedDays / person.balance.totalDays) * 100) : 0}%`,
                    }}
                  />
                </div>
                {person.next ? (
                  pendingNext ? (
                    <button
                      type="button"
                      onClick={() => openPending(person)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg bg-[#fff1e4] px-3 py-2 text-left transition-colors",
                        "hover:bg-[#ffe4c8] hover:ring-2 hover:ring-[#b86a1b]/30",
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {formatRange(person.next.startDate, person.next.endDate)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatWorkDays(person.next.workDays, person.next.halfDay)} · kattints az
                          elbíráláshoz
                        </p>
                      </div>
                      <StatusBadge status={person.next.status} />
                    </button>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg bg-[#f4f5f7] px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {formatRange(person.next.startDate, person.next.endDate)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatWorkDays(person.next.workDays, person.next.halfDay)}
                        </p>
                      </div>
                      <StatusBadge status={person.next.status} />
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Nincs közelgő távollét.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ReviewRequestDialog
        request={selected}
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
        onReviewed={() => {
          setSelected(null);
          router.refresh();
        }}
      />

      <RequestHistoryDialog
        personName={historyPerson?.name ?? ""}
        department={historyPerson?.department ?? ""}
        jobTitle={historyPerson?.jobTitle ?? ""}
        requests={historyPerson?.history ?? []}
        open={historyPerson !== null}
        onOpenChange={(next) => {
          if (!next) setHistoryPerson(null);
        }}
      />
    </>
  );
}
