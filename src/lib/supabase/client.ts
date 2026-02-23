import { createClient as supabaseCreateClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const _U = "aHR0cHM6Ly93eGthdXFobGFpeXhwaWVibXZrYi5zdXBhYmFzZS5jbw==";
const _K =
  "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5kNGEyRjFjV2hzWVdsNWVIQnBaV0p0ZG10aUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpBeE9UZzBOeklzSW1WNGNDSTZNakE0TlRjM05EUTNNbjAucXJiVk84MFpVQ2pvYzlZZlZlV2pCNkFGZ1BVWTVSOUx0blNpUW9veWItVQ==";

function d(s: string): string {
  if (typeof atob === "function") return atob(s);
  return Buffer.from(s, "base64").toString("utf-8");
}

let _client: SupabaseClient<any, "public", any> | null = null; // eslint-disable-line

export function createClient() {
  if (!_client) {
    _client = supabaseCreateClient<any>(d(_U), d(_K));
  }
  return _client;
}

export function getSupabaseClient() {
  return createClient();
}
