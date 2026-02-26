"use client";

import { useState, useMemo, useRef } from "react";
import { Search, ChevronDown, Plus, Check, X, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import type {
  DbAccount, DbCustomGroup, DbAccountClassificationOverride,
  DbCustomTag, DbAccountTag, ParentSection,
} from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER } from "@/types/accounting";

interface Props {
  accounts: DbAccount[];
  customGroups: DbCustomGroup[];
  classificationOverrides: DbAccountClassificationOverride[];
  tags: DbCustomTag[];
  accountTags: DbAccountTag[];
  onSaveClassification: (accountId: string, groupId: string, note?: string) => Promise<boolean>;
  onDeleteClassification: (accountId: string) => Promise<boolean>;
  onAssignTag: (accountId: string, tagId: string) => Promise<boolean>;
  onRemoveTag: (accountId: string, tagId: string) => Promise<boolean>;
}

type FilterSection = "all" | ParentSection | "unclassified";
type SortField = "code" | "name" | "group" | "section";

function getEffectiveGroup(
  acct: DbAccount,
  customGroups: DbCustomGroup[],
  overrides: DbAccountClassificationOverride[],
): DbCustomGroup | null {
  const override = overrides.find(o => o.account_id === acct.id);
  if (override) {
    return customGroups.find(g => g.id === override.custom_group_id) ?? null;
  }
  // Check account_codes first
  for (const g of customGroups) {
    if ((g.account_codes ?? []).includes(acct.code)) return g;
  }
  // Fallback: group_codes
  for (const g of customGroups) {
    if (g.group_codes.includes(acct.latest_group_code ?? "")) return g;
  }
  return null;
}

// ── Inline edit cell ──────────────────────────────────────────

function GroupSelectCell({
  customGroups, currentGroup, override,
  onSave, onDelete, saving,
}: {
  account?: DbAccount;
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

  const hasOverride = !!override;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={clsx(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all min-w-[140px] max-w-[200px] w-full",
          currentGroup
            ? hasOverride
              ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              : "border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50/30"
            : "border-dashed border-red-200 bg-red-50/50 text-red-500 hover:border-red-300",
          saving && "opacity-50 cursor-wait",
        )}
      >
        {currentGroup ? (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: currentGroup.color }} />
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0 bg-red-300" />
        )}
        <span className="truncate flex-1 text-right">
          {currentGroup?.name ?? "ללא הגדרה"}
        </span>
        {hasOverride && <span title="סיווג ידני" className="text-amber-500 text-[9px] font-bold">✎</span>}
        <ChevronDown className="w-3 h-3 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          style={{ minWidth: "220px", right: 0 }}
          onBlur={() => setOpen(false)}
        >
          <div className="overflow-y-auto max-h-72">
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
                      onClick={async () => {
                        setOpen(false);
                        await onSave(g.id);
                      }}
                      className={clsx("flex items-center gap-2 w-full px-3 py-2 text-[11px] text-right hover:bg-gray-50 transition-colors",
                        currentGroup?.id === g.id && "bg-primary-50 text-primary-700 font-semibold",
                      )}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                      <span className="flex-1">{g.name}</span>
                      {currentGroup?.id === g.id && <Check className="w-3 h-3 text-primary-500" />}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          {hasOverride && (
            <div className="border-t border-gray-100 p-2">
              <button
                onClick={async () => { setOpen(false); await onDelete(); }}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>אפס לסיווג ברירת מחדל</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tag chips ────────────────────────────────────────────────

function TagCell({
  account, tags, accountTags,
  onAssign, onRemove,
}: {
  account: DbAccount;
  tags: DbCustomTag[];
  accountTags: DbAccountTag[];
  onAssign: (tagId: string) => Promise<boolean | void>;
  onRemove: (tagId: string) => Promise<boolean | void>;
}) {
  const [open, setOpen] = useState(false);
  const myTags = tags.filter(t => accountTags.some(at => at.account_id === account.id && at.tag_id === t.id));

  return (
    <div className="flex items-center gap-1 flex-wrap relative">
      {myTags.map(t => (
        <span key={t.id}
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
          style={{ background: t.color }}
        >
          {t.name}
          <button onClick={() => onRemove(t.id)} className="hover:opacity-70"><X className="w-2.5 h-2.5" /></button>
        </span>
      ))}
      <button onClick={() => setOpen(o => !o)}
        className="w-5 h-5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-primary-400 hover:text-primary-500 flex items-center justify-center transition-colors">
        <Plus className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl min-w-[140px] overflow-hidden" style={{ right: 0 }}>
          {tags.length === 0 ? (
            <p className="p-3 text-xs text-gray-400">אין תגיות מוגדרות</p>
          ) : tags.map(t => {
            const assigned = myTags.some(mt => mt.id === t.id);
            return (
              <button key={t.id}
                onClick={async () => {
                  setOpen(false);
                  if (assigned) await onRemove(t.id);
                  else await onAssign(t.id);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[11px] hover:bg-gray-50 transition-colors"
              >
                <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                <span className="flex-1 text-right">{t.name}</span>
                {assigned && <Check className="w-3 h-3 text-primary-500" />}
              </button>
            );
          })}
          <button onClick={() => setOpen(false)} className="w-full px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100 hover:bg-gray-50">
            סגור
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function AccountMappingTab({
  accounts, customGroups, classificationOverrides, tags, accountTags,
  onSaveClassification, onDeleteClassification, onAssignTag, onRemoveTag,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState<FilterSection>("all");
  const [sortField, setSortField] = useState<SortField>("code");
  const [savingId, setSavingId] = useState<string | null>(null);

  const overrideMap = useMemo(() =>
    new Map(classificationOverrides.map(o => [o.account_id, o])),
    [classificationOverrides],
  );

  const groupedAccounts = useMemo(() => {
    let filtered = accounts;

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
      );
    }

    // Effective group per account
    const withGroup = filtered.map(a => ({
      account: a,
      group: getEffectiveGroup(a, customGroups, classificationOverrides),
      override: overrideMap.get(a.id),
    }));

    // Section filter
    const sectionFiltered = withGroup.filter(({ group }) => {
      if (filterSection === "all") return true;
      if (filterSection === "unclassified") return !group;
      return group?.parent_section === filterSection;
    });

    // Sort
    sectionFiltered.sort((a, b) => {
      switch (sortField) {
        case "code": return a.account.code.localeCompare(b.account.code, undefined, { numeric: true });
        case "name": return a.account.name.localeCompare(b.account.name, "he");
        case "group": return (a.group?.name ?? "").localeCompare(b.group?.name ?? "", "he");
        case "section": return (a.group?.parent_section ?? "zzz").localeCompare(b.group?.parent_section ?? "zzz");
      }
    });

    return sectionFiltered;
  }, [accounts, customGroups, classificationOverrides, overrideMap, search, filterSection, sortField]);

  const stats = useMemo(() => {
    const classified = accounts.filter(a => getEffectiveGroup(a, customGroups, classificationOverrides));
    const overridden = classificationOverrides.length;
    return { total: accounts.length, classified: classified.length, unclassified: accounts.length - classified.length, overridden };
  }, [accounts, customGroups, classificationOverrides]);

  const handleSaveOverride = async (accountId: string, groupId: string) => {
    setSavingId(accountId);
    await onSaveClassification(accountId, groupId);
    setSavingId(null);
  };

  const handleDeleteOverride = async (accountId: string) => {
    setSavingId(accountId);
    await onDeleteClassification(accountId);
    setSavingId(null);
  };

  const filterOptions: Array<{ id: FilterSection; label: string; count: number }> = [
    { id: "all", label: "הכל", count: accounts.length },
    { id: "unclassified", label: "ללא הגדרה", count: stats.unclassified },
    ...PARENT_SECTION_ORDER.map(sec => ({
      id: sec as FilterSection,
      label: PARENT_SECTION_LABELS[sec],
      count: accounts.filter(a => {
        const g = getEffectiveGroup(a, customGroups, classificationOverrides);
        return g?.parent_section === sec;
      }).length,
    })),
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "סה\"כ חשבונות", value: stats.total, color: "text-gray-800", bg: "bg-gray-50" },
          { label: "מסווגים", value: stats.classified, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "ללא הגדרה", value: stats.unclassified, color: stats.unclassified > 0 ? "text-red-600" : "text-gray-500", bg: stats.unclassified > 0 ? "bg-red-50" : "bg-gray-50" },
          { label: "עם override ידני", value: stats.overridden, color: "text-amber-700", bg: "bg-amber-50" },
        ].map(stat => (
          <div key={stat.label} className={clsx("rounded-xl p-3 border border-gray-200", stat.bg)}>
            <p className={clsx("text-2xl font-bold tabular-nums", stat.color)}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {stats.unclassified > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <span className="text-base">⚠️</span>
          <span>
            נמצאו <strong>{stats.unclassified} חשבונות</strong> ללא סיווג —
            הם לא ייחשבו בדוח רווח והפסד. סווג אותם בעמודת &quot;סיווג פנימי&quot; בטבלה למטה.
          </span>
          <button
            onClick={() => setFilterSection("unclassified")}
            className="mr-auto px-2.5 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg font-semibold transition-colors">
            הצג
          </button>
        </div>
      )}

      {/* Filters & search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חפש לפי שם או מפתח..."
            className="w-full pr-9 pl-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-300 bg-white"
          />
        </div>

        {/* Section quick-filters */}
        <div className="flex gap-1 flex-wrap">
          {filterOptions.map(opt => (
            <button key={opt.id}
              onClick={() => setFilterSection(opt.id)}
              className={clsx("px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border",
                filterSection === opt.id
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600",
                opt.id === "unclassified" && opt.count > 0 && filterSection !== opt.id && "border-red-200 text-red-500 bg-red-50",
              )}>
              {opt.label}
              <span className={clsx("mr-1 inline-flex items-center justify-center rounded-full text-[10px] px-1",
                filterSection === opt.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500",
              )}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse" style={{ minWidth: "700px" }}>
            <thead>
              <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                {[
                  { id: "code" as SortField, label: "מפתח", width: "80px" },
                  { id: "name" as SortField, label: "שם חשבון", width: "200px" },
                  { id: null, label: "קוד קבוצה", width: "90px" },
                  { id: "section" as SortField, label: "קטגוריה", width: "100px" },
                  { id: "group" as SortField, label: "סיווג פנימי", width: "200px" },
                  { id: null, label: "תגיות", width: "160px" },
                ].map((col, i) => (
                  <th key={i}
                    className={clsx("text-right py-3 px-4 font-semibold text-sm",
                      col.id && "cursor-pointer hover:bg-slate-600",
                      col.id === sortField && "text-primary-300",
                    )}
                    style={{ minWidth: col.width }}
                    onClick={() => col.id && setSortField(col.id)}>
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.id === sortField && <span className="text-primary-300 text-[10px]">▾</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-sm">לא נמצאו חשבונות</p>
                  </td>
                </tr>
              ) : groupedAccounts.map(({ account, group, override }) => {
                const isSaving = savingId === account.id;

                return (
                  <tr key={account.id}
                    className={clsx("border-b border-gray-50 hover:bg-gray-50/60 transition-colors",
                      isSaving && "opacity-60",
                      !group && "bg-red-50/30",
                      !!override && "bg-amber-50/20",
                    )}>
                    {/* Code */}
                    <td className="py-2.5 px-4">
                      <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {account.code}
                      </code>
                    </td>
                    {/* Name */}
                    <td className="py-2.5 px-4 font-medium text-gray-800 text-[12px]">
                      {account.name}
                    </td>
                    {/* Group code */}
                    <td className="py-2.5 px-4 text-gray-400 font-mono text-[11px]">
                      {account.latest_group_code ?? "—"}
                    </td>
                    {/* Section */}
                    <td className="py-2.5 px-4">
                      {group ? (
                        <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-semibold",
                          group.parent_section === "cost_of_goods" && "bg-red-100 text-red-700",
                          group.parent_section === "operating"     && "bg-orange-100 text-orange-700",
                          group.parent_section === "admin"         && "bg-purple-100 text-purple-700",
                          group.parent_section === "finance"       && "bg-blue-100 text-blue-700",
                          group.parent_section === "other"         && "bg-gray-100 text-gray-600",
                        )}>
                          {PARENT_SECTION_LABELS[group.parent_section]}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-100 text-red-500">
                          ללא הגדרה
                        </span>
                      )}
                    </td>
                    {/* Classification dropdown */}
                    <td className="py-2 px-4">
                      <GroupSelectCell
                        account={account}
                        customGroups={customGroups}
                        currentGroup={group}
                        override={override}
                        saving={isSaving}
                        onSave={gId => handleSaveOverride(account.id, gId)}
                        onDelete={() => handleDeleteOverride(account.id)}
                      />
                    </td>
                    {/* Tags */}
                    <td className="py-2 px-4">
                      <TagCell
                        account={account}
                        tags={tags}
                        accountTags={accountTags}
                        onAssign={tId => onAssignTag(account.id, tId)}
                        onRemove={tId => onRemoveTag(account.id, tId)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            מציג {groupedAccounts.length} מתוך {accounts.length} חשבונות
          </p>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-300" /> override ידני
            <span className="inline-block w-3 h-3 rounded-full bg-red-200 mr-2" /> ללא הגדרה
          </div>
        </div>
      </div>
    </div>
  );
}
