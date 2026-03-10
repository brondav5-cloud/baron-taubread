/**
 * Client-side fire-and-forget notification sender.
 * Calls /api/notifications/send — failures are logged but never block the UI.
 */

export type NotificationType =
  | "task_assigned"
  | "task_reassigned"
  | "fault_assigned"
  | "fault_status"
  | "reminder"
  | "meeting_task_assigned"
  | "general";

export interface SendNotificationInput {
  recipientUserIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  referenceId?: string;
  referenceType?: "task" | "fault" | "treatment";
  sendEmail?: boolean;
  sendSms?: boolean;
}

export function sendNotification(input: SendNotificationInput): void {
  if (!input.recipientUserIds.length) return;
  sendNotificationAsync(input).catch((err) =>
    console.error("[notify] failed to send notification:", err),
  );
}

/**
 * Awaitable version — use when you need to guarantee delivery before
 * page navigation or other async operations.
 */
export async function sendNotificationAsync(input: SendNotificationInput): Promise<void> {
  if (!input.recipientUserIds.length) return;

  try {
    const res = await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[notify] API error", res.status, body);
    }
  } catch (err) {
    console.error("[notify] fetch failed:", err);
  }
}
