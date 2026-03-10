import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { sendEmailWithResult } from "@/lib/notifications/sendEmail";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = (await request.json()) as {
      meetingId: string;
      recipientUserIds?: string[]; // optional override from UI
    };
    if (!body.meetingId) {
      return NextResponse.json({ error: "חסר meetingId" }, { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch meeting
    const { data: meeting, error: meetingError } = await admin
      .from("meetings")
      .select("*")
      .eq("id", body.meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: "ישיבה לא נמצאה" }, { status: 404 });
    }

    if (!meeting.next_meeting_date) {
      return NextResponse.json({ error: "אין תאריך לישיבה הבאה" }, { status: 400 });
    }

    // Determine which user IDs to invite
    let internalIds: string[];

    if (body.recipientUserIds?.length) {
      // UI passed explicit recipients
      internalIds = body.recipientUserIds.filter((id) => id !== user.id);
    } else {
      // Fallback: read from meeting.participants
      const participants: { userId?: string; name?: string }[] =
        Array.isArray(meeting.participants)
          ? (meeting.participants as { userId?: string; name?: string }[])
          : [];
      internalIds = participants
        .map((p) => p.userId)
        .filter((id): id is string => !!id && id !== user.id);
    }

    if (internalIds.length === 0) {
      return NextResponse.json(
        { error: "לא נבחרו משתתפים לשליחה" },
        { status: 400 },
      );
    }

    // Resolve emails: users table first, Auth fallback
    const { data: userRows } = await admin
      .from("users")
      .select("id, name, email")
      .in("id", internalIds);

    const attendees: { name: string; email: string }[] = [];
    for (const uid of internalIds) {
      const row = (userRows ?? []).find((r) => r.id === uid);
      if (row?.email) {
        attendees.push({ name: row.name ?? "", email: row.email });
      } else {
        const { data: authData } = await admin.auth.admin.getUserById(uid);
        const authEmail = authData?.user?.email;
        if (authEmail) {
          attendees.push({ name: row?.name ?? "", email: authEmail });
        }
      }
    }

    if (attendees.length === 0) {
      return NextResponse.json(
        { error: `נמצאו ${internalIds.length} משתתפים אך לאף אחד אין כתובת מייל — הוסף מיילים בהגדרות → משתמשים` },
        { status: 400 },
      );
    }

    // Format next meeting date
    const nextDate = new Date(meeting.next_meeting_date);
    const nextDateHe = nextDate.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const timeHe = nextDate.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Send plain email to each attendee (no ICS attachment — more reliable)
    let sent = 0;
    let failed = 0;
    const firstError: string[] = [];

    for (const attendee of attendees) {
      const result = await sendEmailWithResult({
        to: attendee.email,
        recipientName: attendee.name,
        subject: `זימון לישיבה: ${meeting.title} — ${nextDateHe}`,
        body: `קיבלת זימון לישיבה הבאה:\n\n📋 ${meeting.title}\n📅 ${nextDateHe} בשעה ${timeHe}${meeting.location ? `\n📍 ${meeting.location}` : ""}\n\nלחץ על הכפתור למטה לפרטים נוספים.`,
        url: `/dashboard/meetings/${body.meetingId}`,
      });
      if (result.ok) {
        sent++;
      } else {
        failed++;
        if (result.error && firstError.length === 0) firstError.push(result.error);
      }
    }

    const emailError = firstError[0];
    return NextResponse.json({
      ok: sent > 0,
      sent,
      failed,
      total: attendees.length,
      ...(emailError ? { emailError } : {}),
    });
  } catch (err) {
    console.error("[send-invite] error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
