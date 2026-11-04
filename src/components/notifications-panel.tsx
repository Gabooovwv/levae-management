"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { listMyNotifications, markNotificationRead } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: number;
  title: string;
  detail: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export function NotificationsPanel({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listMyNotifications();
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  function onOpenItem(item: NotificationItem) {
    startTransition(async () => {
      if (!item.read) {
        await markNotificationRead(item.id);
        setItems((prev) =>
          prev.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
        );
      }
      setOpen(false);
      router.push(item.href);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="relative bg-white"
        aria-label="Értesítések"
        onClick={() => setOpen(true)}
      >
        <Bell />
        {unreadCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d81c1c] px-1 text-[11px] font-semibold text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-[420px] bg-white p-0 sm:max-w-[420px]">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle>Értesítések</SheetTitle>
            <SheetDescription>
              A szabadságkérelmeid döntései és egyéb üzenetek. Az újak fehérek, az olvasottak
              szürkék.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-3" style={{ maxHeight: "calc(100vh - 110px)" }}>
            {loading ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">Betöltés…</p>
            ) : items.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Nincs megjeleníthető értesítés.
              </p>
            ) : (
              <ul className="grid gap-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onOpenItem(item)}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                        item.read
                          ? "border-transparent bg-[#ececf1] text-[#8a8ba8] hover:bg-[#e4e5ec]"
                          : "border-border bg-white hover:border-primary/40 hover:bg-[#f8faff]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm",
                            item.read ? "font-medium" : "font-semibold text-foreground",
                          )}
                        >
                          {item.title}
                        </p>
                        {!item.read ? (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-[#d81c1c]" />
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          item.read ? "text-[#9a9bb0]" : "text-muted-foreground",
                        )}
                      >
                        {item.detail}
                      </p>
                      <p
                        className={cn(
                          "mt-2 text-[11px]",
                          item.read ? "text-[#aaabc2]" : "text-[#8a8ba8]",
                        )}
                      >
                        {item.createdAt.slice(0, 10)}
                        {item.read ? " · olvasva" : " · új"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
