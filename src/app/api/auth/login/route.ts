import { NextResponse } from "next/server";
import { authenticateLdap, LdapConfigError } from "@/lib/ldap";
import { verifyPassword } from "@/lib/password";
import { setSession } from "@/lib/session";
import { findRegisteredUserByEmail } from "@/lib/users";

function wantsJson(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json");
}

function fail(request: Request, origin: string, code: string) {
  if (wantsJson(request)) {
    return NextResponse.json({ ok: false, error: code }, { status: 401 });
  }
  return NextResponse.redirect(new URL(`/login?error=${code}`, origin), 303);
}

function success(request: Request, origin: string) {
  if (wantsJson(request)) {
    return NextResponse.json({ ok: true, redirectTo: "/" });
  }
  return NextResponse.redirect(new URL("/", origin), 303);
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) return fail(request, origin, "missing");

  try {
    const emailGuess = username.includes("@") ? username.toLowerCase() : null;
    const localUser = emailGuess ? await findRegisteredUserByEmail(emailGuess) : null;

    if (localUser?.passwordHash) {
      if (!(await verifyPassword(password, localUser.passwordHash))) {
        return fail(request, origin, "login_failed");
      }
      if (!localUser.active) return fail(request, origin, "inactive");
      await setSession(localUser.id);
      return success(request, origin);
    }

    let email: string | null = null;
    try {
      email = await authenticateLdap(username, password);
    } catch (error) {
      if (error instanceof LdapConfigError) return fail(request, origin, "ldap_config");
      if (error instanceof Error && error.name === "InvalidCredentialsError") {
        return fail(request, origin, "login_failed");
      }
      console.error(error);
      return fail(request, origin, "ldap_unavailable");
    }

    if (!email) return fail(request, origin, "login_failed");

    // LDAP success still requires an existing employee record in the app.
    const user = await findRegisteredUserByEmail(email);
    if (!user) return fail(request, origin, "not_found");
    if (user.passwordHash) return fail(request, origin, "login_failed");
    if (!user.active) return fail(request, origin, "inactive");

    await setSession(user.id);
    return success(request, origin);
  } catch (error) {
    console.error("login failed", error);
    return fail(request, origin, "login_failed");
  }
}
