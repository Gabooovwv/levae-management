"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="mt-2 h-12 w-full text-sm font-semibold hover:bg-[#477bf3]"
    >
      {pending ? "Belépés…" : "Belépés"}
    </Button>
  );
}

export function LoginForm() {
  return (
    <form action="/api/auth/login" method="post" className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="username" className="text-[#3f4376]">
          Felhasználónév vagy e-mail
        </Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          required
          className="h-12 bg-[#f4f5f7] px-3"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password" className="text-[#3f4376]">
          Jelszó
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 bg-[#f4f5f7] px-3"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
