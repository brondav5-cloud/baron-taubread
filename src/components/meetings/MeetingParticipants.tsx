"use client";

import { Plus, Trash2, Users } from "lucide-react";

export interface ParticipantOption {
  id: string;
  name: string;
}

export interface Participant {
  userId?: string;
  name: string;
  isExternal?: boolean;
}

interface MeetingParticipantsProps {
  participants: Participant[];
  userOptions: ParticipantOption[];
  onChange: (participants: Participant[]) => void;
}

export default function MeetingParticipants({
  participants,
  userOptions,
  onChange,
}: MeetingParticipantsProps) {
  const toggle = (userId: string, name: string) => {
    const exists = participants.some((p) => p.userId === userId);
    onChange(
      exists
        ? participants.filter((p) => p.userId !== userId)
        : [...participants, { userId, name }],
    );
  };

  const addExternal = () => {
    const name = window.prompt("שם המשתתף החיצוני:");
    if (name?.trim()) {
      onChange([...participants, { name: name.trim(), isExternal: true }]);
    }
  };

  const remove = (idx: number) => {
    onChange(participants.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3 text-sm">
        <Users size={16} className="text-gray-400" /> משתתפים
      </h2>

      <div className="flex flex-wrap gap-2">
        {userOptions.map((u) => {
          const selected = participants.some((p) => p.userId === u.id);
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => toggle(u.id, u.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                selected
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {u.name.charAt(0)}
              </span>
              {u.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={addExternal}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          <Plus size={14} /> חיצוני
        </button>
      </div>

      {/* External participants list */}
      {participants.filter((p) => p.isExternal).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {participants
            .filter((p) => p.isExternal)
            .map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full"
              >
                🌐 {p.name}
                <button
                  type="button"
                  onClick={() =>
                    remove(
                      participants.findIndex(
                        (pp) => pp.isExternal && pp.name === p.name,
                      ),
                    )
                  }
                  className="text-yellow-400 hover:text-yellow-700"
                >
                  <Trash2 size={10} />
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
