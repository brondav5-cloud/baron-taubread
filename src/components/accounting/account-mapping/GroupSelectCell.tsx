"use client";

import { useState, useMemo, useRef } from "react";
import { ChevronDown, Check, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import type {
  DbCustomGroup,
  DbAccountClassificationOverride,
} from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER } from "@/types/accounting";

interface GroupSelectCellProps {
  customGroups: DbCustomGroup[];
  currentGroup: DbCustomGroup | null;
  override: DbAccountClassificationOverride | undefined;
  onSave: (groupId: string) => Promise<void>;
  onDelete: () => Promise<void>;
  saving: boolean;
}

export function GroupSelectCell({
  customGroups, currentGroup, override, onSave, onDelete, saving,
}: GroupSelectCellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const bySection = useMemo(() => {
    const map = new Map<string, DbCustomGroup[]>();
    for (const g of customGroups) {
      const list = map.get(g.parent_section) ?? [];
      list.push(g);
      map.set(g.parent_section, list);
    }
    return map;
  }, [customGroups]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)} disabled={saving}
        className={clsx(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all min-w-[140px] max-w-[200px] w-full",
          currentGroup
            ? override
              ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
            : "border-dashed border-red-200 bg-red-50/50 text-red-500",
          saving && "opacity-50 cursor-wait",
        )}
      >
        <span className="w-2 h-2 rounded-full shrink-0"
          style={{ background: currentGroup?.color ?? "#FCA5A5" }} />
        <span className="truncate flex-1 text-right">
          {currentGroup?.name ?? "ללא הגדרה"}
        </span>
        {override && <span className="text-amber-500 text-[9px] font-bold">✎</span>}
        <ChevronDown className="w-3 h-3 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          style={{ minWidth: "220px", right: 0 }}
        >
          <div className="overflow-y-auto max-h-64">
            {PARENT_SECTION_ORDER.map(sec => {
              const groups = bySection.get(sec) ?? [];
              if (!groups.length) return null;
              return (
                <div key={sec}>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 uppercase tracking-wide sticky top-0">
                    {PARENT_SECTION_LABELS[sec]}
                  </div>
                  {groups.map(g => (
                    <button key={g.id}
                      onClick={async () => { setOpen(false); await onSave(g.id); }}
                      className={clsx("flex items-center gap-2 w-full px-3 py-2 text-[11px] text-right hover:bg-gray-50 transition-colors",
                        currentGroup?.id === g.id && "bg-primary-50 text-primary-700 font-semibold",
                      )}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                      <span className="flex-1">{g.name}</span>
                      {currentGroup?.id === g.id && <Check className="w-3 h-3 text-primary-500" />}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          {override && (
            <div className="border-t border-gray-100 p-2">
              <button
                onClick={async () => { setOpen(false); await onDelete(); }}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <RotateCcw className="w-3 h-3" /> אפס לסיווג ברירת מחדל
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
