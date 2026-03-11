function _d(s: string): string {
  if (typeof atob === "function") return atob(s);
  return Buffer.from(s, "base64").toString("utf-8");
}

export const SUPABASE_URL = _d(
  "aHR0cHM6Ly93eGthdXFobGFpeXhwaWVibXZrYi5zdXBhYmFzZS5jbw=="
);
export const SUPABASE_ANON_KEY = _d(
  "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5kNGEyRjFjV2hzWVdsNWVIQnBaV0p0ZG10aUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpBeE9UZzBOeklzSW1WNGNDSTZNakE0TlRjM05EUTNNbjAucXJiVk84MFpVQ2pvYzlZZlZlV2pCNkFGZ1BVWTVSOUx0blNpUW9veWItVQ=="
);
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Supabase auth cookie name — must match in client.ts, server.ts, serverClient.ts, middleware.ts, and auth routes */
export const AUTH_COOKIE_NAME = "hlaiyxpiebmvkb-auth-token";
