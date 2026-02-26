"use client";

import { useState, useMemo, useRef } from "react";
import {
  Search, ChevronDown, Plus, Check, RotateCcw,
  GripVertical, Pencil, Trash2, Tag, Users, LayoutGrid, FileText,
} from "lucide-react";
import { clsx } from "clsx";
import type {
  DbAccount, DbCustomGroup, DbAccountClassificationOverride,
  DbCustomTag, DbAccountTag, DbCounterAccountName, ParentSection,
} from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER } from "@/types/accounting";

interface Props {
  accounts: DbAccount[];
  customGroups: DbCustomGroup[];
  classificationOverrides: DbAccountClassificationOverride[];
  tags: DbCustomTag[];
  accountTags: DbAccountTag[];
  counterNames: DbCounterAccountName[];
  transactions?: { counter_account: string | null }[];
  onSaveClassification: (accountId: string, groupId: string, note?: string) => Promise<boolean>;
  onDeleteClassification: (accountId: string) => Promise<boolean>;
  onSaveGroup: (group: Partial<DbCustomGroup> & { name: string; parent_section: ParentSection; group_codes: string[] }) => Promise<boolean>;
  onDeleteGroup: (id: string) => Promise<boolean>;
  onSaveTag: (tag: Partial<DbCustomTag> & { name: string; color: string }) => Promise<boolean>;
  onDeleteTag: (id: string) => Promise<boolean>;
  onAssignTag: (accountId: string, tagId: string) => Promise<boolean>;
  onRemoveTag: (accountId: string, tagId: string) => Promise<boolean>;
  onSaveCounterName: (code: string, displayName: string) => Promise<boolean>;
}

type InnerTab = "groups" | "classification" | "tags" | "counter";

function getEffectiveGroup(
  acct: DbAccount,
  customGroups: DbCustomGroup[],
  overrides: DbAccountClassificationOverride[],
): DbCustomGroup | null {
  const override = overrides.find(o => o.account_id === acct.id);
  if (override) return customGroups.find(g => g.id === override.custom_group_id) ?? null;
  for (const g of customGroups) {
    if ((g.account_codes ?? []).includes(acct.code)) return g;
  }
  for (const g of customGroups) {
    if (g.group_codes.includes(acct.latest_group_code ?? "")) return g;
  }
  return null;
}

const SECTION_COLORS: Record<ParentSection, string> = {
  cost_of_goods: "#EF4444", operating: "#F97316", admin: "#A855F7", finance: "#3B82F6", other: "#6B7280",
};

const TAG_PALETTE = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6",
  "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280", "#111827",
];

// ── Inline group select ───────────────────────────────────────

function GroupSelectCell({ customGroups, currentGroup, override, onSave, onDelete, saving }: {
  customGroups: DbCustomGroup[];
  currentGroup: DbCustomGroup | null;
  override: DbAccountClassificationOverride | undefined;
  onSave: (groupId: string) => Promise<void>;
  onDelete: () => Promise<void>;
  saving: boolean;
}) {
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

// ══════════════════════════════════════════════════════════════
// TAB 1 — Groups Management
// ══════════════════════════════════════════════════════════════

function GroupsTab({ accounts, customGroups, classificationOverrides, onSaveGroup, onDeleteGroup, onSaveClassification }: {
  accounts: DbAccount[];
  customGroups: DbCustomGroup[];
  classificationOverrides: DbAccountClassificationOverride[];
  onSaveGroup: Props["onSaveGroup"];
  onDeleteGroup: Props["onDeleteGroup"];
  onSaveClassification: Props["onSaveClassification"];
}) {
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

      {/* New / Edit Group Form */}
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
        {/* Groups tree */}
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

        {/* Unassigned panel */}
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

// ══════════════════════════════════════════════════════════════
// TAB 2 — Classification Key (existing, enhanced)
// ══════════════════════════════════════════════════════════════

function ClassificationTab({ accounts, customGroups, classificationOverrides, onSaveClassification, onDeleteClassification }: {
  accounts: DbAccount[];
  customGroups: DbCustomGroup[];
  classificationOverrides: DbAccountClassificationOverride[];
  tags?: DbCustomTag[];
  accountTags?: DbAccountTag[];
  onSaveClassification: Props["onSaveClassification"];
  onDeleteClassification: Props["onDeleteClassification"];
  onAssignTag?: Props["onAssignTag"];
  onRemoveTag?: Props["onRemoveTag"];
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "overridden" | "unclassified">("all");
  const [sortField, setSortField] = useState<"code" | "name">("code");
  const [savingId, setSavingId] = useState<string | null>(null);

  const overrideMap = useMemo(() =>
    new Map(classificationOverrides.map(o => [o.account_id, o])),
    [classificationOverrides],
  );

  const filtered = useMemo(() => {
    let list = accounts.filter(a => a.account_type === "expense");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.code.includes(q));
    }
    const withGroup = list.map(a => ({
      account: a,
      group: getEffectiveGroup(a, customGroups, classificationOverrides),
      override: overrideMap.get(a.id),
    }));
    const filtered = withGroup.filter(({ group, override }) => {
      if (filterType === "overridden") return !!override;
      if (filterType === "unclassified") return !group;
      return true;
    });
    filtered.sort((a, b) =>
      sortField === "code"
        ? a.account.code.localeCompare(b.account.code, undefined, { numeric: true })
        : a.account.name.localeCompare(b.account.name, "he")
    );
    return filtered;
  }, [accounts, customGroups, classificationOverrides, overrideMap, search, filterType, sortField]);

  const stats = useMemo(() => {
    const expenseAccounts = accounts.filter(a => a.account_type === "expense");
    return {
      total: expenseAccounts.length,
      unclassified: expenseAccounts.filter(a => !getEffectiveGroup(a, customGroups, classificationOverrides)).length,
      overridden: classificationOverrides.length,
    };
  }, [accounts, customGroups, classificationOverrides]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "סה\"כ חשבונות", value: stats.total, color: "text-gray-800", bg: "bg-gray-50" },
          { label: "ללא שיוך", value: stats.unclassified, color: stats.unclassified > 0 ? "text-red-600" : "text-gray-500", bg: stats.unclassified > 0 ? "bg-red-50" : "bg-gray-50" },
          { label: "override ידני", value: stats.overridden, color: "text-amber-700", bg: "bg-amber-50" },
        ].map(s => (
          <div key={s.label} className={clsx("rounded-xl p-3 border border-gray-200", s.bg)}>
            <p className={clsx("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או מפתח..."
            className="w-full pr-9 pl-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <div className="flex gap-1">
          {([
            { id: "all", label: "הכל" },
            { id: "unclassified", label: "ללא שיוך" },
            { id: "overridden", label: "override" },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setFilterType(f.id)}
              className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
                filterType === f.id ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:border-primary-300",
              )}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto" dir="rtl">
          <table className="text-xs border-collapse" style={{ minWidth: "600px" }}>
            <thead>
              <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                <th className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-slate-600"
                  onClick={() => setSortField("code")}>
                  <div className="flex items-center gap-1">
                    מפתח {sortField === "code" && <span className="text-primary-300">▾</span>}
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-slate-600"
                  onClick={() => setSortField("name")}>
                  <div className="flex items-center gap-1">
                    שם חשבון {sortField === "name" && <span className="text-primary-300">▾</span>}
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-semibold min-w-[200px]">סיווג פנימי</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-sm">לא נמצאו חשבונות</p>
                  </td>
                </tr>
              ) : filtered.map(({ account, group, override }) => {
                const isSaving = savingId === account.id;
                return (
                  <tr key={account.id}
                    className={clsx("border-b border-gray-50 hover:bg-gray-50/60 transition-colors",
                      isSaving && "opacity-60",
                      !group && "bg-red-50/30",
                      !!override && "bg-amber-50/20",
                    )}>
                    <td className="py-2.5 px-4">
                      <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {account.code}
                      </code>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-gray-800 text-[12px]">
                      {account.name}
                      {!group && <span className="mr-2 text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-bold">ללא שיוך</span>}
                    </td>
                    <td className="py-2 px-4">
                      <GroupSelectCell
                        customGroups={customGroups}
                        currentGroup={group}
                        override={override}
                        saving={isSaving}
                        onSave={async gId => {
                          setSavingId(account.id);
                          await onSaveClassification(account.id, gId);
                          setSavingId(null);
                        }}
                        onDelete={async () => {
                          setSavingId(account.id);
                          await onDeleteClassification(account.id);
                          setSavingId(null);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">מציג {filtered.length} מתוך {stats.total} חשבונות</p>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-300" /> override ידני
            <span className="inline-block w-3 h-3 rounded-full bg-red-200 mr-2" /> ללא הגדרה
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 3 — Tags
// ══════════════════════════════════════════════════════════════

function TagsTab({ tags, accountTags, onSaveTag, onDeleteTag }: {
  tags: DbCustomTag[];
  accounts?: DbAccount[];
  accountTags: DbAccountTag[];
  onSaveTag: Props["onSaveTag"];
  onDeleteTag: Props["onDeleteTag"];
  onAssignTag?: Props["onAssignTag"];
  onRemoveTag?: Props["onRemoveTag"];
}) {
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
      {/* Create tag */}
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

      {/* Tags list */}
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

// ══════════════════════════════════════════════════════════════
// TAB 4 — Counter Account Names
// ══════════════════════════════════════════════════════════════

function CounterNamesTab({ counterNames, transactions, onSaveCounterName }: {
  counterNames: DbCounterAccountName[];
  accounts?: DbAccount[];
  transactions: { counter_account: string | null }[];
  onSaveCounterName: Props["onSaveCounterName"];
}) {
  const [search, setSearch] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const counterMap = useMemo(() =>
    new Map(counterNames.map(c => [c.counter_account_code, c.display_name])),
    [counterNames],
  );

  // Unique counter account codes from transactions (sorted by frequency)
  const counterCodes = useMemo(() => {
    const freq = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.counter_account) {
        freq.set(tx.counter_account, (freq.get(tx.counter_account) ?? 0) + 1);
      }
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count, displayName: counterMap.get(code) }));
  }, [transactions, counterMap]);

  const filtered = counterCodes.filter(c =>
    !search || c.code.includes(search) || (c.displayName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (code: string, name: string) => {
    setSaving(true);
    await onSaveCounterName(code, name);
    setSaving(false);
    setEditCode("");
    setEditName("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי קוד חשבון..."
            className="w-full pr-9 pl-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <p className="text-xs text-gray-500 shrink-0">{counterNames.length} שמות מוגדרים</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="text-xs border-collapse w-full" dir="rtl">
          <thead>
            <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
              <th className="text-right py-3 px-4 font-semibold">קוד חשבון נגדי</th>
              <th className="text-right py-3 px-4 font-semibold">שם תצוגה</th>
              <th className="text-center py-3 px-4 font-semibold w-20">תנועות</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(({ code, count, displayName }) => {
              const isEditing = editCode === code;
              return (
                <tr key={code} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="py-2.5 px-4">
                    <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                      {code}
                    </code>
                  </td>
                  <td className="py-2.5 px-4">
                    {isEditing ? (
                      <input autoFocus value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") void handleSave(code, editName); if (e.key === "Escape") setEditCode(""); }}
                        className="w-full px-2.5 py-1 border border-primary-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-300 bg-white"
                      />
                    ) : (
                      <span className={clsx(displayName ? "text-gray-800 font-medium" : "text-gray-400 italic")}>
                        {displayName ?? "— לא מוגדר —"}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center text-gray-400">{count}</td>
                  <td className="py-2.5 px-4">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button onClick={() => void handleSave(code, editName)} disabled={saving}
                          className="px-2 py-1 bg-primary-600 text-white rounded text-[10px] hover:bg-primary-700 disabled:opacity-50">
                          {saving ? "..." : "שמור"}
                        </button>
                        <button onClick={() => setEditCode("")}
                          className="px-2 py-1 border border-gray-200 rounded text-[10px] text-gray-600">
                          ביטול
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditCode(code); setEditName(displayName ?? ""); }}
                        className="px-2.5 py-1 border border-gray-200 rounded-lg text-[10px] text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component — 4 Inner Tabs
// ══════════════════════════════════════════════════════════════

export default function AccountMappingTab({
  accounts, customGroups, classificationOverrides, tags, accountTags, counterNames,
  transactions: txProp,
  onSaveClassification, onDeleteClassification, onSaveGroup, onDeleteGroup,
  onSaveTag, onDeleteTag, onAssignTag, onRemoveTag, onSaveCounterName,
}: Props) {
  const [activeTab, setActiveTab] = useState<InnerTab>("classification");

  const stats = useMemo(() => {
    const expense = accounts.filter(a => a.account_type === "expense");
    const unclassified = expense.filter(a => !getEffectiveGroup(a, customGroups, classificationOverrides)).length;
    return { unclassified };
  }, [accounts, customGroups, classificationOverrides]);

  const innerTabs: Array<{ id: InnerTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: "groups", label: "קיבוצים", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "classification", label: "מפתח סיווג", icon: <LayoutGrid className="w-3.5 h-3.5" />, badge: stats.unclassified > 0 ? stats.unclassified : undefined },
    { id: "tags", label: "תגיות", icon: <Tag className="w-3.5 h-3.5" /> },
    { id: "counter", label: "שמות נגדיים", icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  const transactions = txProp ?? [];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Inner tab bar */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {innerTabs.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all border border-b-0",
              activeTab === tab.id
                ? "bg-white border-gray-200 text-primary-700 -mb-px z-10"
                : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50",
            )}>
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {tab.badge > 9 ? "9+" : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-1">
        {activeTab === "groups" && (
          <GroupsTab
            accounts={accounts}
            customGroups={customGroups}
            classificationOverrides={classificationOverrides}
            onSaveGroup={onSaveGroup}
            onDeleteGroup={onDeleteGroup}
            onSaveClassification={onSaveClassification}
          />
        )}
        {activeTab === "classification" && (
          <ClassificationTab
            accounts={accounts}
            customGroups={customGroups}
            classificationOverrides={classificationOverrides}
            tags={tags}
            accountTags={accountTags}
            onSaveClassification={onSaveClassification}
            onDeleteClassification={onDeleteClassification}
            onAssignTag={onAssignTag}
            onRemoveTag={onRemoveTag}
          />
        )}
        {activeTab === "tags" && (
          <TagsTab
            tags={tags}
            accounts={accounts}
            accountTags={accountTags}
            onSaveTag={onSaveTag}
            onDeleteTag={onDeleteTag}
            onAssignTag={onAssignTag}
            onRemoveTag={onRemoveTag}
          />
        )}
        {activeTab === "counter" && (
          <CounterNamesTab
            counterNames={counterNames}
            accounts={accounts}
            transactions={transactions}
            onSaveCounterName={onSaveCounterName}
          />
        )}
      </div>
    </div>
  );
}
