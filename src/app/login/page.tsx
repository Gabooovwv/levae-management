import { redirect } from "next/navigation";
import { LoginView } from "@/app/login/login-view";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const errors: Record<string, string> = {
  missing: "Add meg a felhasználónevet és a jelszót.",
  ldap_config: "Az LDAP kapcsolat még nincs beállítva.",
  login_failed: "Hibás felhasználónév vagy jelszó.",
  ldap_unavailable: "Az LDAP szerver most nem érhető el.",
  google_config: "A Google belépés még nincs beállítva.",
  google_failed: "A Google belépés nem sikerült. Próbáld újra.",
  google_not_registered:
    "Ez a Google-fiók nincs regisztrálva a szabadságkezelőben. Csak a rendszerben lévő e-mail címmel lehet belépni.",
  not_found: "Ehhez a fiókhoz nincs szabadságkezelő felhasználó. Szólj a HR-nek.",
  inactive: "Ez a fiók passzív. A belépéshez szólj a HR-nek vagy az adminnak.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    });
    if (user) redirect("/");
    redirect("/api/auth/logout");
  }

  const { error } = await searchParams;
  const message = error ? errors[error] : undefined;

  return <LoginView initialError={message} />;
}
