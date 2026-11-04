"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LoginReveal({
  children,
  className,
  delayMs = 0,
  variant = "up",
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  variant?: "up" | "card" | "fade";
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setReady(true);
      return;
    }
    let timeoutId = 0;
    let frame2 = 0;
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        timeoutId = window.setTimeout(() => setReady(true), delayMs);
      });
    });
    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
      window.clearTimeout(timeoutId);
    };
  }, [delayMs]);

  return (
    <div
      className={cn(
        "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        ready ? "translate-y-0 scale-100 opacity-100" : "opacity-0",
        !ready && variant === "up" && "translate-y-4",
        !ready && variant === "card" && "translate-y-5 scale-[0.98]",
        !ready && variant === "fade" && "translate-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LoginOrbs() {
  return (
    <>
      <div
        aria-hidden
        className="login-orb pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden
        className="login-orb-slow pointer-events-none absolute -bottom-20 left-10 size-56 rounded-full bg-[#0af09b]/25 blur-3xl"
      />
    </>
  );
}
