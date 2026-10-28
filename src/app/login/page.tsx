import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { Button } from "@/components/ui/button";
import { VirgoLogo } from "@/components/virgo-logo";
import { getSession } from "@/lib/session";

const errors: Record<string, string> = {
  missing: "Add meg a felhasználónevet és a jelszót.",
  ldap_config: "Az LDAP kapcsolat még nincs beállítva.",
  login_failed: "Hibás felhasználónév vagy jelszó.",
  ldap_unavailable: "Az LDAP szerver most nem érhető el.",
  google_config: "A Google belépés még nincs beállítva.",
  google_failed: "A Google belépés nem sikerült. Próbáld újra.",
  not_found: "Ehhez a fiókhoz nincs szabadságkezelő felhasználó. Szólj a HR-nek.",
};

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72A5.4 5.4 0 0 1 3.7 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.02-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSession()) redirect("/");

  const { error } = await searchParams;
  const message = error ? errors[error] : undefined;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="relative flex min-h-[42vh] flex-col justify-between overflow-x-hidden bg-[linear-gradient(165deg,#477bf3_0%,#195af0_42%,#1246c4_100%)] px-8 py-10 text-white lg:min-h-screen lg:px-14 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(circle_at_20%_18%,black,transparent_68%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-10 size-56 rounded-full bg-[#0af09b]/25 blur-3xl"
        />
        <VirgoLogo className="relative h-8 w-20 text-white" />
        <div className="relative max-w-md lg:my-8">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/75 uppercase">
            Szabadságkezelés
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
            A csapat szabadsága egy helyen.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">
            Igénylés, jóváhagyás és a naptár a Virgo arculatán, vállalati Google- vagy LDAP-belépéssel.
          </p>
          <div className="mt-8 hidden max-w-sm rounded-2xl border border-white/25 bg-white/12 p-4 shadow-[0_18px_40px_rgba(18,40,120,0.25)] backdrop-blur-md lg:block">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Következő távollétek</p>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white/80">
                hamarosan
              </span>
            </div>
            <ul className="mt-3 divide-y divide-white/15">
              {[
                ["NB", "Nagy Barbara", "okt. 29.", "1 nap"],
                ["TF", "Tóth Ferenc", "nov. 2–3.", "2 nap"],
                ["VS", "Varga Sára", "nov. 9.", "1 nap"],
              ].map(([initials, name, when, days]) => (
                <li key={name} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-0.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20 text-[11px] font-semibold">
                    {initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{name}</span>
                    <span className="block text-xs text-white/70">{when}</span>
                  </span>
                  <span className="rounded-full bg-[#0af09b]/20 px-2 py-0.5 text-[11px] font-semibold text-[#b8ffe6]">
                    {days}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ul className="relative mt-8 flex flex-wrap gap-2 lg:mt-0">
          {["Igénylés", "Jóváhagyás", "Csapatnaptár"].map((item) => (
            <li
              key={item}
              className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white/90"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex items-center justify-center bg-[#2a2e67] px-6 py-12 lg:px-12">
        <div className="w-full max-w-[420px] rounded-2xl bg-white px-7 py-8 text-[#2a2e67] shadow-[0_24px_60px_rgba(22,23,41,0.28)]">
          <h2 className="text-2xl font-semibold tracking-tight">Jelentkezz be</h2>
          <p className="mt-2 text-sm leading-6 text-[#555885]">
            Google-fiókkal vagy a vállalati azonosítóddal és jelszavaddal léphetsz be.
          </p>
          {message ? (
            <p className="mt-5 rounded-lg bg-[#fdecec] px-3 py-2 text-sm text-[#d81c1c]" role="alert">
              {message}
            </p>
          ) : null}
          <form action="/api/auth/google" className="mt-6">
            <Button
              type="submit"
              variant="outline"
              className="h-12 w-full bg-white text-sm font-semibold text-[#2a2e67] hover:bg-[#f4f5f7]"
            >
              <GoogleMark />
              Folytatás Google-fiókkal
            </Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-[11px] font-semibold tracking-[0.16em] text-[#aaabc2] uppercase">
            <span className="h-px flex-1 bg-[#eaeaf0]" />
            vagy
            <span className="h-px flex-1 bg-[#eaeaf0]" />
          </div>
          <LoginForm />
          <p className="mt-6 text-xs leading-5 text-[#555885]">
            A fiókot a HR rögzíti. A belépés a virgo.hu arculatú vállalati azonosítással történik.
          </p>
        </div>
      </section>
    </div>
  );
}
