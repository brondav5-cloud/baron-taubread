import { createBrowserClient } from "@supabase/ssr";

const _U = "aHR0cHM6Ly93eGthdXFobGFpeXhwaWVibXZrYi5zdXBhYmFzZS5jbw==";
const _K =
  "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5kNGEyRjFjV2hzWVdsNWVIQnBaV0p0ZG10aUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpBeE9UZzBOeklzSW1WNGNDSTZNakE0TlRjM05EUTNNbjAucXJiVk84MFpVQ2pvYzlZZlZlV2pCNkFGZ1BVWTVSOUx0blNpUW9veWItVQ==";

function _d(s: string): string {
  if (typeof atob === "function") return atob(s);
  return Buffer.from(s, "base64").toString("utf-8");
}

export function createClient() {
  return createBrowserClient(_d(_U), _d(_K), {
    cookieOptions: {
      name: "hlaiyxpiebmvkb-auth-token",
      path: "/",
    },
  });
}

export function getSupabaseClient() {
  return createClient();
}
