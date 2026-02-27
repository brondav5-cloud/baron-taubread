"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Plus, GripVertical, Pencil, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type {
  DbAccount, DbCustomGroup, DbAccountClassificationOverride, ParentSection,
} from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER } from "@/types/accounting";
import { getEffectiveGroup, SECTION_COLORS, TAG_PALETTE } from "./shared";

interface GroupsTabProps {
  accounts: DbAccount[];
  customGroups: DbCustomGroup[];
  classificationOverrides: DbAccountClassificationOverride[];
  onSaveGroup: (group: Partial<DbCustomGroup> & { name: string; parent_section: ParentSection; group_codes: string[] }) => Promise<boolean>;
  onDeleteGroup: (id: string) => Promise<boolean>;
  onSaveClassification: (accountId: string, groupId: string, note?: string) => Promise<boolean>;
}

export function GroupsTab({
  accounts, customGroups, classificationOverrides,
  onSaveGroup, onDeleteGroup, onSaveClassification,
}: GroupsTabProps) {
  const [editingGroup, setEditingGroup] = useState<Partial<DbCustomGroup> | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [dragAccountId, setDragAccountId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const overrideMap = useMemo(() =>
    new Map(classificationOverrides.map(o => [o.account_id, o.custom_group_id])),
    [classificationOverrides],
  );

  const accountsByGroup = useMemo(() => {
    const map = new Map<string, DbAccount[]>();
    const unassigned: DbAccount[] = [];
    for (const acct of accounts) {
      if (acct.account_type !== "expense") continue;
      const group = getEffectiveGroup(acct, customGroups, classificationOverrides);
      if (!group) { unassigned.push(acct); continue; }
      const list = map.get(group.id) ?? [];
      list.push(acct);
      map.set(group.id, list);
    }
    return { byGroup: map, unassigned };
  }, [accounts, customGroups, classificationOverrides]);

  const groupsBySection = useMemo(() => {
    const map = new Map<string, DbCustomGroup[]>();
    for (const g of customGroups) {
      const list = map.get(g.parent_section) ?? [];
      list.push(g);
      map.set(g.parent_section, list);
    }
    return map;
  }, [customGroups]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDrop = async (toGroupId: string) => {
    if (!dragAccountId) return;
    setDragOverGroupId(null);
    setSaving(true);
    await onSaveClassification(dragAccountId, toGroupId);
    setSaving(false);
    setDragAccountId(null);
  };

  const handleSaveGroup = async (group: Partial<DbCustomGroup>) => {
    setSaving(true);
    await onSaveGroup({
      ...group,
      name: group.name ?? "קבוצה חדשה",
      parent_section: group.parent_section ?? "other",
      group_codes: group.group_codes ?? [],
      account_codes: group.account_codes ?? [],
    });
    setSaving(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (g: DbCustomGroup) => {
    const count = accountsByGroup.byGroup.get(g.id)?.length ?? 0;
    if (count > 0) {
      alert(`לא ניתן למחוק — יש ${count} חשבונות בקבוצה זו. העבר אותם קודם.`);
      return;
    }
    if (!confirm(`למחוק את הקבוצה "${g.name}"?`)) return;
    await onDeleteGroup(g.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          גרור חשבון מרשימה לקבוצה כדי לשנות את שיוכו
          {saving && <span className="mr-2 text-primary-600 animate-pulse">שומר...</span>}
        </p>
        <button
          onClick={() => setEditingGroup({ parent_section: "cost_of_goods", group_codes: [], account_codes: [], color: "#6B7280" })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-xl text-xs font-medium hover:bg-primary-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> קבוצה חדשה
        </button>
      </div>

      {editingGroup !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-blue-900">
            {editingGroup.id ? "עריכת קבוצה" : "קבוצה חדשה"}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">שם הקבוצה</label>
              <input value={editingGroup.name ?? ""}
                onChange={e => setEditingGroup(g => ({ ...g, name: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-300"
                placeholder="שם הקבוצה..."
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">סעיף</label>
              <select
                value={editingGroup.parent_section ?? "other"}
                onChange={e => setEditingGroup(g => ({ ...g, parent_section: e.target.value as ParentSection }))}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-300"
              >
                {PARENT_SECTION_ORDER.map(sec => (
                  <option key={sec} value={sec}>{PARENT_SECTION_LABELS[sec]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">צבע</label>
              <div className="flex flex-wrap gap-1.5">
                {TAG_PALETTE.map(c => (
                  <button key={c}
                    onClick={() => setEditingGroup(g => ({ ...g, color: c }))}
                    className={clsx("w-5 h-5 rounded-full border-2 transition-all",
                      editingGroup.color === c ? "border-gray-900 scale-125" : "border-transparent hover:border-gray-300"
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">סדר תצוגה</label>
              <input type="number" value={editingGroup.display_order ?? 0}
                onChange={e => setEditingGroup(g => ({ ...g, display_order: +e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void handleSaveGroup(editingGroup)} disabled={saving || !editingGroup.name}
              className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? "שומר..." : "שמור"}
            </button>
            <button onClick={() => setEditingGroup(null)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              ביטול
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
        <div className="space-y-3">
          {PARENT_SECTION_ORDER.map(sec => {
            const groups = (groupsBySection.get(sec) ?? [])
              .sort((a, b) => a.display_order - b.display_order);
            if (!groups.length) return null;
            return (
              <div key={sec}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: SECTION_COLORS[sec] }} />
                  <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                    {PARENT_SECTION_LABELS[sec]}
                  </p>
                </div>
                <div className="space-y-1.5 pr-4">
                  {groups.map(g => {
                    const groupAccounts = accountsByGroup.byGroup.get(g.id) ?? [];
                    const isExpanded = expandedGroups.has(g.id);
                    const isDragTarget = dragOverGroupId === g.id;
                    return (
                      <div key={g.id}
                        className={clsx("bg-white border rounded-xl transition-all",
                          isDragTarget ? "border-primary-400 bg-primary-50 shadow-md" : "border-gray-200",
                        )}
                        onDragOver={e => { e.preventDefault(); setDragOverGroupId(g.id); }}
                        onDragLeave={() => setDragOverGroupId(null)}
                        onDrop={() => void handleDrop(g.id)}
                      >
                        <div className="flex items-center gap-2 px-3 py-2">
                          <button onClick={() => toggleGroup(g.id)} className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: g.color }} />
                            <span className="text-[12px] font-semibold text-gray-800 truncate">{g.name}</span>
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                              {groupAccounts.length}
                            </span>
                            <ChevronDown className={clsx("w-3.5 h-3.5 text-gray-400 transition-transform shrink-0",
                              isExpanded && "rotate-180")} />
                          </button>
                          <button
                            onClick={() => setEditingGroup({ ...g })}
                            className="p-1 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded transition-colors"
                            title="עריכה"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => void handleDeleteGroup(g)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="מחיקה"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {isExpanded && groupAccounts.length > 0 && (
                          <div className="px-3 pb-2 space-y-1 border-t border-gray-100 pt-2">
                            {groupAccounts.map(acct => (
                              <div key={acct.id}
                                draggable
                                onDragStart={() => setDragAccountId(acct.id)}
                                onDragEnd={() => setDragAccountId(null)}
                                className={clsx(
                                  "flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg text-[11px] cursor-grab active:cursor-grabbing hover:bg-gray-100 transition-colors",
                                  dragAccountId === acct.id && "opacity-40",
                                )}>
                                <GripVertical className="w-3 h-3 text-gray-300 shrink-0" />
                                <span className="font-mono text-[10px] text-gray-400">{acct.code}</span>
                                <span className="text-gray-700 truncate">{acct.name}</span>
                                {overrideMap.has(acct.id) && (
                                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded shrink-0">✎</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {isExpanded && groupAccounts.length === 0 && (
                          <p className="px-3 pb-2 text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                            גרור חשבונות לכאן
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sticky top-4">
          <h4 className="text-xs font-bold text-red-800 mb-3">
            ⚠️ ללא שיוך ({accountsByGroup.unassigned.length})
          </h4>
          {accountsByGroup.unassigned.length === 0 ? (
            <p className="text-[11px] text-green-600 text-center py-4">✅ כל החשבונות משוייכים</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {accountsByGroup.unassigned.map(acct => (
                <div key={acct.id}
                  draggable
                  onDragStart={() => setDragAccountId(acct.id)}
                  onDragEnd={() => setDragAccountId(null)}
                  className={clsx(
                    "flex items-center gap-2 px-2 py-1.5 bg-white border border-red-100 rounded-lg text-[11px] cursor-grab active:cursor-grabbing hover:border-red-300 transition-colors",
                    dragAccountId === acct.id && "opacity-40",
                  )}>
                  <GripVertical className="w-3 h-3 text-red-300 shrink-0" />
                  <span className="font-mono text-[10px] text-gray-400">{acct.code}</span>
                  <span className="text-gray-700 truncate">{acct.name}</span>
                </div>
              ))}
            </div>
          )}
          {accountsByGroup.unassigned.length > 0 && (
            <p className="text-[9px] text-gray-400 mt-2 text-center">גרור חשבון לקבוצה כדי לשייך אותו</p>
          )}
        </div>
      </div>
    </div>
  );
}
