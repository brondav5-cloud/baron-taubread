/**
 * Generates a valid iCalendar (.ics) string for a meeting invite.
 * Compatible with Google Calendar, Outlook, Apple Calendar.
 */

export interface IcsAttendee {
  name: string;
  email: string;
}

export interface IcsMeetingData {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  durationMinutes?: number;
  organizer: IcsAttendee;
  attendees: IcsAttendee[];
}

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  // ICS spec: lines > 75 chars should be folded
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

export function generateIcs(meeting: IcsMeetingData): string {
  const start = formatIcsDate(meeting.startDate);
  const end = formatIcsDate(
    new Date(meeting.startDate.getTime() + (meeting.durationMinutes ?? 60) * 60_000),
  );
  const now = formatIcsDate(new Date());

  const attendeeLines = meeting.attendees
    .map(
      (a) =>
        foldLine(
          `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;RSVP=TRUE;CN=${escapeIcsText(a.name)}:MAILTO:${a.email}`,
        ),
    )
    .join("\r\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bakery Analytics//Meeting Invite//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${meeting.uid}@bakery-analytics`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    foldLine(`SUMMARY:${escapeIcsText(meeting.title)}`),
    meeting.description
      ? foldLine(`DESCRIPTION:${escapeIcsText(meeting.description)}`)
      : "",
    meeting.location
      ? foldLine(`LOCATION:${escapeIcsText(meeting.location)}`)
      : "",
    foldLine(
      `ORGANIZER;CN=${escapeIcsText(meeting.organizer.name)}:MAILTO:${meeting.organizer.email}`,
    ),
    attendeeLines,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return lines;
}
