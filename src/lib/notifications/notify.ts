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

  fetch("/api/notifications/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    // keepalive: request survives page navigation / unload
    keepalive: true,
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[notify] API error", res.status, body);
      }
    })
    .catch((err) => {
      console.error("[notify] failed to send notification:", err);
    });
}
