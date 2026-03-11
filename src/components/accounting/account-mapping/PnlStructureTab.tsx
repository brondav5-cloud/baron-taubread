"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Plus, Trash2, Loader2, RefreshCw, Pencil, Check, X, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import type { VirtualGroup } from "@/lib/accountingCalc";
import type { PnlCustomSection } from "@/hooks/useAccountingData";
import { PARENT_SECTION_LABELS } from "@/types/accounting";

const SECTION_OPTIONS = [
  { value: "revenue", label: "הכנסות" },
  { value: "cost_of_goods", label: "עלות המכר" },
  { value: "operating", label: "הוצאות תפעול" },
  { value: "admin", label: "הוצאות הנהלה" },
  { value: "finance", label: "הוצאות מימון" },
  { value: "other", label: "אחר" },
];

function getSectionLabel(ps: string) {
  if (ps === "revenue") return "הכנסות";
  return PARENT_SECTION_LABELS[ps as keyof typeof PARENT_SECTION_LABELS] ?? ps;
}

interface PnlStructureTabProps {
  customGroups: VirtualGroup[];
  groupLabels: Record<string, string>;
  pnlCustomSections: PnlCustomSection[];
  onRefetchStructure: () => Promise<void>;
}

export function PnlStructureTab({
  customGroups,
  groupLabels,
  pnlCustomSections,
  onRefetchStructure,
}: PnlStructureTabProps) {
  const [saving, setSaving] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionParent, setNewSectionParent] = useState("cost_of_goods");
  const [addingSection, setAddingSection] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionNameDraft, setSectionNameDraft] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");

  // Build list of all active group codes (expense + revenue from PnL)
  const activeGroups = useMemo(() => customGroups, [customGroups]);

  // Map: groupCode → which custom section it belongs to (first match)
  const groupToSection = useMemo(() => {
    const m = new Map<string, string>();
    for (const sec of pnlCustomSections) {
      for (const gc of sec.group_codes) {
        if (!m.has(gc)) m.set(gc, sec.id);
      }
    }
    return m;
  }, [pnlCustomSections]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return activeGroups;
    return activeGroups.filter(
      (g) => g.id.toLowerCase().includes(q) || g.name.toLowerCase().includes(q),
    );
  }, [activeGroups, groupSearch]);

  const saveLabel = useCallback(async (groupCode: string, label: string) => {
    setSaving(true);
    try {
      await fetch("/api/accounting/pnl-structure?action=labels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: [{ group_code: groupCode, custom_label: label }] }),
      });
      await onRefetchStructure();
    } finally {
      setSaving(false);
      setEditingLabel(null);
    }
  }, [onRefetchStructure]);

  const assignGroupToSection = useCallback(async (groupCode: string, sectionId: string | "") => {
    // Remove from all sections first, then add to new one
    const updates: Promise<unknown>[] = [];
    for (const sec of pnlCustomSections) {
      const hasGroup = sec.group_codes.includes(groupCode);
      const isTarget = sec.id === sectionId;
      if (hasGroup && !isTarget) {
        const newCodes = sec.group_codes.filter((c) => c !== groupCode);
        updates.push(
          fetch(`/api/accounting/pnl-structure?action=section&id=${sec.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ group_codes: newCodes }),
          }),
        );
      } else if (!hasGroup && isTarget) {
        const newCodes = [...sec.group_codes, groupCode];
        updates.push(
          fetch(`/api/accounting/pnl-structure?action=section&id=${sec.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ group_codes: newCodes }),
          }),
        );
      }
    }
    await Promise.all(updates);
    await onRefetchStructure();
  }, [pnlCustomSections, onRefetchStructure]);

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    setAddingSection(true);
    try {
      await fetch("/api/accounting/pnl-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSectionName.trim(),
          parent_section: newSectionParent,
          sort_order: pnlCustomSections.filter((s) => s.parent_section === newSectionParent).length,
        }),
      });
      setNewSectionName("");
      await onRefetchStructure();
    } finally {
      setAddingSection(false);
    }
  };

  const handleDeleteSection = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/accounting/pnl-structure?id=${id}`, { method: "DELETE" });
      await onRefetchStructure();
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveSectionName = async (id: string) => {
    if (!sectionNameDraft.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/accounting/pnl-structure?action=section&id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sectionNameDraft.trim() }),
      });
      await onRefetchStructure();
    } finally {
      setSaving(false);
      setEditingSectionId(null);
    }
  };

  // Group pnlCustomSections by parent_section
  const sectionsByParent = useMemo(() => {
    const m = new Map<string, PnlCustomSection[]>();
    for (const s of pnlCustomSections) {
      const list = m.get(s.parent_section) ?? [];
      list.push(s);
      m.set(s.parent_section, list);
    }
    return m;
  }, [pnlCustomSections]);

  return (
    <div className="space-y-6">
      {/* ── Header info ── */}
      <div className="bg-gradient-to-l from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-4 text-sm">
        <p className="text-violet-900 font-medium">מבנה דוח רווח והפסד</p>
        <p className="text-violet-700 mt-1 text-xs">
          ניהל תתי-סעיפים מותאמים (כולל הכנסות) ושנה שמות לקבוצות.
          השינויים ישתקפו מיד בדוח ר&ה.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Left: Group list + label editing ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">קבוצות פעילות</h3>
            <button
              onClick={async () => { setRefreshing(true); await onRefetchStructure(); setRefreshing(false); }}
              disabled={refreshing}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 border rounded-lg hover:bg-gray-50"
            >
              {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              רענן
            </button>
          </div>

          <input
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
            placeholder="חיפוש קבוצה..."
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-300"
          />

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {filteredGroups.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                {activeGroups.length === 0
                  ? "אין קבוצות. העלה נתוני כרטסת."
                  : "לא נמצאו קבוצות."}
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[500px]">
                <table className="text-[11px] border-collapse w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                      <th className="text-right py-2 px-3 font-semibold min-w-[80px]">קוד</th>
                      <th className="text-right py-2 px-3 font-semibold">שם / תווית</th>
                      <th className="text-right py-2 px-3 font-semibold min-w-[140px]">תת-סעיף</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map((g) => {
                      const isEditing = editingLabel === g.id;
                      const currentLabel = groupLabels[g.id] ?? "";
                      const assignedSectionId = groupToSection.get(g.id) ?? "";
                      return (
                        <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="py-1.5 px-3">
                            <code className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono text-[10px]">
                              {g.id}
                            </code>
                          </td>
                          <td className="py-1.5 px-3">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  value={labelDraft}
                                  onChange={(e) => setLabelDraft(e.target.value)}
                                  className="flex-1 px-1.5 py-0.5 text-xs border rounded"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") void saveLabel(g.id, labelDraft);
                                    if (e.key === "Escape") setEditingLabel(null);
                                  }}
                                />
                                <button
                                  onClick={() => void saveLabel(g.id, labelDraft)}
                                  disabled={saving}
                                  className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingLabel(null)}
                                  className="p-0.5 text-gray-400 hover:bg-gray-100 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 group/label">
                                <span className={clsx("truncate", currentLabel ? "text-gray-800 font-medium" : "text-gray-400")}>
                                  {currentLabel || g.name}
                                </span>
                                <button
                                  onClick={() => { setEditingLabel(g.id); setLabelDraft(currentLabel || g.name); }}
                                  className="opacity-0 group-hover/label:opacity-100 p-0.5 text-gray-400 hover:text-violet-600 rounded transition-opacity"
                                  title="ערוך שם"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-3">
                            <div className="relative">
                              <select
                                value={assignedSectionId}
                                onChange={(e) => void assignGroupToSection(g.id, e.target.value)}
                                className="w-full text-[10px] border border-gray-200 rounded-lg px-2 py-1 bg-white appearance-none pr-6 focus:ring-1 focus:ring-violet-300"
                              >
                                <option value="">— ללא שיוך —</option>
                                {pnlCustomSections.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {getSectionLabel(s.parent_section)} › {s.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-3 py-2 bg-gray-50 border-t text-[10px] text-gray-400">
              {filteredGroups.length === activeGroups.length
                ? `${activeGroups.length} קבוצות`
                : `${filteredGroups.length} מתוך ${activeGroups.length}`}
            </div>
          </div>
        </div>

        {/* ── Right: Custom sections management ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800">תתי-סעיפים מותאמים</h3>

          {/* Add new section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-3 space-y-2 shadow-sm">
            <p className="text-xs font-medium text-gray-700">הוסף תת-סעיף חדש</p>
            <div className="flex gap-2">
              <select
                value={newSectionParent}
                onChange={(e) => setNewSectionParent(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-300"
              >
                {SECTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="שם תת-סעיף..."
                className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-300"
                onKeyDown={(e) => { if (e.key === "Enter") void handleAddSection(); }}
              />
              <button
                onClick={() => void handleAddSection()}
                disabled={addingSection || !newSectionName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50"
              >
                {addingSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                הוסף
              </button>
            </div>
          </div>

          {/* Sections list grouped by parent_section */}
          {SECTION_OPTIONS.map(({ value: parentVal, label: parentLabel }) => {
            const sections = sectionsByParent.get(parentVal) ?? [];
            if (sections.length === 0) return null;
            return (
              <div key={parentVal} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-3 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-600">
                  {parentLabel}
                </div>
                {sections.map((sec) => {
                  const isEditingName = editingSectionId === sec.id;
                  return (
                    <div
                      key={sec.id}
                      className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                    >
                      {isEditingName ? (
                        <div className="flex-1 flex items-center gap-1">
                          <input
                            value={sectionNameDraft}
                            onChange={(e) => setSectionNameDraft(e.target.value)}
                            className="flex-1 px-2 py-0.5 text-xs border rounded"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleSaveSectionName(sec.id);
                              if (e.key === "Escape") setEditingSectionId(null);
                            }}
                          />
                          <button
                            onClick={() => void handleSaveSectionName(sec.id)}
                            disabled={saving}
                            className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingSectionId(null)}
                            className="p-0.5 text-gray-400 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 text-xs">
                            <span className="font-medium text-gray-800">{sec.name}</span>
                            <span className="text-gray-400 mr-1.5">
                              ({sec.group_codes.length} קבוצות)
                            </span>
                          </div>
                          <button
                            onClick={() => { setEditingSectionId(sec.id); setSectionNameDraft(sec.name); }}
                            className="p-1 text-gray-400 hover:text-violet-600 rounded"
                            title="ערוך שם"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => void handleDeleteSection(sec.id)}
                            disabled={deletingId === sec.id}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="מחק"
                          >
                            {deletingId === sec.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Trash2 className="w-3 h-3" />}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {pnlCustomSections.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-6">
              עדיין לא הוגדרו תתי-סעיפים.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
