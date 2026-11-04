"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const errors: Record<string, string> = {
  missing: "Add meg a felhasználónevet és a jelszót.",
  ldap_config: "Az LDAP kapcsolat még nincs beállítva.",
  login_failed: "Hibás felhasználónév vagy jelszó.",
  ldap_unavailable: "Az LDAP szerver most nem érhető el.",
  not_found: "Ehhez a fiókhoz nincs szabadságkezelő felhasználó. Szólj a HR-nek.",
  inactive: "Ez a fiók passzív. A belépéshez szólj a HR-nek vagy az adminnak.",
};

export function LoginForm({
  onSuccess,
  locked = false,
}: {
  onSuccess: (redirectTo: string) => void;
  locked?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = pending || locked;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    setPending(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      const data = (await response.json().catch(() => null)) as
        | { ok: true; redirectTo: string }
        | { ok: false; error: string }
        | null;

      if (!response.ok || !data || !data.ok) {
        const code = data && "error" in data ? data.error : "login_failed";
        setError(errors[code] ?? errors.login_failed);
        setPending(false);
        return;
      }

      onSuccess(data.redirectTo);
    } catch {
      setError(errors.login_failed);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" aria-busy={disabled}>
      {error ? (
        <p className="rounded-lg bg-[#fdecec] px-3 py-2 text-sm text-[#d81c1c]" role="alert">
          {error}
        </p>
      ) : null}
      <fieldset disabled={disabled} className="contents">
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
        <Button
          type="submit"
          disabled={disabled}
          className={cn("mt-2 h-12 w-full text-sm font-semibold hover:bg-[#477bf3]")}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Belépés…
            </>
          ) : (
            "Belépés"
          )}
        </Button>
      </fieldset>
    </form>
  );
}
