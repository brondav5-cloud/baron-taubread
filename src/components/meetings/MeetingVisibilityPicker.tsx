"use client";

import { Lock, Globe, Users } from "lucide-react";
import type { MeetingVisibility } from "@/types/meeting";
import { MEETING_VISIBILITY_CONFIG } from "@/types/meeting";

interface UserOption {
  id: string;
  name: string;
}

interface MeetingVisibilityPickerProps {
  visibility: MeetingVisibility;
  allowedViewers: string[];
  userOptions: UserOption[];
  onVisibilityChange: (v: MeetingVisibility) => void;
  onAllowedViewersChange: (viewers: string[]) => void;
}

const VISIBILITY_ICONS: Record<MeetingVisibility, React.ReactNode> = {
  public: <Globe size={15} />,
  participants_only: <Users size={15} />,
  restricted: <Lock size={15} />,
};

const VISIBILITY_ORDER: MeetingVisibility[] = ["public", "participants_only", "restricted"];

export default function MeetingVisibilityPicker({
  visibility,
  allowedViewers,
  userOptions,
  onVisibilityChange,
  onAllowedViewersChange,
}: MeetingVisibilityPickerProps) {
  const toggleViewer = (userId: string) => {
    onAllowedViewersChange(
      allowedViewers.includes(userId)
        ? allowedViewers.filter((id) => id !== userId)
        : [...allowedViewers, userId],
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
        <Lock size={15} className="text-gray-400" />
        נראות הסיכום
      </h2>

      {/* Visibility selector */}
      <div className="grid grid-cols-3 gap-2">
        {VISIBILITY_ORDER.map((v) => {
          const cfg = MEETING_VISIBILITY_CONFIG[v];
          const isSelected = visibility === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onVisibilityChange(v)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium border-2 transition-all ${
                isSelected
                  ? `${cfg.color} border-current`
                  : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"
              }`}
            >
              <span className="flex items-center gap-1">
                {VISIBILITY_ICONS[v]}
              </span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Description of selected */}
      <p className="text-xs text-gray-500 text-center">
        {MEETING_VISIBILITY_CONFIG[visibility].description}
      </p>

      {/* User picker for restricted */}
      {visibility === "restricted" && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-2">בחר מי יוכל לראות:</p>
          <div className="flex flex-wrap gap-2">
            {userOptions.map((u) => {
              const selected = allowedViewers.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleViewer(u.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                    selected
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {u.name.charAt(0)}
                  </span>
                  {u.name}
                </button>
              );
            })}
          </div>
          {allowedViewers.length === 0 && (
            <p className="text-xs text-orange-500 mt-1">נא לבחור לפחות אדם אחד</p>
          )}
        </div>
      )}
    </div>
  );
}
