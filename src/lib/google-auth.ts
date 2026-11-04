export function googleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function googleClientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
}

export function googleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
}

/** Optional Google Workspace domain, e.g. virgo.hu */
export function googleHostedDomain() {
  const value = process.env.GOOGLE_HOSTED_DOMAIN?.trim();
  return value || null;
}

export function appOrigin(requestUrl: string) {
  const configured = process.env.APP_ORIGIN?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return new URL(requestUrl).origin;
}

export function googleCallbackUrl(requestUrl: string) {
  return `${appOrigin(requestUrl)}/api/auth/google/callback`;
}
