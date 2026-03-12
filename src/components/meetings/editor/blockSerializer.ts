import type { TopicBlock, ContentRow, EditorUser, TaskRow } from "./types";
import type { MeetingTaskPriority } from "@/types/meeting";

let _cnt = 0;
const uid = () => `blk_${Date.now()}_${++_cnt}`;

// ── Date helpers ────────────────────────────────────────────

function parseDate(raw: string): string {
  const m = raw.match(/(\d{1,2})[./\-](\d{1,2})(?:[./\-](\d{2,4}))?/);
  if (!m) return defaultDue();
  const day = parseInt(m[1] ?? "1");
  const month = parseInt(m[2] ?? "1") - 1;
  const rawYear = m[3];
  const year = rawYear
    ? rawYear.length === 2
      ? 2000 + parseInt(rawYear)
      : parseInt(rawYear)
    : new Date().getFullYear();
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? defaultDue() : d.toISOString().slice(0, 10);
}

export function defaultDue(): string {
  return new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
}

function formatDateForText(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function detectPriority(text: string): MeetingTaskPriority {
  if (/דחוף|urgent|asap/i.test(text)) return "urgent";
  if (/נמוך|low/i.test(text)) return "low";
  return "normal";
}

// ── Line → ContentRow ───────────────────────────────────────

function parseLine(
  line: string,
  lineIdx: number,
  users: EditorUser[],
): ContentRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Decision line
  const decMatch = trimmed.match(/^(?:החלטה[:.\s\-]*|✅\s*|⚡\s*)(.+)/);
  if (decMatch && decMatch[1]) {
    const content = decMatch[1]
      .replace(/@\S+(?:\s\S+)?/g, "")
      .replace(/(?:עד|by|until)\s+\S+/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (content) return { id: uid(), type: "decision", content };
  }

  // Task line: starts with @name
  if (/^@/.test(trimmed)) {
    const atMatch = trimmed.match(/@([^\s@]+(?:\s[^\s@]+)?)/);
    if (atMatch) {
      const namePart = (atMatch[1] ?? "").trim();
      const user = users.find(
        (u) =>
          u.name.toLowerCase() === namePart.toLowerCase() ||
          u.name.toLowerCase().startsWith(namePart.toLowerCase()),
      );
      if (user) {
        const afterMention = trimmed
          .slice(trimmed.indexOf(atMatch[0]) + atMatch[0].length)
          .trim();
        const dateMatch = afterMention.match(
          /(?:עד|by|until)\s+(\d{1,2}[./\-]\d{1,2}(?:[./\-]\d{2,4})?)/i,
        );
        const dueDate = dateMatch?.[1] ? parseDate(dateMatch[1]) : defaultDue();
        const priority = detectPriority(afterMention);
        const content =
          afterMention
            .replace(/(?:עד|by|until)\s+\S+/gi, "")
            .replace(/דחוף|urgent|asap|נמוך|low/gi, "")
            .trim() || `משימה עבור ${user.name}`;
        const row: TaskRow = {
          id: `task_${lineIdx}_${uid()}`,
          type: "task",
          content,
          assigneeIds: [user.id],
          assigneeNames: [user.name],
          dueDate,
          priority,
        };
        return row;
      }
    }
  }

  // Plain text
  return { id: uid(), type: "text", content: trimmed };
}

// ── text → TopicBlock[] ─────────────────────────────────────

export function textToBlocks(
  text: string,
  users: EditorUser[],
): TopicBlock[] {
  if (!text.trim()) {
    return [
      {
        id: uid(),
        type: "topic",
        title: "",
        rows: [{ id: uid(), type: "text", content: "" }],
      },
    ];
  }

  const lines = text.split("\n");
  const topics: TopicBlock[] = [];
  let current: TopicBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const topicMatch = line.match(/^##\s*נושא[:：]?\s*(.*)/);

    if (topicMatch) {
      if (current) topics.push(current);
      current = {
        id: uid(),
        type: "topic",
        title: topicMatch[1]!.trim(),
        rows: [],
      };
    } else {
      if (!current) {
        current = { id: uid(), type: "topic", title: "", rows: [] };
      }
      const row = parseLine(line, i, users);
      if (row) current.rows.push(row);
    }
  }

  if (current) topics.push(current);

  // Ensure at least one topic with at least one row
  if (!topics.length) {
    topics.push({
      id: uid(),
      type: "topic",
      title: "",
      rows: [{ id: uid(), type: "text", content: "" }],
    });
  }
  for (const t of topics) {
    if (!t.rows.length) {
      t.rows.push({ id: uid(), type: "text", content: "" });
    }
  }

  return topics;
}

// ── TopicBlock[] → text ─────────────────────────────────────

export function blocksToText(topics: TopicBlock[]): string {
  const lines: string[] = [];

  for (const topic of topics) {
    lines.push(`## נושא: ${topic.title}`);
    for (const row of topic.rows) {
      if (row.type === "text") {
        if (row.content.trim()) lines.push(row.content);
      } else if (row.type === "decision") {
        if (row.content.trim()) lines.push(`החלטה: ${row.content}`);
      } else if (row.type === "task") {
        if (row.assigneeIds.length > 0 && row.content.trim()) {
          const datePart = row.dueDate
            ? ` עד ${formatDateForText(row.dueDate)}`
            : "";
          const priorityPart =
            row.priority === "urgent"
              ? " דחוף"
              : row.priority === "low"
                ? " נמוך"
                : "";
          const mentionPart = row.assigneeNames
            .map((n) => `@${n}`)
            .join(" ");
          lines.push(
            `${mentionPart} ${row.content}${datePart}${priorityPart}`,
          );
        }
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
