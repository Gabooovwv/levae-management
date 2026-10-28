"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  LayoutGrid,
  Menu,
  Network,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { setCompany } from "@/app/actions";
import { VirgoLogo } from "@/components/virgo-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ShellData } from "@/lib/types";
import { cn } from "@/lib/utils";

const workspace = [
  { href: "/", label: "Áttekintés", icon: LayoutGrid },
  { href: "/szabadsagaim", label: "Szabadságaim", icon: CalendarDays },
  { href: "/naptar", label: "Naptár", icon: CalendarDays },
  { href: "/jovahagyasok", label: "Jóváhagyások", icon: Check },
];

const titles: Record<string, string> = {
  "/": "Áttekintés",
  "/szabadsagaim": "Szabadságaim",
  "/naptar": "Naptár",
  "/jovahagyasok": "Jóváhagyások",
  "/szervezet": "Dolgozók",
  "/csapatom": "Csapatom",
  "/riportok": "Riportok",
};

function NavLinks({
  data,
  onNavigate,
}: {
  data: ShellData;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const organization = [
    ...(data.user.role === "admin"
      ? [{ href: "/szervezet", label: "Dolgozók", icon: Network }]
      : []),
    { href: "/csapatom", label: "Csapatom", icon: Users },
    { href: "/riportok", label: "Riportok", icon: BarChart3 },
  ];

  function item(link: (typeof workspace)[number]) {
    const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
    const Icon = link.icon;
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#555885] transition-colors hover:bg-[#f4f5f7]",
          active && "bg-[#e8effd] text-primary",
        )}
      >
        <Icon className="size-4" />
        <span>{link.label}</span>
        {link.href === "/jovahagyasok" && data.pendingApprovals > 0 ? (
          <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[11px] text-primary">
            {data.pendingApprovals}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div className="grid gap-7">
      <div>
        <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-[#aaabc2] uppercase">
          Munkaterület
        </p>
        <nav className="grid gap-1">{workspace.map(item)}</nav>
      </div>
      <div>
        <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-[#aaabc2] uppercase">
          Szervezet
        </p>
        <nav className="grid gap-1">{organization.map(item)}</nav>
      </div>
    </div>
  );
}

function SidebarBody({ data, onNavigate }: { data: ShellData; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-8">
      <div className="px-2">
        <VirgoLogo className="h-8 w-20 text-[#2a2e67]" />
        <p className="mt-2 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Szabadságkezelés
        </p>
      </div>
      <NavLinks data={data} onNavigate={onNavigate} />
      <div className="mt-auto">
        <div className="mb-4 rounded-xl border border-border bg-[#f4f5f7] p-4">
          <strong className="text-sm">Segíthetünk?</strong>
          <p className="mt-1 mb-3 text-xs text-muted-foreground">
            Kérdésed van a szabadságkereteddel kapcsolatban?
          </p>
          <Dialog>
            <DialogTrigger render={<Button variant="outline" size="sm" className="bg-white font-semibold" />}>
              HR-kapcsolat
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>HR kapcsolattartók</DialogTitle>
                <DialogDescription>
                  A People & Culture csapat segít a kerettel és a jogcímekkel kapcsolatos kérdésekben.
                </DialogDescription>
              </DialogHeader>
              <ul className="grid gap-3">
                {data.hrContacts.map((contact) => (
                  <li key={contact.email} className="rounded-lg bg-[#f4f5f7] px-3 py-2">
                    <p className="text-sm font-semibold">{contact.name}</p>
                    <a className="text-sm text-primary" href={`mailto:${contact.email}`}>
                      {contact.email}
                    </a>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Avatar className="bg-[#f3dcca] text-[#8a5738]">
            <AvatarFallback className="bg-[#f3dcca] font-semibold text-[#8a5738]">
              {data.user.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {data.user.lastName} {data.user.firstName}
            </p>
            <p className="text-xs text-muted-foreground">{data.user.jobTitle}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-xs font-semibold text-[#555885] hover:text-primary">
              Kilépés
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function ShellFrame({ data, children }: { data: ShellData; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const title = titles[pathname] ?? "Szabadságkezelés";

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-white px-4 py-7 lg:flex lg:flex-col">
        <SidebarBody data={data} />
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button variant="outline" size="icon" className="lg:hidden" aria-label="Menü" />
                }
              >
                <Menu />
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-white p-5">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menü</SheetTitle>
                </SheetHeader>
                <SidebarBody data={data} onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Munkaterület <span className="px-1.5 text-[#c0c4d1]">/</span>
              <span className="font-semibold text-foreground">{title}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(data.selectedCompanyId)}
              onValueChange={(value) => {
                if (!value) return;
                startTransition(async () => {
                  const result = await setCompany(Number(value));
                  if (result.ok) toast.success(result.message);
                  else toast.error(result.message);
                });
              }}
            >
              <SelectTrigger className="h-10! w-[168px] bg-white" disabled={pending} aria-label="Cég kiválasztása">
                <SelectValue>
                  {data.companies.find((company) => company.id === data.selectedCompanyId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {data.companies.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="icon" className="relative bg-white" aria-label="Értesítések" />
                }
              >
                <Bell />
                {data.notifications.length > 0 ? (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#d81c1c] ring-2 ring-white" />
                ) : null}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Értesítések</DropdownMenuLabel>
                {data.notifications.length === 0 ? (
                  <DropdownMenuItem disabled>Nincs új értesítés</DropdownMenuItem>
                ) : (
                  data.notifications.map((item) => (
                    <DropdownMenuItem key={item.id} render={<Link href={item.href} />}>
                      <span>
                        <span className="block font-semibold">{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.detail}</span>
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Avatar>
              <AvatarFallback className="bg-[#f3dcca] text-xs font-semibold text-[#8a5738]">
                {data.user.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 pb-12 md:px-8">{children}</main>
      </div>
    </div>
  );
}
