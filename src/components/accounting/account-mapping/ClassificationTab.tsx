"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, Check } from "lucide-react";
import { clsx } from "clsx";
import type {
  DbAccount, DbCustomGroup, DbAccountClassificationOverride,
  DbCustomTag, DbAccountTag,
} from "@/types/accounting";
import { getEffectiveGroup } from "./shared";
import { GroupSelectCell } from "./GroupSelectCell";

interface ClassificationTabProps {
  accounts: DbAccount[];
  customGroups: DbCustomGroup[];
  classificationOverrides: DbAccountClassificationOverride[];
  tags?: DbCustomTag[];
  accountTags?: DbAccountTag[];
  onBatchSave: (changes: Array<{ accountId: string; groupId: string | null }>) => Promise<boolean>;
  onSaveClassification?: (accountId: string, groupId: string, note?: string) => Promise<boolean>;
  onDeleteClassification?: (accountId: string) => Promise<boolean>;
  onAssignTag?: (accountId: string, tagId: string) => Promise<boolean>;
  onRemoveTag?: (accountId: string, tagId: string) => Promise<boolean>;
}

export function ClassificationTab({
  accounts, customGroups, classificationOverrides, onBatchSave,
}: ClassificationTabProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "overridden" | "unclassified">("all");
  const [sortField, setSortField] = useState<"code" | "name">("code");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Map<string, string | null>>(new Map());

  const overrideMap = useMemo(() =>
    new Map(classificationOverrides.map(o => [o.account_id, o])),
    [classificationOverrides],
  );

  const groupMap = useMemo(() => new Map(customGroups.map(g => [g.id, g])), [customGroups]);

  const getDisplayGroup = useCallback((acct: DbAccount) => {
    if (pending.has(acct.id)) {
      const pendingGroupId = pending.get(acct.id);
      return pendingGroupId ? (groupMap.get(pendingGroupId) ?? null) : null;
    }
    return getEffectiveGroup(acct, customGroups, classificationOverrides);
  }, [pending, groupMap, customGroups, classificationOverrides]);

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

  const handleBatchSave = async () => {
    if (pending.size === 0) return;
    setSaving(true);
    const changes = Array.from(pending.entries()).map(([accountId, groupId]) => ({ accountId, groupId }));
    const ok = await onBatchSave(changes);
    if (ok) setPending(new Map());
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {pending.size > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {pending.size} שינוי{pending.size > 1 ? "ים" : ""} ממתינ{pending.size > 1 ? "ים" : ""} — טרם נשמרו
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPending(new Map())}
              disabled={saving}
              className="px-3 py-1.5 text-xs text-amber-700 border border-amber-300 rounded-xl hover:bg-amber-100 transition-colors"
            >
              בטל שינויים
            </button>
            <button
              onClick={() => void handleBatchSave()}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-60"
            >
              {saving ? (
                <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> שומר...</>
              ) : (
                <><Check className="w-3.5 h-3.5" /> שמור {pending.size} שינויים</>
              )}
            </button>
          </div>
        </div>
      )}

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
              ) : filtered.map(({ account, override }) => {
                const isPending = pending.has(account.id);
                const displayGroup = getDisplayGroup(account);
                const hasOverrideOrPending = !!override || isPending;
                return (
                  <tr key={account.id}
                    className={clsx("border-b border-gray-50 hover:bg-gray-50/60 transition-colors",
                      !displayGroup && "bg-red-50/30",
                      isPending && "bg-amber-50/40",
                      !!override && !isPending && "bg-amber-50/20",
                    )}>
                    <td className="py-2.5 px-4">
                      <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {account.code}
                      </code>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-gray-800 text-[12px]">
                      {account.name}
                      {!displayGroup && !isPending && <span className="mr-2 text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-bold">ללא שיוך</span>}
                      {isPending && <span className="mr-2 text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-bold">✎ ממתין</span>}
                    </td>
                    <td className="py-2 px-4">
                      <GroupSelectCell
                        customGroups={customGroups}
                        currentGroup={displayGroup}
                        override={hasOverrideOrPending ? (override ?? { account_id: account.id, custom_group_id: "" } as DbAccountClassificationOverride) : undefined}
                        saving={false}
                        onSave={async gId => {
                          setPending(prev => { const m = new Map(prev); m.set(account.id, gId); return m; });
                        }}
                        onDelete={async () => {
                          setPending(prev => {
                            const m = new Map(prev);
                            if (override) { m.set(account.id, null); } else { m.delete(account.id); }
                            return m;
                          });
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
