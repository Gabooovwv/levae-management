import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateLdap, LdapConfigError } from "@/lib/ldap";
import { verifyPassword } from "@/lib/password";
import { setSession } from "@/lib/session";

function fail(origin: string, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, origin), 303);
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) return fail(origin, "missing");

  try {
    const emailGuess = username.includes("@") ? username.toLowerCase() : null;
    const localUser = emailGuess
      ? await prisma.user.findFirst({
          where: { email: emailGuess },
          select: { id: true, passwordHash: true },
        })
      : null;

    if (localUser?.passwordHash) {
      if (!(await verifyPassword(password, localUser.passwordHash))) {
        return fail(origin, "login_failed");
      }
      await setSession(localUser.id);
      return NextResponse.redirect(new URL("/", origin), 303);
    }

    let email: string | null = null;
    try {
      email = await authenticateLdap(username, password);
    } catch (error) {
      if (error instanceof LdapConfigError) return fail(origin, "ldap_config");
      if (error instanceof Error && error.name === "InvalidCredentialsError") {
        return fail(origin, "login_failed");
      }
      console.error(error);
      return fail(origin, "ldap_unavailable");
    }

    if (!email) return fail(origin, "login_failed");

    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, passwordHash: true },
    });
    if (!user) return fail(origin, "not_found");
    if (user.passwordHash) return fail(origin, "login_failed");

    await setSession(user.id);
    return NextResponse.redirect(new URL("/", origin), 303);
  } catch (error) {
    console.error("login failed", error);
    return fail(origin, "login_failed");
  }
}
