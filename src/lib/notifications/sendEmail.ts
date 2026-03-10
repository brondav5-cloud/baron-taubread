import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "notifications@bakery-analytics.app";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface EmailAttachment {
  filename: string;
  content: string; // base64
}

export interface EmailPayload {
  to: string;
  recipientName?: string;
  subject: string;
  body: string;
  url?: string;
  type?: string;
  attachments?: EmailAttachment[];
}

function buildHtml(payload: EmailPayload): string {
  const buttonHtml = payload.url
    ? `<div style="text-align:center;margin:24px 0">
        <a href="${payload.url}" style="background:#3b82f6;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          פתח במערכת
        </a>
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;margin:0;padding:20px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:#3b82f6;padding:20px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:18px">Bakery Analytics</h1>
    </div>
    <div style="padding:24px">
      ${payload.recipientName ? `<p style="color:#374151;font-size:15px">שלום ${payload.recipientName},</p>` : ""}
      <p style="color:#374151;font-size:15px;line-height:1.6">${payload.body}</p>
      ${buttonHtml}
    </div>
    <div style="padding:16px;background:#f9fafb;text-align:center">
      <p style="color:#9ca3af;font-size:12px;margin:0">הודעה אוטומטית מ-Bakery Analytics</p>
    </div>
  </div>
</body>
</html>`;
}

/** Returns { ok, error? } — callers can surface the error to the user. */
export async function sendEmailWithResult(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    const msg = "RESEND_API_KEY לא מוגדר בסביבה";
    console.warn("[sendEmail]", msg);
    return { ok: false, error: msg };
  }

  try {
    const { error } = await resend.emails.send({
      from: `Bakery Analytics <${FROM_EMAIL}>`,
      to: payload.to,
      subject: payload.subject,
      html: buildHtml(payload),
      ...(payload.attachments?.length
        ? {
            attachments: payload.attachments.map((a) => ({
              filename: a.filename,
              content: Buffer.from(a.content, "base64"),
            })),
          }
        : {}),
    });

    if (error) {
      const msg = (error as { message?: string }).message ?? JSON.stringify(error);
      console.error("[sendEmail] Resend error:", msg, "→ from:", FROM_EMAIL, "to:", payload.to);
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sendEmail] exception:", msg);
    return { ok: false, error: msg };
  }
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const { ok } = await sendEmailWithResult(payload);
  return ok;
}
