"use client";

import { useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { DbCustomTag, DbAccountTag } from "@/types/accounting";
import { TAG_PALETTE } from "./shared";

interface TagsTabProps {
  tags: DbCustomTag[];
  accounts?: unknown[];
  accountTags: DbAccountTag[];
  onSaveTag: (tag: Partial<DbCustomTag> & { name: string; color: string }) => Promise<boolean>;
  onDeleteTag: (id: string) => Promise<boolean>;
  onAssignTag?: (accountId: string, tagId: string) => Promise<boolean>;
  onRemoveTag?: (accountId: string, tagId: string) => Promise<boolean>;
}

export function TagsTab({ tags, accountTags, onSaveTag, onDeleteTag }: TagsTabProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]!);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    setSaving(true);
    await onSaveTag({ name: newTagName.trim(), color: newTagColor });
    setSaving(false);
    setNewTagName("");
  };

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const at of accountTags) {
      map.set(at.tag_id, (map.get(at.tag_id) ?? 0) + 1);
    }
    return map;
  }, [accountTags]);

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-3">תגית חדשה</h4>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <input value={newTagName} onChange={e => setNewTagName(e.target.value)}
              placeholder="שם התגית..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {TAG_PALETTE.map(c => (
              <button key={c}
                onClick={() => setNewTagColor(c)}
                className={clsx("w-6 h-6 rounded-full border-2 transition-all",
                  newTagColor === c ? "border-gray-900 scale-125" : "border-transparent hover:border-gray-300",
                )}
                style={{ background: c }}
              />
            ))}
          </div>
          <button onClick={handleCreate} disabled={saving || !newTagName.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {saving ? "..." : "צור תגית"}
          </button>
        </div>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">אין תגיות מוגדרות עדיין</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tags.map(tag => {
            const count = tagCounts.get(tag.id) ?? 0;
            return (
              <div key={tag.id}
                className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ background: tag.color }} />
                  <span className="text-sm font-medium text-gray-800 truncate">{tag.name}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                    {count} חשבונות
                  </span>
                </div>
                <button
                  onClick={() => void onDeleteTag(tag.id)}
                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        לשייך תגיות לחשבונות — עבור לטאב &quot;מפתח סיווג&quot; ולחץ על עמודת התגיות.
      </p>
    </div>
  );
}
