/**
 * Shared meeting content parser.
 * Exported separately so SmartMeetingEditor and MeetingDetail can both use it.
 */

export interface ParsedDecision {
  id: string;
  text: string;
  lineIndex: number;
}

export interface ParsedTask {
  id: string;
  userId: string;
  userName: string;
  title: string;
  dueDate: string;
  priority: "urgent" | "normal" | "low";
  lineIndex: number;
}

interface User {
  id: string;
  name: string;
}

function parseHebrewDate(raw: string): string {
  const m = raw.match(/(\d{1,2})[./\-](\d{1,2})(?:[./\-](\d{2,4}))?/);
  if (!m) return "";
  const day = parseInt(m[1] ?? "1");
  const month = parseInt(m[2] ?? "1") - 1;
  const rawYear = m[3];
  const year = rawYear
    ? rawYear.length === 2
      ? 2000 + parseInt(rawYear)
      : parseInt(rawYear)
    : new Date().getFullYear();
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function parseContent(
  text: string,
  users: User[],
): { decisions: ParsedDecision[]; tasks: ParsedTask[] } {
  const lines = text.split("\n");
  const decisions: ParsedDecision[] = [];
  const tasks: ParsedTask[] = [];

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Decision: starts with "החלטה", "✅", or "⚡"
    const decisionMatch = trimmed.match(
      /^(?:החלטה[:.\s\-]*|✅\s*|⚡\s*)(.+)/,
    );
    if (decisionMatch?.[1]) {
      decisions.push({
        id: `dec_${lineIndex}`,
        text: decisionMatch[1].trim(),
        lineIndex,
      });
      return;
    }

    // Task: line starts with @Name
    const atMatch = trimmed.match(/^@(.+?)(?:\s|$)/);
    if (atMatch) {
      const namePart = (atMatch[1] ?? "").trim();
      const user = users.find(
        (u) =>
          u.name.toLowerCase() === namePart.toLowerCase() ||
          u.name.toLowerCase().startsWith(namePart.toLowerCase()),
      );
      if (user) {
        const afterMention = trimmed
          .slice(trimmed.indexOf(namePart) + namePart.length)
          .trim();

        const dateMatch = afterMention.match(
          /(?:עד|by|until)\s+(\d{1,2}[./\-]\d{1,2}(?:[./\-]\d{2,4})?)/i,
        );
        const dueDate = dateMatch?.[1]
          ? parseHebrewDate(dateMatch[1])
          : new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

        let priority: ParsedTask["priority"] = "normal";
        if (/דחוף|urgent|asap/i.test(afterMention)) priority = "urgent";
        else if (/נמוך|low/i.test(afterMention)) priority = "low";

        const title =
          afterMention
            .replace(/(?:עד|by|until)\s+\S+/i, "")
            .replace(/דחוף|urgent|asap|נמוך|low/gi, "")
            .trim() || `משימה עבור ${user.name}`;

        tasks.push({
          id: `task_${lineIndex}`,
          userId: user.id,
          userName: user.name,
          title,
          dueDate,
          priority,
          lineIndex,
        });
      }
    }
  });

  return { decisions, tasks };
}
