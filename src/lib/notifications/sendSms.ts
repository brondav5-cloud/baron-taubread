const API_TOKEN = process.env.SMSPLUS_API_TOKEN ?? "";
const USERNAME = process.env.SMSPLUS_USERNAME ?? "";
const SENDER = process.env.SMSPLUS_SENDER || "BARON";

const API_URL =
  process.env.NODE_ENV === "development"
    ? "https://019sms.co.il/api/test"
    : "https://019sms.co.il/api";

export interface SmsPayload {
  to: string;
  body: string;
}

/**
 * Normalize phone number for 019SMS (Israeli format: 05xxxxxxxx or 5xxxxxxxx)
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

export async function sendSms(payload: SmsPayload): Promise<boolean> {
  if (!API_TOKEN || !USERNAME) {
    console.warn("[sendSms] SMSPlus/019SMS not configured (SMSPLUS_API_TOKEN, SMSPLUS_USERNAME)");
    return false;
  }

  const normalizedPhone = normalizePhone(payload.to);
  if (!normalizedPhone) {
    console.warn("[sendSms] Invalid phone number:", payload.to);
    return false;
  }

  const body = {
    username: USERNAME,
    source: SENDER,
    destinations: [{ phone: normalizedPhone }],
    message: payload.body,
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();
    let responseJson: unknown = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      // responseText is the raw body
    }

    if (!res.ok) {
      const err = new Error(
        `[sendSms] 019SMS API error ${res.status}: ${responseText}`
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
