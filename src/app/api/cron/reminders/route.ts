import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { sendPushToUsers } from "@/lib/notifications/sendPush";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

const getAdmin = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

  try {
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

        // Check if we already sent a reminder for this task today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count } = await admin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("reference_id", task.id)
          .eq("type", "reminder")
          .gte("created_at", todayStart.toISOString());

        if (count && count > 0) continue;

        await sendPushToUsers({
          companyId: task.company_id,
          recipientUserIds: activeAssignees,
          type: "reminder",
          title: "תזכורת: משימה באיחור",
          body: `המשימה "${task.title}" עברה את תאריך היעד`,
          url: "/dashboard/tasks",
          referenceId: task.id,
          referenceType: "task",
          sendEmail: true,
          sendSms: true,
        });
        taskReminders++;
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

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count } = await admin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("reference_id", wf.id)
          .eq("type", "reminder")
          .gte("created_at", todayStart.toISOString());

        if (count && count > 0) continue;

        await sendPushToUsers({
          companyId: wf.company_id,
          recipientUserIds: Array.from(userIds),
          type: "reminder",
          title: "תזכורת: תכנון עבודה באיחור",
          body: `"${wf.title}" עבר את תאריך היעד`,
          url: "/dashboard/work-plan",
          referenceId: wf.id,
          referenceType: "task",
          sendEmail: true,
          sendSms: true,
        });
        workflowReminders++;
      }
    }

    // --- Open Faults older than 3 days ---
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: staleFaults } = await admin
      .from("faults")
      .select("id, company_id, title, assigned_to, reported_by, created_at")
      .lt("created_at", threeDaysAgo)
      .limit(200);

    if (staleFaults) {
      // Filter out faults with final status (we need to join with fault_statuses)
      for (const fault of staleFaults) {
        const recipients = [fault.assigned_to, fault.reported_by].filter(Boolean);
        if (recipients.length === 0) continue;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count } = await admin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("reference_id", fault.id)
          .eq("type", "reminder")
          .gte("created_at", todayStart.toISOString());

        if (count && count > 0) continue;

        await sendPushToUsers({
          companyId: fault.company_id,
          recipientUserIds: recipients,
          type: "reminder",
          title: "תזכורת: תקלה פתוחה",
          body: `התקלה "${fault.title}" פתוחה כבר מעל 3 ימים`,
          url: "/dashboard/faults",
          referenceId: fault.id,
          referenceType: "fault",
          sendEmail: true,
          sendSms: true,
        });
        faultReminders++;
      }
    }

    return NextResponse.json({
      ok: true,
      taskReminders,
      workflowReminders,
      faultReminders,
      checkedAt: now,
    });
  } catch (err) {
    console.error("[cron/reminders] error:", err);
    return NextResponse.json({ error: "שגיאה בשליחת תזכורות" }, { status: 500 });
  }
}
