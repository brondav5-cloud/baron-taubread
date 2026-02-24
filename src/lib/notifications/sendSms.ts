const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? "";

export interface SmsPayload {
  to: string;
  body: string;
}

function formatPhoneNumber(phone: string): string | null {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("05")) {
    cleaned = "+972" + cleaned.slice(1);
  } else if (cleaned.startsWith("5") && cleaned.length === 9) {
    cleaned = "+972" + cleaned;
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  if (cleaned.length < 10) return null;
  return cleaned;
}

export async function sendSms(payload: SmsPayload): Promise<boolean> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    console.warn("[sendSms] Twilio not configured, skipping SMS");
    return false;
  }

  const to = formatPhoneNumber(payload.to);
  if (!to) {
    console.warn("[sendSms] Invalid phone number:", payload.to);
    return false;
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

    await client.messages.create({
      body: payload.body,
      from: FROM_NUMBER,
      to,
    });

    return true;
  } catch (err) {
    console.error("[sendSms] error:", err);
    return false;
  }
}
