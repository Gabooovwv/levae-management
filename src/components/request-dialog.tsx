"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createLeaveRequest } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDayCount } from "@/lib/dates";

export function RequestDialog({
  types,
  today,
  availableDays,
  pendingDays = 0,
}: {
  types: { id: number; name: string }[];
  today: string;
  availableDays: number;
  pendingDays?: number;
}) {
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState(String(types[0]?.id ?? ""));
  const [halfDay, setHalfDay] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pending, startTransition] = useTransition();

  const bookableDays = Math.max(availableDays - pendingDays, 0);
  const canRequest = bookableDays >= 0.5;
  const endMin = startDate || today;

  function resetForm() {
    setHalfDay(false);
    setStartDate("");
    setEndDate("");
  }

  function onStartDateChange(value: string) {
    setStartDate(value);
    // Az utolsó nap naptára a kezdőnaptól nyíljon; ha üres vagy korábbi, igazítsuk.
    if (!value) return;
    if (!endDate || endDate < value) setEndDate(value);
  }

  function onSubmit(formData: FormData) {
    if (halfDay) {
      formData.set("halfDay", "true");
      const start = String(formData.get("startDate") ?? "");
      formData.set("endDate", start);
    }
    startTransition(async () => {
      const result = await createLeaveRequest(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        resetForm();
        return;
      }
      toast.error(result.message);
    });
  }

  if (!canRequest) {
    return (
      <Button
        disabled
        className="h-12 px-5 text-sm font-semibold"
        title={
          availableDays < 0.5
            ? "Nincs több kiadható szabadnapod"
            : `A függő igényeid miatt nincs több kivehető nap (még ${formatDayCount(bookableDays)} nap)`
        }
      >
        <Plus />
        Új szabadságigény
      </Button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button className="h-12 px-5 text-sm font-semibold hover:bg-[#477bf3]" />
        }
      >
        <Plus />
        Új szabadságigény
      </DialogTrigger>
      <DialogContent className="sm:max-w-[470px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">Új szabadságigény</DialogTitle>
          <DialogDescription>
            A kérelmet a felettesed kapja meg, és ő fogadja el vagy utasítja el. Még{" "}
            {formatDayCount(bookableDays)} nap igényelhető.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="grid gap-3">
          <input type="hidden" name="leaveTypeId" value={typeId} />
          <div className="grid gap-1.5">
            <Label htmlFor="leaveType">Szabadság jogcíme</Label>
            <Select value={typeId} onValueChange={(value) => value && setTypeId(value)}>
              <SelectTrigger id="leaveType" className="h-10! w-full">
                <SelectValue>{types.find((type) => String(type.id) === typeId)?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="startDate">Kezdőnap</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              required
              min={today}
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#eaeaf0] bg-[#f4f5f7] px-3 py-3 text-sm font-semibold text-[#555885]">
            <input
              type="checkbox"
              name="halfDay"
              checked={halfDay}
              onChange={(event) => setHalfDay(event.target.checked)}
              className="size-4 rounded border-[#d4d5e1] accent-primary"
            />
            Fél nap
          </label>
          <div className="grid gap-1.5">
            <Label htmlFor="endDate" className={halfDay ? "text-muted-foreground" : undefined}>
              Utolsó nap
            </Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              required={!halfDay}
              min={endMin}
              value={halfDay ? startDate : endDate}
              onChange={(event) => setEndDate(event.target.value)}
              disabled={halfDay}
              className={halfDay ? "bg-muted opacity-60" : undefined}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="note">
              Megjegyzés <span className="font-normal text-muted-foreground">(nem kötelező)</span>
            </Label>
            <Textarea id="note" name="note" placeholder="Pl. családi utazás…" />
          </div>
          <DialogFooter className="bg-transparent">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={pending} className="font-semibold hover:bg-[#477bf3]">
              {pending ? "Küldés…" : "Igény benyújtása"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
