import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { generateIcs } from "@/lib/ics/generateIcs";
import { sendEmail } from "@/lib/notifications/sendEmail";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { meetingId } = (await request.json()) as { meetingId: string };
    if (!meetingId) {
      return NextResponse.json({ error: "חסר meetingId" }, { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch meeting
    const { data: meeting, error: meetingError } = await admin
      .from("meetings")
      .select("*")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: "ישיבה לא נמצאה" }, { status: 404 });
    }

    if (!meeting.next_meeting_date) {
      return NextResponse.json({ error: "אין תאריך לישיבה הבאה" }, { status: 400 });
    }

    // Fetch organizer email
    const { data: organizer } = await admin
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single();

    const organizerEmail = organizer?.email ?? "noreply@bakery-analytics.app";
    const organizerName = organizer?.name ?? "מארגן";

    // Collect participant user IDs (internal users only — have a userId)
    const participants: { userId?: string; name?: string }[] = Array.isArray(meeting.participants)
      ? (meeting.participants as { userId?: string; name?: string }[])
      : [];

    const internalIds = participants
      .map((p) => p.userId)
      .filter((id): id is string => !!id && id !== user.id);

    // Fetch their emails from users table
    const { data: userRows } = internalIds.length
      ? await admin.from("users").select("id, name, email").in("id", internalIds)
      : { data: [] };

    const attendees = (userRows ?? [])
      .filter((u) => !!u.email)
      .map((u) => ({ name: u.name ?? "", email: u.email as string }));

    if (attendees.length === 0) {
      return NextResponse.json({ error: "אין משתתפים עם כתובת מייל רשומה" }, { status: 400 });
    }

    // Generate ICS
    const nextDate = new Date(meeting.next_meeting_date);
    const icsContent = generateIcs({
      uid: `${meetingId}-next`,
      title: `המשך: ${meeting.title}`,
      description: `ישיבת המשך לישיבה "${meeting.title}" שנוצרה ב-${new Date(meeting.meeting_date).toLocaleDateString("he-IL")}`,
      location: meeting.location ?? "",
      startDate: nextDate,
      durationMinutes: 60,
      organizer: { name: organizerName, email: organizerEmail },
      attendees,
    });

    const icsBase64 = Buffer.from(icsContent).toString("base64");

    const nextDateHe = nextDate.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Send to each attendee
    let sent = 0;
    let failed = 0;
    for (const attendee of attendees) {
      const ok = await sendEmail({
        to: attendee.email,
        recipientName: attendee.name,
        subject: `זימון: ${meeting.title} — ${nextDateHe}`,
        body: `קיבלת זימון לישיבה הבאה:\n\n📅 ${nextDateHe}${meeting.location ? `\n📍 ${meeting.location}` : ""}\n\nאנא פתח את הקובץ המצורף (invite.ics) כדי להוסיף ללוח השנה שלך.`,
        attachments: [{ filename: "invite.ics", content: icsBase64 }],
      });
      if (ok) sent++;
      else failed++;
    }

    return NextResponse.json({ ok: true, sent, failed, total: attendees.length });
  } catch (err) {
    console.error("[send-invite] error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
