import { NextRequest, NextResponse } from "next/server";
import { sendPushToUsers } from "@/lib/notifications/sendPush";
import { flushQueuedSms } from "@/lib/notifications/sendSms";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

const getAdmin = () => getSupabaseAdmin();

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();
  const now = new Date().toISOString();
  let taskReminders = 0;
  let workflowReminders = 0;
  let faultReminders = 0;
  let userDigestsSent = 0;
  let smsQueueProcessed = 0;
  let smsQueueSent = 0;
  let smsQueueFailed = 0;
  let smsQueueSkippedByWindow = false;

  try {
    type DailyDigest = {
      companyId: string;
      recipientUserId: string;
      taskCount: number;
      workflowCount: number;
      faultCount: number;
      taskSamples: string[];
      workflowSamples: string[];
      faultSamples: string[];
    };

    const digestByUser = new Map<string, DailyDigest>();
    const addToDigest = (
      companyId: string,
      recipientUserId: string,
      kind: "task" | "workflow" | "fault",
      sampleTitle: string,
    ) => {
      const key = `${companyId}:${recipientUserId}`;
      const current = digestByUser.get(key) ?? {
        companyId,
        recipientUserId,
        taskCount: 0,
        workflowCount: 0,
        faultCount: 0,
        taskSamples: [],
        workflowSamples: [],
        faultSamples: [],
      };

      if (kind === "task") {
        current.taskCount += 1;
        if (current.taskSamples.length < 2) current.taskSamples.push(sampleTitle);
      }
      if (kind === "workflow") {
        current.workflowCount += 1;
        if (current.workflowSamples.length < 2)
          current.workflowSamples.push(sampleTitle);
      }
      if (kind === "fault") {
        current.faultCount += 1;
        if (current.faultSamples.length < 2) current.faultSamples.push(sampleTitle);
      }

      digestByUser.set(key, current);
    };

    // --- Overdue Tasks ---
    const { data: overdueTasks } = await admin
      .from("tasks")
      .select("id, company_id, title, due_date, assignees, status")
      .lt("due_date", now)
      .not("status", "in", '("approved","rejected")')
      .limit(200);

    if (overdueTasks) {
      for (const task of overdueTasks) {
        const assignees = (task.assignees as Array<{ userId: string; status: string }>) ?? [];
        const activeAssignees = assignees
          .filter((a) => a.status !== "done" && a.status !== "approved")
          .map((a) => a.userId);

        if (activeAssignees.length === 0) continue;
        for (const uid of activeAssignees) {
          addToDigest(task.company_id, uid, "task", task.title);
          taskReminders++;
        }
      }
    }

    // --- Overdue Workflows ---
    const { data: overdueWorkflows } = await admin
      .from("workflows")
      .select("id, company_id, title, due_date, created_by, status, steps")
      .lt("due_date", now)
      .not("status", "in", '("completed","cancelled","rejected")')
      .limit(200);

    if (overdueWorkflows) {
      for (const wf of overdueWorkflows) {
        const steps = (wf.steps as Array<{ assignees?: Array<{ userId: string }> }>) ?? [];
        const userIds = new Set<string>();
        userIds.add(wf.created_by);
        for (const step of steps) {
          for (const a of step.assignees ?? []) {
            userIds.add(a.userId);
          }
        }

        for (const uid of Array.from(userIds)) {
          addToDigest(wf.company_id, uid, "workflow", wf.title);
          workflowReminders++;
        }
      }
    }

    // --- Open Faults older than 3 days ---
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: staleFaults } = await admin
      .from("faults")
      .select(
        "id, company_id, title, assigned_to, assigned_to_ids, reported_by, created_at, fault_statuses!inner(is_final)",
      )
      .lt("created_at", threeDaysAgo)
      .eq("fault_statuses.is_final", false)
      .limit(200);

    if (staleFaults) {
      for (const fault of staleFaults) {
        const assignedIds: string[] =
          Array.isArray(fault.assigned_to_ids) && fault.assigned_to_ids.length > 0
            ? (fault.assigned_to_ids as string[])
            : fault.assigned_to
              ? [fault.assigned_to as string]
              : [];
        const recipients = Array.from(
          new Set([...assignedIds, fault.reported_by as string]),
        ).filter(Boolean);
        if (recipients.length === 0) continue;

        for (const uid of recipients) {
          addToDigest(fault.company_id, uid, "fault", fault.title);
          faultReminders++;
        }
      }
    }

    // --- Send one daily digest per user ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailyRef = `daily-reminder:${todayStart.toISOString().slice(0, 10)}`;

    for (const digest of Array.from(digestByUser.values())) {
      const { count } = await admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", digest.recipientUserId)
        .eq("type", "reminder")
        .eq("reference_id", dailyRef)
        .gte("created_at", todayStart.toISOString());

      if (count && count > 0) continue;

      const totalOverdue =
        digest.taskCount + digest.workflowCount + digest.faultCount;
      const parts: string[] = [];
      if (digest.taskCount > 0) parts.push(`${digest.taskCount} משימות`);
      if (digest.workflowCount > 0)
        parts.push(`${digest.workflowCount} פריטי תכנון`);
      if (digest.faultCount > 0) parts.push(`${digest.faultCount} תקלות`);

      const samples = [
        ...digest.taskSamples,
        ...digest.workflowSamples,
        ...digest.faultSamples,
      ]
        .slice(0, 2)
        .map((s) => `• ${s}`)
        .join(" ");

      await sendPushToUsers({
        companyId: digest.companyId,
        recipientUserIds: [digest.recipientUserId],
        type: "reminder",
        title: `תזכורת יומית: ${totalOverdue} באיחור`,
        body: `${parts.join(", ")} באיחור. ${samples}`.trim(),
        url: "/dashboard/tasks",
        referenceId: dailyRef,
        referenceType: "task",
        sendEmail: true,
        sendSms: true,
      });
      userDigestsSent++;
    }

    const smsQueue = await flushQueuedSms(200);
    smsQueueProcessed = smsQueue.processed;
    smsQueueSent = smsQueue.sent;
    smsQueueFailed = smsQueue.failed;
    smsQueueSkippedByWindow = smsQueue.skippedByWindow;

    return NextResponse.json({
      ok: true,
      taskReminders,
      workflowReminders,
      faultReminders,
      userDigestsSent,
      smsQueueProcessed,
      smsQueueSent,
      smsQueueFailed,
      smsQueueSkippedByWindow,
      checkedAt: now,
    });
  } catch (err) {
    console.error("[cron/reminders] error:", err);
    return NextResponse.json({ error: "שגיאה בשליחת תזכורות" }, { status: 500 });
  }
}
