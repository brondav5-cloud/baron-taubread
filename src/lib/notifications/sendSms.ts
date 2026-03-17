import { getSupabaseAdmin } from "@/lib/supabase/admin";

const API_TOKEN = process.env.SMSPLUS_API_TOKEN ?? "";
const SENDER = process.env.SMSPLUS_SENDER || "BARON";
const PROFILE_ID = process.env.SMSPLUS_PROFILE_ID;

const API_URL = "https://webapi.mymarketing.co.il/api/smscampaign/OperationalMessage";

export interface SmsPayload {
  to: string;
  body: string;
}

const MAX_SMS_CHARS = 200;
const SMS_WINDOW_START_HOUR = 7;
const SMS_WINDOW_END_HOUR = 20;

interface SmsOutboxRow {
  id: string;
  to_phone: string;
  body: string;
  attempts: number;
}

function toSmsSafeBody(text: string): string {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  const chars = Array.from(normalized);
  if (chars.length <= MAX_SMS_CHARS) return normalized;
  return `${chars.slice(0, MAX_SMS_CHARS - 1).join("")}…`;
}

function getIsraelHour(now: Date = new Date()): number {
  const hourText = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  return Number(hourText);
}

function isWithinSmsWindow(now: Date = new Date()): boolean {
  const hour = getIsraelHour(now);
  return hour >= SMS_WINDOW_START_HOUR && hour < SMS_WINDOW_END_HOUR;
}

/**
 * Normalize phone number for Israeli format (05xxxxxxxx or 5xxxxxxxx)
 */
function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.length < 9) return null;

  if (cleaned.startsWith("+972")) {
    return "0" + cleaned.slice(4);
  }
  if (cleaned.startsWith("972")) {
    return "0" + cleaned.slice(3);
  }
  if (cleaned.startsWith("5") && !cleaned.startsWith("05") && cleaned.length === 9) {
    return "0" + cleaned;
  }
  if (cleaned.startsWith("05") && cleaned.length >= 10) {
    return cleaned;
  }
  return cleaned;
}

async function queueSms(payload: SmsPayload): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("sms_outbox").insert({
      to_phone: payload.to,
      body: payload.body,
      status: "pending",
      attempts: 0,
    });
    if (error) {
      console.error("[sendSms] failed to queue SMS:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[sendSms] failed to queue SMS:", err);
    return false;
  }
}

async function sendSmsNow(payload: SmsPayload): Promise<boolean> {
  if (!API_TOKEN) {
    console.warn("[sendSms] ActiveTrail not configured (SMSPLUS_API_TOKEN)");
    return false;
  }

  const normalizedPhone = normalizePhone(payload.to);
  if (!normalizedPhone) {
    console.warn("[sendSms] Invalid phone number:", payload.to);
    return false;
  }

  // ActiveTrail: either from_name or sms_sending_profile_id is required
  const details: {
    name: string;
    content: string;
    from_name?: string;
    sms_sending_profile_id?: number;
    can_unsubscribe: boolean;
    unsubscribe_text: string;
  } = {
    name: `op-${Date.now()}`,
    content: toSmsSafeBody(payload.body),
    can_unsubscribe: false,
    unsubscribe_text: "",
  };

  if (PROFILE_ID) {
    details.sms_sending_profile_id = parseInt(PROFILE_ID, 10);
  } else {
    details.from_name = SENDER;
  }

  const body = {
    details,
    scheduling: { send_now: true },
    mobiles: [{ phone_number: normalizedPhone }],
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: API_TOKEN,
      },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();
    let responseJson: { id?: number; Message?: string; message?: string } | null = null;
    try {
      responseJson = JSON.parse(responseText) as {
        id?: number;
        Message?: string;
        message?: string;
      };
    } catch {
      // responseText is the raw body
    }

    if (!res.ok) {
      const errMsg = responseJson?.Message ?? responseJson?.message ?? responseText;
      const err = new Error(
        `[sendSms] ActiveTrail API error ${res.status}: ${errMsg}`
      ) as Error & { status?: number; response?: unknown };
      err.status = res.status;
      err.response = responseJson ?? responseText;
      console.error("[sendSms]", err.message, err.response);
      throw err;
    }

    return true;
  } catch (err) {
    console.error("[sendSms] error:", err);
    throw err;
  }
}

export async function sendSms(payload: SmsPayload): Promise<boolean> {
  const normalizedPhone = normalizePhone(payload.to);
  if (!normalizedPhone) {
    console.warn("[sendSms] Invalid phone number:", payload.to);
    return false;
  }

  const safePayload: SmsPayload = {
    to: normalizedPhone,
    body: toSmsSafeBody(payload.body),
  };

  if (!isWithinSmsWindow()) {
    return queueSms(safePayload);
  }

  return sendSmsNow(safePayload);
}

export async function flushQueuedSms(maxBatch = 200): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skippedByWindow: boolean;
}> {
  if (!isWithinSmsWindow()) {
    return { processed: 0, sent: 0, failed: 0, skippedByWindow: true };
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("sms_outbox")
    .select("id, to_phone, body, attempts")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(maxBatch);

  if (error) {
    console.error("[flushQueuedSms] query failed:", error.message);
    return { processed: 0, sent: 0, failed: 0, skippedByWindow: false };
  }

  const rows = (data ?? []) as SmsOutboxRow[];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const ok = await sendSmsNow({ to: row.to_phone, body: row.body });
      if (ok) {
        sent++;
        await admin
          .from("sms_outbox")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: row.attempts + 1,
            last_error: null,
          })
          .eq("id", row.id);
      } else {
        failed++;
        await admin
          .from("sms_outbox")
          .update({
            attempts: row.attempts + 1,
            last_error: "provider returned false",
          })
          .eq("id", row.id);
      }
    } catch (err) {
      failed++;
      const nextAttempts = row.attempts + 1;
      await admin
        .from("sms_outbox")
        .update({
          status: nextAttempts >= 3 ? "failed" : "pending",
          attempts: nextAttempts,
          last_error: err instanceof Error ? err.message : "unknown error",
        })
        .eq("id", row.id);
    }
  }

  return {
    processed: rows.length,
    sent,
    failed,
    skippedByWindow: false,
  };
}
