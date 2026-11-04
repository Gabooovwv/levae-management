"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addApprovalNotifyEmail,
  listApprovalNotifyEmails,
  removeApprovalNotifyEmail,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApprovalNotifyEmails({
  initialEmails,
}: {
  initialEmails: { id: number; email: string }[];
}) {
  const router = useRouter();
  const [emails, setEmails] = useState(initialEmails);
  const [pending, startTransition] = useTransition();

  async function reload() {
    const rows = await listApprovalNotifyEmails();
    setEmails(rows);
    router.refresh();
  }

  function onAdd(formData: FormData) {
    startTransition(async () => {
      const result = await addApprovalNotifyEmail(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      (document.getElementById("notify-email") as HTMLInputElement | null)?.form?.reset();
      await reload();
    });
  }

  function onRemove(id: number) {
    startTransition(async () => {
      const result = await removeApprovalNotifyEmail(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      await reload();
    });
  }

  return (
    <div className="grid gap-5">
      <form action={onAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="notify-email">E-mail cím</Label>
          <Input
            id="notify-email"
            name="email"
            type="email"
            required
            placeholder="hr@virgo.hu"
            disabled={pending}
            className="h-10"
          />
        </div>
        <Button type="submit" disabled={pending} className="h-10 font-semibold hover:bg-[#477bf3]">
          <Plus />
          Hozzáadás
        </Button>
      </form>

      {emails.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-[#f8f9fb] px-4 py-8 text-center text-sm text-muted-foreground">
          Még nincs extra értesítési cím. A jóváhagyott kérelmekről egyelőre csak a dolgozó kap
          e-mailt.
        </p>
      ) : (
        <ul className="grid gap-2">
          {emails.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3"
            >
              <span className="truncate text-sm font-semibold">{row.email}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                aria-label={`${row.email} törlése`}
                className="text-muted-foreground hover:text-[#d81c1c]"
                onClick={() => onRemove(row.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
