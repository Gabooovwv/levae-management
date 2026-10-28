import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

async function logout(request: Request) {
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}

export async function GET(request: Request) {
  return logout(request);
}

export async function POST(request: Request) {
  return logout(request);
}
