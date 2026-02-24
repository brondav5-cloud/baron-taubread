import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { sendEmail } from "./sendEmail";
import { sendSms } from "./sendSms";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:notifications@bakery-analytics.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

const getAdmin = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export interface NotificationPayload {
  companyId: string;
  recipientUserIds: string[];
  senderUserId?: string;
  type: "task_assigned" | "task_reassigned" | "fault_assigned" | "fault_status" | "reminder" | "general";
  title: string;
  body: string;
  url?: string;
  referenceId?: string;
  referenceType?: "task" | "fault" | "treatment";
  tag?: string;
  sendEmail?: boolean;
  sendSms?: boolean;
}

export async function sendPushToUsers(payload: NotificationPayload): Promise<{
  sent: number;
  failed: number;
  emailsSent: number;
  smsSent: number;
}> {
  const admin = getAdmin();
  let sent = 0;
  let failed = 0;
  let emailsSent = 0;
  let smsSent = 0;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://bakery-analytics.vercel.app";

  for (const recipientId of payload.recipientUserIds) {
    const { data: userRow } = await admin
      .from("users")
      .select("email, name, phone")
      .eq("id", recipientId)
      .single();

    // Log notification
    await admin.from("notifications").insert({
      company_id: payload.companyId,
      recipient_user_id: recipientId,
      sender_user_id: payload.senderUserId ?? null,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/dashboard",
      reference_id: payload.referenceId ?? null,
      reference_type: payload.referenceType ?? null,
      channel: "push",
      status: "sent",
    });

    // --- Push ---
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, keys_p256dh, keys_auth")
      .eq("user_id", recipientId);

    if (subs && subs.length > 0) {
      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/dashboard",
        tag: payload.tag ?? `${payload.type}_${payload.referenceId ?? Date.now()}`,
        notificationId: payload.referenceId,
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
            },
            pushPayload,
          );
          sent++;
        } catch (err: unknown) {
          failed++;
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            await admin
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
        }
      }
    }

    // --- Email (opt-in) ---
    if (payload.sendEmail && userRow?.email) {
      const fullUrl = payload.url
        ? `${baseUrl}${payload.url}`
        : `${baseUrl}/dashboard`;

      const emailOk = await sendEmail({
        to: userRow.email,
        recipientName: userRow.name ?? undefined,
        subject: payload.title,
        body: payload.body,
        url: fullUrl,
        type: payload.type,
      });
      if (emailOk) emailsSent++;
    }

    // --- SMS (opt-in) ---
    if (payload.sendSms && userRow?.phone) {
      const smsOk = await sendSms({
        to: userRow.phone,
        body: `${payload.title}\n${payload.body}`,
      });
      if (smsOk) smsSent++;
    }
  }

  return { sent, failed, emailsSent, smsSent };
}
