import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  googleAuthConfigured,
  googleCallbackUrl,
  googleClientId,
  googleClientSecret,
  googleHostedDomain,
} from "@/lib/google-auth";
import { setSession } from "@/lib/session";
import { findRegisteredUserByEmail } from "@/lib/users";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, origin));

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const saved = jar.get("virgo_google_state")?.value;
  jar.delete("virgo_google_state");

  if (!code || !state || !saved || state !== saved) return fail("google_failed");
  if (!googleAuthConfigured()) return fail("google_config");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      redirect_uri: googleCallbackUrl(request.url),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    console.error("google token exchange failed", await tokenResponse.text());
    return fail("google_failed");
  }

  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) return fail("google_failed");

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) return fail("google_failed");

  const profile = (await profileResponse.json()) as {
    email?: string;
    email_verified?: boolean;
    hd?: string;
  };
  if (!profile.email || profile.email_verified === false) return fail("google_failed");

  const hostedDomain = googleHostedDomain();
  if (hostedDomain) {
    const emailDomain = profile.email.split("@")[1]?.toLowerCase();
    const profileHd = profile.hd?.toLowerCase();
    if (emailDomain !== hostedDomain.toLowerCase() && profileHd !== hostedDomain.toLowerCase()) {
      return fail("google_failed");
    }
  }

  // Only users already provisioned in the app may sign in — never auto-create.
  const user = await findRegisteredUserByEmail(profile.email);
  if (!user) return fail("google_not_registered");
  if (!user.active) return fail("inactive");

  await setSession(user.id);
  return NextResponse.redirect(new URL("/", origin));
}
