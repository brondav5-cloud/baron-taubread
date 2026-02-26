"use client";

import { useState } from "react";
import { Plus, Trash2, RotateCcw, Search, Settings } from "lucide-react";
import { clsx } from "clsx";
import type {
  DbCustomGroup, DbCustomTag, DbAccount,
  DbAccountClassificationOverride, DbCounterAccountName,
  ParentSection, DbAccountTag,
} from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER } from "@/types/accounting";

interface Props {
  customGroups: DbCustomGroup[];
  accounts: DbAccount[];
  classificationOverrides: DbAccountClassificationOverride[];
  tags: DbCustomTag[];
  accountTags: DbAccountTag[];
  counterNames: DbCounterAccountName[];
  onSaveGroup: (g: Partial<DbCustomGroup> & { name: string; parent_section: ParentSection; group_codes: string[] }) => Promise<boolean>;
  onDeleteGroup: (id: string) => Promise<boolean>;
  onSaveClassification: (accountId: string, groupId: string, note?: string) => Promise<boolean>;
  onDeleteClassification: (accountId: string) => Promise<boolean>;
  onSaveTag: (t: Partial<DbCustomTag> & { name: string; color: string }) => Promise<boolean>;
  onDeleteTag: (id: string) => Promise<boolean>;
  onAssignTag: (accountId: string, tagId: string) => Promise<boolean>;
  onRemoveTag: (accountId: string, tagId: string) => Promise<boolean>;
  onSaveCounterName: (code: string, displayName: string) => Promise<boolean>;
}

type SubTab = "groups" | "overrides" | "tags" | "counter-names";

const PRESET_COLORS = [
  "#EF4444","#F97316","#EAB308","#10B981","#3B82F6",
  "#8B5CF6","#EC4899","#14B8A6","#64748B","#6366F1",
];

export default function ClassificationTab({
  customGroups, accounts, classificationOverrides, tags,
  accountTags, counterNames,
  onSaveGroup, onDeleteGroup, onSaveClassification, onDeleteClassification,
  onSaveTag, onDeleteTag, onAssignTag, onRemoveTag, onSaveCounterName,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>("overrides");

  const SUB_TABS: Array<{ id: SubTab; label: string }> = [
    { id: "overrides", label: "מפתח סיווג" },
    { id: "groups", label: "קיבוצים" },
    { id: "tags", label: "תגיות" },
    { id: "counter-names", label: "חשבונות נגדיים" },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5 w-fit">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              subTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "overrides" && (
        <OverridesTab
          accounts={accounts}
          customGroups={customGroups}
          classificationOverrides={classificationOverrides}
          onSave={onSaveClassification}
          onDelete={onDeleteClassification}
        />
      )}
      {subTab === "groups" && (
        <GroupsTab
          groups={customGroups}
          onSave={onSaveGroup}
          onDelete={onDeleteGroup}
        />
      )}
      {subTab === "tags" && (
        <TagsTab
          tags={tags}
          accounts={accounts}
          accountTags={accountTags}
          onSaveTag={onSaveTag}
          onDeleteTag={onDeleteTag}
          onAssign={onAssignTag}
          onRemove={onRemoveTag}
        />
      )}
      {subTab === "counter-names" && (
        <CounterNamesTab
          counterNames={counterNames}
          onSave={onSaveCounterName}
        />
      )}
    </div>
  );
}

// ── Overrides Tab ─────────────────────────────────────────────

function OverridesTab({
  accounts, customGroups, classificationOverrides, onSave, onDelete,
}: {
  accounts: DbAccount[];
  customGroups: DbCustomGroup[];
  classificationOverrides: DbAccountClassificationOverride[];
  onSave: (accountId: string, groupId: string, note?: string) => Promise<boolean>;
  onDelete: (accountId: string) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const [showOnlyOverrides, setShowOnlyOverrides] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const overrideMap = new Map(classificationOverrides.map((o) => [o.account_id, o]));
  const gcToGroup = new Map<string, DbCustomGroup>();
  for (const g of customGroups) {
    for (const gc of g.group_codes) gcToGroup.set(gc, g);
  }

  const filtered = accounts
    .filter((a) => {
      if (showOnlyOverrides && !overrideMap.has(a.id)) return false;
      const q = search.toLowerCase();
      return !q || a.name.toLowerCase().includes(q) || a.code.includes(q);
    })
    .sort((a, b) => {
      const ao = overrideMap.has(a.id) ? 0 : 1;
      const bo = overrideMap.has(b.id) ? 0 : 1;
      return ao - bo || a.name.localeCompare(b.name);
    });

  const handleChange = async (accountId: string, groupId: string) => {
    setSaving(accountId);
    await onSave(accountId, groupId);
    setSaving(null);
  };

  const handleReset = async (accountId: string) => {
    setSaving(accountId);
    await onDelete(accountId);
    setSaving(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="חפש חשבון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 border border-gray-200 rounded-xl text-xs bg-white"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyOverrides}
            onChange={(e) => setShowOnlyOverrides(e.target.checked)}
            className="rounded"
          />
          הצג רק שינויים
        </label>
        <span className="text-xs text-gray-400">{filtered.length} חשבונות</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-right py-2.5 px-4 font-semibold text-gray-600 min-w-[180px]">חשבון</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600 min-w-[120px]">סיווג מקורי</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600 min-w-[160px]">סיווג פנימי</th>
                <th className="py-2.5 px-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc) => {
                const override = overrideMap.get(acc.id);
                const defaultGroup = acc.latest_group_code ? gcToGroup.get(acc.latest_group_code) : null;
                const currentGroupId = override?.custom_group_id ?? defaultGroup?.id ?? "";
                const hasOverride = !!override;

                return (
                  <tr key={acc.id} className={clsx("border-b border-gray-50 hover:bg-gray-50/50",
                    hasOverride && "bg-amber-50/30",
                  )}>
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-gray-800">{acc.name}</p>
                      <p className="text-[10px] text-gray-400">{acc.code} · {acc.latest_group_code ?? "—"}</p>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">
                      {defaultGroup?.name ?? acc.latest_group_code ?? "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={currentGroupId}
                        onChange={(e) => void handleChange(acc.id, e.target.value)}
                        disabled={saving === acc.id}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-xs bg-white disabled:opacity-50"
                      >
                        <option value="">— ברירת מחדל —</option>
                        {PARENT_SECTION_ORDER.map((sec) => (
                          <optgroup key={sec} label={PARENT_SECTION_LABELS[sec]}>
                            {customGroups.filter(g => g.parent_section === sec).map((g) => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasOverride ? (
                        <div className="flex items-center gap-1 justify-center">
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">🔄</span>
                          <button
                            onClick={() => void handleReset(acc.id)}
                            disabled={saving === acc.id}
                            className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="אפס לברירת מחדל"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-gray-400">🔄 = שונה מהסיווג המקורי · ברירת מחדל = לפי group_code מהקובץ</p>
    </div>
  );
}

// ── Groups Tab ────────────────────────────────────────────────

function GroupsTab({
  groups, onSave, onDelete,
}: {
  groups: DbCustomGroup[];
  onSave: (g: Partial<DbCustomGroup> & { name: string; parent_section: ParentSection; group_codes: string[] }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSection, setFormSection] = useState<ParentSection>("operating");
  const [formCodes, setFormCodes] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[4]!);
  const [saving, setSaving] = useState(false);

  const startEdit = (g: DbCustomGroup) => {
    setEditingId(g.id);
    setFormName(g.name);
    setFormSection(g.parent_section);
    setFormCodes(g.group_codes.join(","));
    setFormColor(g.color);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName) return;
    setSaving(true);
    const codes = formCodes.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    await onSave({ id: editingId ?? undefined, name: formName, parent_section: formSection, group_codes: codes, color: formColor });
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setFormName(""); setFormCodes("");
  };

  const bySection = new Map<ParentSection, DbCustomGroup[]>();
  for (const g of groups) {
    const list = bySection.get(g.parent_section) ?? [];
    list.push(g);
    bySection.set(g.parent_section, list);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">{groups.length} קיבוצים מוגדרים</p>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setFormName(""); setFormCodes(""); setFormColor(PRESET_COLORS[0]!); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-xl text-xs font-medium hover:bg-primary-700"
        >
          <Plus className="w-3.5 h-3.5" /> קיבוץ חדש
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-900">{editingId ? "עריכת קיבוץ" : "קיבוץ חדש"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">שם</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white" placeholder="שם הקיבוץ" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">סעיף</label>
              <select value={formSection} onChange={(e) => setFormSection(e.target.value as ParentSection)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
                {PARENT_SECTION_ORDER.map(s => (
                  <option key={s} value={s}>{PARENT_SECTION_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">קודי קבוצה (מופרד בפסיקות)</label>
              <input value={formCodes} onChange={(e) => setFormCodes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white" placeholder="700,701,702" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">צבע</label>
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => setFormColor(c)}
                    className={clsx("w-5 h-5 rounded-full border-2 transition-all", formColor === c ? "border-gray-900 scale-110" : "border-transparent")}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!formName || saving}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? "שומר..." : "שמור"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50">
              ביטול
            </button>
          </div>
        </div>
      )}

      {PARENT_SECTION_ORDER.map((sec) => {
        const gs = bySection.get(sec) ?? [];
        if (gs.length === 0) return null;
        return (
          <div key={sec}>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
              {PARENT_SECTION_LABELS[sec]}
            </h3>
            <div className="space-y-1.5">
              {gs.map((g) => (
                <div key={g.id}
                  className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2.5 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: g.color }} />
                    <div>
                      <p className="text-xs font-medium text-gray-800">{g.name}</p>
                      <p className="text-[10px] text-gray-400">{g.group_codes.join(", ")}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(g)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => void onDelete(g.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tags Tab ──────────────────────────────────────────────────

function TagsTab({
  tags, accounts, accountTags, onSaveTag, onDeleteTag, onAssign, onRemove,
}: {
  tags: DbCustomTag[];
  accounts: DbAccount[];
  accountTags: DbAccountTag[];
  onSaveTag: (t: Partial<DbCustomTag> & { name: string; color: string }) => Promise<boolean>;
  onDeleteTag: (id: string) => Promise<boolean>;
  onAssign: (accountId: string, tagId: string) => Promise<boolean>;
  onRemove: (accountId: string, tagId: string) => Promise<boolean>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]!);
  const [saving, setSaving] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const tagAccountIds = new Set(
    accountTags.filter(at => at.tag_id === selectedTagId).map(at => at.account_id),
  );

  const filteredAccounts = accounts.filter((a) => {
    const q = search.toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.code.includes(q);
  });

  const handleSaveTag = async () => {
    if (!formName) return;
    setSaving(true);
    await onSaveTag({ name: formName, color: formColor });
    setSaving(false);
    setShowForm(false);
    setFormName("");
  };

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* Tags list */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-xs font-semibold text-gray-700">תגיות ({tags.length})</p>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-primary-600 text-white rounded-lg text-xs hover:bg-primary-700">
            <Plus className="w-3 h-3" /> תגית
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
            <input value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="שם תגית" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white" />
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setFormColor(c)}
                  className={clsx("w-5 h-5 rounded-full border-2", formColor === c ? "border-gray-900" : "border-transparent")}
                  style={{ background: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveTag} disabled={!formName || saving}
                className="px-3 py-1 bg-primary-600 text-white rounded-lg text-xs disabled:opacity-50">
                {saving ? "..." : "שמור"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-3 py-1 border rounded-lg text-xs text-gray-500">ביטול</button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {tags.map((tag) => {
            const count = accountTags.filter(at => at.tag_id === tag.id).length;
            return (
              <button key={tag.id} onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                className={clsx("w-full flex items-center justify-between border rounded-xl px-3 py-2.5 transition-colors text-xs",
                  selectedTagId === tag.id ? "border-primary-300 bg-primary-50" : "border-gray-100 bg-white hover:border-gray-200",
                )}>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: tag.color }} />
                  <span className="font-medium text-gray-800">{tag.name}</span>
                  <span className="text-gray-400">{tag.icon}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{count} חשבונות</span>
                  <button onClick={(e) => { e.stopPropagation(); void onDeleteTag(tag.id); }}
                    className="p-1 text-gray-300 hover:text-red-500 rounded-lg">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </button>
            );
          })}
          {tags.length === 0 && <p className="text-xs text-gray-400 text-center py-4">אין תגיות עדיין</p>}
        </div>
      </div>

      {/* Account assignment */}
      {selectedTagId && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-700">
            שיוך חשבונות — {tags.find(t => t.id === selectedTagId)?.name}
          </p>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input placeholder="חפש..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white" />
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {filteredAccounts.map((a) => {
              const assigned = tagAccountIds.has(a.id);
              return (
                <button key={a.id} onClick={() => assigned ? void onRemove(a.id, selectedTagId) : void onAssign(a.id, selectedTagId)}
                  className={clsx("w-full flex items-center justify-between text-xs rounded-xl px-3 py-2 transition-colors border",
                    assigned ? "bg-primary-50 border-primary-200" : "bg-white border-gray-100 hover:bg-gray-50",
                  )}>
                  <span className="font-medium text-gray-800 truncate">{a.name}</span>
                  <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium",
                    assigned ? "bg-primary-200 text-primary-800" : "bg-gray-100 text-gray-500",
                  )}>
                    {assigned ? "✓ משויך" : "+ שייך"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Counter Names Tab ─────────────────────────────────────────

function CounterNamesTab({
  counterNames, onSave,
}: {
  counterNames: DbCounterAccountName[];
  onSave: (code: string, displayName: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async (code: string) => {
    setSaving(true);
    await onSave(code, editValue);
    setSaving(false);
    setEditing(null);
  };

  const handleAdd = async () => {
    if (!newCode || !newName) return;
    setSaving(true);
    await onSave(newCode, newName);
    setSaving(false);
    setNewCode(""); setNewName("");
  };

  return (
    <div className="space-y-4">
      {/* Add new */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-700">הוספת שם ידידותי</h3>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">קוד חשבון נגדי</label>
            <input value={newCode} onChange={(e) => setNewCode(e.target.value)}
              placeholder="10921" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">שם תצוגה</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="טחנות ישראליות בע&quot;מ" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white" />
          </div>
          <button onClick={handleAdd} disabled={!newCode || !newName || saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-medium hover:bg-primary-700 disabled:opacity-50">
            הוסף
          </button>
        </div>
      </div>

      {/* Existing */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-right py-2.5 px-4 font-semibold text-gray-600">קוד</th>
              <th className="text-right py-2.5 px-4 font-semibold text-gray-600">שם תצוגה</th>
              <th className="py-2.5 px-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {counterNames.length === 0 ? (
              <tr><td colSpan={3} className="py-8 text-center text-gray-400">אין שמות מוגדרים</td></tr>
            ) : counterNames.map((cn) => (
              <tr key={cn.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="py-2 px-4 text-gray-500 font-mono">{cn.counter_account_code}</td>
                <td className="py-2 px-4">
                  {editing === cn.counter_account_code ? (
                    <div className="flex gap-2">
                      <input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs" autoFocus />
                      <button onClick={() => void handleSaveEdit(cn.counter_account_code)}
                        disabled={saving} className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs">שמור</button>
                      <button onClick={() => setEditing(null)} className="px-2 py-1 border rounded-lg text-xs text-gray-500">ביטול</button>
                    </div>
                  ) : (
                    <span className="text-gray-800">{cn.display_name}</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  <button onClick={() => { setEditing(cn.counter_account_code); setEditValue(cn.display_name); }}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
