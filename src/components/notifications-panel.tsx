"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  clearMyNotifications,
  deleteMyNotification,
  listMyNotifications,
  markNotificationRead,
} from "@/app/actions";
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

const EXIT_MS = 240;
const STAGGER_MS = 90;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function NotificationsPanel({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [leavingIds, setLeavingIds] = useState<Set<number>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [pending, startTransition] = useTransition();
  const animatingRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listMyNotifications();
      setItems(rows);
      setLeavingIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  function markLeaving(id: number) {
    setLeavingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((row) => row.id !== id));
    setLeavingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function onOpenItem(item: NotificationItem) {
    if (leavingIds.has(item.id) || animatingRef.current) return;
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

  function onClearAll() {
    if (items.length === 0 || animatingRef.current) return;
    const snapshot = [...items];
    startTransition(async () => {
      animatingRef.current = true;
      setClearing(true);
      const result = await clearMyNotifications();
      if (!result.ok) {
        animatingRef.current = false;
        setClearing(false);
        toast.error(result.message);
        return;
      }

      for (const row of snapshot) {
        markLeaving(row.id);
        await sleep(STAGGER_MS);
      }
      await sleep(EXIT_MS);
      setItems([]);
      setLeavingIds(new Set());
      animatingRef.current = false;
      setClearing(false);
      toast.success(result.message);
      router.refresh();
    });
  }

  function onDeleteOne(item: NotificationItem) {
    if (leavingIds.has(item.id) || animatingRef.current) return;
    startTransition(async () => {
      markLeaving(item.id);
      const [result] = await Promise.all([deleteMyNotification(item.id), sleep(EXIT_MS)]);
      if (!result.ok) {
        setLeavingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        toast.error(result.message);
        return;
      }
      removeItem(item.id);
      toast.success(result.message);
      router.refresh();
    });
  }

  const busy = pending || clearing;
  const visibleCount = items.filter((item) => !leavingIds.has(item.id)).length;

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
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle>Értesítések</SheetTitle>
            <SheetDescription>
              A szabadságkérelmeid döntései és egyéb üzenetek. Az újak fehérek, az olvasottak
              szürkék.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-3" style={{ maxHeight: "calc(100vh - 110px)" }}>
            {!loading && visibleCount > 0 ? (
              <div className="mb-2 flex items-center justify-end px-1">
                <div className="group relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-[#fff1f1] hover:text-[#d81c1c]"
                    aria-label="Összes értesítés törlése"
                    disabled={busy}
                    onClick={onClearAll}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute top-full right-0 z-20 mt-1.5 w-max max-w-50 rounded-md bg-[#2a2e67] px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    Minden értesítést törlünk
                  </span>
                </div>
              </div>
            ) : null}
            {loading ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">Betöltés…</p>
            ) : items.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Nincs megjeleníthető értesítés.
              </p>
            ) : (
              <ul className="flex flex-col">
                {items.map((item) => {
                  const leaving = leavingIds.has(item.id);
                  return (
                    <li
                      key={item.id}
                      aria-hidden={leaving}
                      className={cn(
                        "overflow-hidden transition-[max-height,opacity,transform,margin] duration-[240ms] ease-out",
                        leaving
                          ? "pointer-events-none mb-0 max-h-0 translate-x-4 opacity-0"
                          : "mb-2 max-h-48 translate-x-0 opacity-100 last:mb-0",
                      )}
                    >
                        <div
                          className={cn(
                            "flex items-start gap-1 rounded-xl border transition-colors",
                            item.read
                              ? "border-transparent bg-[#ececf1] text-[#8a8ba8]"
                              : "border-border bg-white",
                          )}
                        >
                          <button
                            type="button"
                            disabled={busy || leaving}
                            onClick={() => onOpenItem(item)}
                            className={cn(
                              "min-w-0 flex-1 rounded-xl px-4 py-3 text-left transition-colors",
                              item.read ? "hover:bg-[#e4e5ec]" : "hover:bg-[#f8faff]",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  "text-sm",
                                  item.read
                                    ? "font-medium"
                                    : "font-semibold text-foreground",
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
                          <div className="shrink-0 pt-2.5 pr-2">
                            <div className="group relative">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:bg-[#fff1f1] hover:text-[#d81c1c]"
                                aria-label="Értesítés törlése"
                                disabled={busy || leaving}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDeleteOne(item);
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                              <span
                                role="tooltip"
                                className="pointer-events-none absolute top-1/2 right-full z-20 mr-1.5 w-max -translate-y-1/2 rounded-md bg-[#2a2e67] px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                              >
                                Értesítés törlése
                              </span>
                            </div>
                          </div>
                        </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
