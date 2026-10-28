import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, url.origin));

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const saved = jar.get("virgo_google_state")?.value;
  jar.delete("virgo_google_state");

  if (!code || !state || !saved || state !== saved) return fail("google_failed");
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return fail("google_config");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) return fail("google_failed");
  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) return fail("google_failed");

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) return fail("google_failed");

  const profile = (await profileResponse.json()) as { email?: string; email_verified?: boolean };
  if (!profile.email || profile.email_verified === false) return fail("google_failed");

  const user = await prisma.user.findFirst({
    where: { email: profile.email },
    select: { id: true, active: true },
  });
  if (!user) return fail("not_found");
  if (!user.active) return fail("inactive");

  await setSession(user.id);
  return NextResponse.redirect(new URL("/", url.origin));
}
