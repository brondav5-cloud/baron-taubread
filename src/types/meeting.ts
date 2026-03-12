// ============================================
// MEETING SYSTEM TYPES
// ============================================

export type MeetingType = "team" | "management" | "one_on_one";
export type MeetingStatus = "draft" | "final";
export type MeetingTaskPriority = "urgent" | "normal" | "low";
export type MeetingVisibility = "public" | "participants_only" | "restricted";

export interface MeetingParticipant {
  userId?: string;
  name: string;
  email?: string;
  isExternal?: boolean;
}

// A task that was created/mentioned within an agenda item
export interface MeetingTaskMention {
  id: string; // local UUID before saving
  agendaItemIndex: number;
  taskId?: string; // set after task is created in tasks table
  assigneeUserIds: string[];
  assigneeNames: string[];
  taskTitle: string;
  dueDate: string;
  priority: MeetingTaskPriority;
  // position hint in the text (for display)
  mentionLabel: string;
}

// Agenda item stored as JSONB
export interface AgendaItem {
  id: string;
  title: string;
  content: Record<string, unknown>; // Tiptap JSON doc
}

// The full meeting object (from DB)
export interface Meeting {
  id: string;
  companyId: string;
  title: string;
  meetingType: MeetingType;
  meetingDate: string;
  location?: string;
  participants: MeetingParticipant[];
  agendaItems: AgendaItem[];
  decisions?: string;
  nextMeetingDate?: string;
  status: MeetingStatus;
  visibility: MeetingVisibility;
  allowedViewers: string[];
  prevMeetingId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  // tasks linked to this meeting (from meeting_tasks table)
  meetingTasks?: MeetingTaskRecord[];
}

// A task record linked to a meeting (from meeting_tasks table)
export interface MeetingTaskRecord {
  id: string;
  meetingId: string;
  agendaItemIndex?: number;
  taskId: string;
  assigneeUserIds: string[];
  assigneeNames: string[];
  taskTitle: string;
  dueDate?: string;
  priority: MeetingTaskPriority;
  createdAt: string;
}

// Form input for creating/editing a meeting
export interface MeetingFormInput {
  title: string;
  meetingType: MeetingType;
  meetingDate: string;
  location: string;
  participants: MeetingParticipant[];
  agendaItems: AgendaItem[];
  decisions: string;
  nextMeetingDate: string;
  pendingTasks: MeetingTaskMention[];
  visibility: MeetingVisibility;
  allowedViewers: string[];
}

export const MEETING_VISIBILITY_CONFIG: Record<MeetingVisibility, { label: string; icon: string; description: string; color: string }> = {
  public: {
    label: "לכולם",
    icon: "🌐",
    description: "כל חברי הצוות רואים את הסיכום",
    color: "bg-green-100 text-green-700",
  },
  participants_only: {
    label: "משתתפים בלבד",
    icon: "👥",
    description: "רק מי שנכח בישיבה רואה את הסיכום",
    color: "bg-blue-100 text-blue-700",
  },
  restricted: {
    label: "מוגבל",
    icon: "🔒",
    description: "רק אנשים שבחרתי יכולים לראות",
    color: "bg-orange-100 text-orange-700",
  },
};

export const MEETING_TYPE_CONFIG: Record<MeetingType, { label: string; icon: string; color: string }> = {
  team: { label: "ישיבת צוות", icon: "👥", color: "bg-blue-100 text-blue-700" },
  management: { label: "ישיבת הנהלה", icon: "🏢", color: "bg-purple-100 text-purple-700" },
  one_on_one: { label: "שיחה אישית 1:1", icon: "🤝", color: "bg-green-100 text-green-700" },
};

export const MEETING_PRIORITY_CONFIG: Record<MeetingTaskPriority, { label: string; icon: string; color: string }> = {
  urgent: { label: "דחוף", icon: "🔴", color: "text-red-600" },
  normal: { label: "רגיל", icon: "🟡", color: "text-yellow-600" },
  low: { label: "נמוך", icon: "🟢", color: "text-green-600" },
};
