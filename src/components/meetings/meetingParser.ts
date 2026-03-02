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

function extractTaskFromMention(
  line: string,
  users: User[],
  lineIndex: number,
  fallbackTitle?: string,
): ParsedTask | null {
  const atMatch = line.match(/@([^\s@]+(?:\s[^\s@]+)?)/);
  if (!atMatch) return null;

  const namePart = (atMatch[1] ?? "").trim();
  const user = users.find(
    (u) =>
      u.name.toLowerCase() === namePart.toLowerCase() ||
      u.name.toLowerCase().startsWith(namePart.toLowerCase()),
  );
  if (!user) return null;

  const afterMention = line
    .slice((line.indexOf(atMatch[0]) ?? 0) + atMatch[0].length)
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
      .trim() ||
    fallbackTitle ||
    `משימה עבור ${user.name}`;

  return {
    id: `task_${lineIndex}_${user.id}`,
    userId: user.id,
    userName: user.name,
    title,
    dueDate,
    priority,
    lineIndex,
  };
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

    // ── Decision pattern ──────────────────────────────────
    const decisionMatch = trimmed.match(
      /^(?:החלטה[:.\s\-]*|✅\s*|⚡\s*)(.+)/,
    );

    if (decisionMatch?.[1]) {
      const fullDecisionText = decisionMatch[1].trim();

      // Strip @mention and date from decision text for the decisions panel
      const decisionText = fullDecisionText
        .replace(/@[^\s]+(?:\s[^\s]+)?/g, "")
        .replace(/(?:עד|by|until)\s+\S+/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (decisionText) {
        decisions.push({
          id: `dec_${lineIndex}`,
          text: decisionText,
          lineIndex,
        });
      }

      // ── Combined: decision line also contains @mention ──
      // e.g. "החלטה: להגדיל תקציב @דוד עד 15/3"
      if (/@/.test(fullDecisionText)) {
        const task = extractTaskFromMention(
          fullDecisionText,
          users,
          lineIndex,
          decisionText, // use decision text as task title fallback
        );
        if (task) tasks.push(task);
      }

      return; // done with this line
    }

    // ── Pure @mention line ────────────────────────────────
    // e.g. "@דוד לבצע משימה עד 15/3"
    if (/^@/.test(trimmed)) {
      const task = extractTaskFromMention(trimmed, users, lineIndex);
      if (task) tasks.push(task);
    }
  });

  return { decisions, tasks };
}
