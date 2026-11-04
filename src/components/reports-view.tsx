"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDayCount } from "@/lib/dates";
import type { ReportSnapshot } from "@/lib/data";
import { cn } from "@/lib/utils";

const monthLabels = [
  "Jan",
  "Febr",
  "Márc",
  "Ápr",
  "Máj",
  "Jún",
  "Júl",
  "Aug",
  "Szept",
  "Okt",
  "Nov",
  "Dec",
];

export function ReportsView({
  own,
  team,
  company,
}: {
  own: ReportSnapshot | null;
  team: ReportSnapshot | null;
  company: ReportSnapshot | null;
}) {
  const tabs = [
    own ? ({ id: "own" as const, label: "Saját", report: own }) : null,
    team ? ({ id: "team" as const, label: "Csapatom", report: team }) : null,
    company ? ({ id: "company" as const, label: "Szervezet", report: company }) : null,
  ].filter(Boolean) as { id: "own" | "team" | "company"; label: string; report: ReportSnapshot }[];

  const [active, setActive] = useState(tabs[0]?.id ?? "own");
  const current = tabs.find((tab) => tab.id === active)?.report ?? tabs[0]?.report;

  if (!current) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-[#f8f9fb] px-4 py-10 text-center text-sm text-muted-foreground">
        Nincs megjeleníthető riport.
      </p>
    );
  }

  const peak = Math.max(...current.months, 1);
  const typeBase = Math.max(current.approvedDays + current.pendingDays, 1);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
            Áttekintés
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Riportok</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {current.year}-os összesítő · {current.description}
          </p>
        </div>
        {tabs.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  active === tab.id
                    ? "bg-[#e8effd] text-primary"
                    : "bg-[#f4f5f7] text-muted-foreground hover:bg-[#ececf3]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Létszám" value={String(current.headcount)} unit="fő" />
        <Stat
          label="Jóváhagyott"
          value={formatDayCount(current.approvedDays)}
          unit="nap"
        />
        <Stat
          label="Függőben"
          value={formatDayCount(current.pendingDays)}
          unit="nap"
        />
        <Stat
          label="Kiadható keret"
          value={formatDayCount(current.availableDays)}
          unit={`/ ${formatDayCount(current.totalDays)} nap`}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
          <CardHeader>
            <CardTitle>Havi felhasználás</CardTitle>
            <CardDescription>Jóváhagyott, keretből levont munkanapok</CardDescription>
          </CardHeader>
          <CardContent className="flex h-48 items-end gap-2">
            {current.months.map((days, index) => (
              <div key={monthLabels[index]} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-36 w-full items-end rounded-md bg-[#f4f5f7]">
                  <div
                    className="w-full rounded-md bg-primary"
                    style={{ height: `${Math.max(4, Math.round((days / peak) * 100))}%` }}
                    title={`${formatDayCount(days)} nap`}
                  />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {monthLabels[index]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
          <CardHeader>
            <CardTitle>Jogcímek</CardTitle>
            <CardDescription>Nem elutasított igények</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {current.types.length === 0 ? (
              <p className="text-sm text-muted-foreground">Még nincs rögzített igény.</p>
            ) : (
              current.types.map((type) => (
                <div key={type.name} className="grid gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{type.name}</span>
                    <span className="text-muted-foreground">
                      {formatDayCount(type.days)} nap · {type.count} igény
                    </span>
                  </div>
                  <Progress value={Math.round((type.days / typeBase) * 100)} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {current.scope === "own" ? (
        <Card className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
          <CardHeader>
            <CardTitle>Összefoglaló</CardTitle>
            <CardDescription>Saját keret és döntések</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Summary
              label="Elutasított"
              value={`${formatDayCount(current.rejectedDays)} nap`}
              foot={`${current.rejectedCount} igény`}
            />
            <Summary
              label="Felhasznált keret"
              value={`${formatDayCount(current.approvedDays)} nap`}
              foot={`a ${formatDayCount(current.totalDays)} napos keretből`}
            />
            <Summary
              label="Még kiadható"
              value={`${formatDayCount(current.availableDays)} nap`}
              foot="jóváhagyott napok után"
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
          <CardHeader>
            <CardTitle>{current.scope === "team" ? "Beosztottak" : "Részlegek"}</CardTitle>
            <CardDescription>
              {current.scope === "team"
                ? "Közvetlen beosztottak kerete és igényei"
                : "Létszám és napok részlegenként"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {current.scope === "team" ? (
              current.people.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nincs beosztott.</p>
              ) : (
                current.people.map((person) => {
                  const usedRatio = person.totalDays
                    ? Math.round((person.approvedDays / person.totalDays) * 100)
                    : 0;
                  return (
                    <div key={person.id} className="grid gap-1">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-semibold">
                          {person.name}{" "}
                          <span className="font-normal text-muted-foreground">
                            {person.department}
                          </span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {formatDayCount(person.approvedDays)} jóváhagyva ·{" "}
                          {formatDayCount(person.pendingDays)} függő ·{" "}
                          {formatDayCount(person.availableDays)}/
                          {formatDayCount(person.totalDays)} kiadható
                        </span>
                      </div>
                      <Progress value={usedRatio} />
                    </div>
                  );
                })
              )
            ) : current.departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nincs részlegadat.</p>
            ) : (
              current.departments.map((department) => {
                const quota = department.people * 25;
                const ratio = quota ? Math.round((department.approvedDays / quota) * 100) : 0;
                return (
                  <div key={department.name} className="grid gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">
                        {department.name}{" "}
                        <span className="font-normal text-muted-foreground">
                          {department.people} fő
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {formatDayCount(department.approvedDays)} jóváhagyva ·{" "}
                        {formatDayCount(department.pendingDays)} függőben
                      </span>
                    </div>
                    <Progress value={ratio} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card className="gap-2 py-4 shadow-[0_12px_35px_rgba(42,46,103,0.04)] ring-border">
      <CardHeader className="px-4 pb-0">
        <CardDescription className="font-semibold">{label}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-2xl font-semibold tracking-tight">
          {value}{" "}
          <span className="text-xs font-semibold text-muted-foreground">{unit}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function Summary({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div className="rounded-xl bg-[#f4f5f7] px-4 py-3">
      <p className="text-[11px] font-semibold tracking-wide text-[#aaabc2] uppercase">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{foot}</p>
    </div>
  );
}
