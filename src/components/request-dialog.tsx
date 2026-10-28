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

export function RequestDialog({
  types,
  today,
}: {
  types: { id: number; name: string }[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState(String(types[0]?.id ?? ""));
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createLeaveRequest(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        return;
      }
      toast.error(result.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            A kérelmet a felettesed kapja meg, és ő fogadja el vagy utasítja el.
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
            <Input id="startDate" name="startDate" type="date" required min={today} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="endDate">Utolsó nap</Label>
            <Input id="endDate" name="endDate" type="date" required min={today} />
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
