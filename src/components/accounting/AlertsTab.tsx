"use client";

import { useState } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Plus, Trash2, Bell } from "lucide-react";
import { clsx } from "clsx";
import type {
  AccountAnomaly, DbAlertRule, DbAccount, AlertRuleType,
} from "@/types/accounting";

interface Props {
  anomalies: AccountAnomaly[];
  alertRules: DbAlertRule[];
  accounts: DbAccount[];
  year: number;
  onSaveRule: (rule: Partial<DbAlertRule>) => Promise<boolean>;
  onDeleteRule: (id: string) => Promise<boolean>;
  onAccountClick: (accountId: string) => void;
}

function fmtC(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `₪${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `₪${(val / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `₪${(val / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(val);
}

const RULE_TYPE_LABELS: Record<AlertRuleType, string> = {
  monthly_change_pct: "שינוי חודשי (%)",
  yearly_change_pct: "שינוי שנתי (%)",
  absolute_threshold: "סף מוחלט (₪)",
  consecutive_increase: "עלייה רצופה (חודשים)",
};

export default function AlertsTab({
  anomalies, alertRules, accounts, year,
  onSaveRule, onDeleteRule, onAccountClick,
}: Props) {
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleType, setRuleType] = useState<AlertRuleType>("monthly_change_pct");
  const [ruleThreshold, setRuleThreshold] = useState("30");
  const [ruleAccountId, setRuleAccountId] = useState("");
  const [saving, setSaving] = useState(false);

  const critical = anomalies.filter(a => a.severity === "critical");
  const warning = anomalies.filter(a => a.severity === "warning" && !critical.some(c => c.accountId === a.accountId && c.type === a.type));
  const accountById = new Map(accounts.map(a => [a.id, a]));

  const handleSaveRule = async () => {
    setSaving(true);
    await onSaveRule({
      rule_type: ruleType,
      threshold_value: parseFloat(ruleThreshold),
      account_id: ruleAccountId || undefined,
      is_active: true,
    });
    setSaving(false);
    setShowRuleForm(false);
    setRuleThreshold("30");
    setRuleAccountId("");
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{critical.length}</p>
          <p className="text-xs text-red-600 mt-1">חריגות קריטיות</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{warning.length}</p>
          <p className="text-xs text-amber-600 mt-1">אזהרות</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            {accounts.length - new Set([...critical, ...warning].map(a => a.accountId)).size}
          </p>
          <p className="text-xs text-green-600 mt-1">חשבונות תקינים</p>
        </div>
      </div>

      {/* Anomalies */}
      {anomalies.length === 0 ? (
        <div className="text-center py-12 bg-green-50 border border-green-200 rounded-2xl">
          <Bell className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-green-700 font-medium">אין חריגות ב-{year}</p>
          <p className="text-xs text-green-500 mt-1">כל החשבונות בטווח תקין</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Critical */}
          {critical.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> חריגות קריטיות ({critical.length})
              </h3>
              <div className="space-y-2">
                {critical.map((a, i) => (
                  <AnomalyCard key={i} anomaly={a} accountById={accountById} onClick={() => onAccountClick(a.accountId)} />
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          {warning.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> שים לב ({warning.length})
              </h3>
              <div className="space-y-2">
                {warning.map((a, i) => (
                  <AnomalyCard key={i} anomaly={a} accountById={accountById} onClick={() => onAccountClick(a.accountId)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alert rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">כללי התראה ({alertRules.length})</h3>
          <button onClick={() => setShowRuleForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-xl text-xs font-medium hover:bg-primary-700">
            <Plus className="w-3.5 h-3.5" /> כלל חדש
          </button>
        </div>

        {showRuleForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-blue-900">כלל התראה חדש</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">סוג כלל</label>
                <select value={ruleType} onChange={(e) => setRuleType(e.target.value as AlertRuleType)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
                  {(Object.keys(RULE_TYPE_LABELS) as AlertRuleType[]).map((k) => (
                    <option key={k} value={k}>{RULE_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">ערך סף</label>
                <input type="number" value={ruleThreshold} onChange={(e) => setRuleThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">חשבון ספציפי (אופציונלי)</label>
                <select value={ruleAccountId} onChange={(e) => setRuleAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
                  <option value="">כל החשבונות</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveRule} disabled={saving}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "שומר..." : "שמור"}
              </button>
              <button onClick={() => setShowRuleForm(false)}
                className="px-4 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600">
                ביטול
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {alertRules.map((rule) => {
            const account = rule.account_id ? accountById.get(rule.account_id) : null;
            return (
              <div key={rule.id}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-xs">
                <div>
                  <p className="font-medium text-gray-800">
                    {RULE_TYPE_LABELS[rule.rule_type]}: {rule.threshold_value}
                    {rule.rule_type.includes("pct") ? "%" : rule.rule_type === "absolute_threshold" ? "₪" : " חודשים"}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {account ? `${account.name} (${account.code})` : "כל החשבונות"}
                    {rule.is_active ? "" : " · לא פעיל"}
                  </p>
                </div>
                <button onClick={() => void onDeleteRule(rule.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          {alertRules.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              ברירת מחדל: שינוי חודשי מעל 1.5σ = אזהרה · מעל 2.0σ = קריטי · YoY מעל 40% = קריטי
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AnomalyCard({
  anomaly, accountById, onClick,
}: {
  anomaly: AccountAnomaly;
  accountById: Map<string, DbAccount>;
  onClick: () => void;
}) {
  const account = accountById.get(anomaly.accountId);
  const isCritical = anomaly.severity === "critical";

  const MONTH_LONG_SHORT = ["ינו","פבר","מרץ","אפר","מאי","יוני","יולי","אוג","ספט","אוק","נוב","דצמ"];

  const typeLabel = anomaly.type === "monthly_spike"
    ? `ספייק בחודש ${anomaly.month ? MONTH_LONG_SHORT[anomaly.month - 1] : ""}`
    : anomaly.type === "yoy_increase"
    ? "שינוי שנתי"
    : `עלייה רצופה ${anomaly.months?.length ?? 0} חודשים`;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center justify-between border rounded-xl px-4 py-3 text-xs text-right hover:opacity-90 transition-opacity",
        isCritical ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200",
      )}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className={clsx("w-4 h-4 shrink-0", isCritical ? "text-red-500" : "text-amber-500")} />
        <div>
          <p className="font-semibold text-gray-900">{account?.name ?? anomaly.accountCode}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{typeLabel}</p>
        </div>
      </div>
      <div className="text-left">
        <p className="font-bold text-gray-900">{fmtC(anomaly.currentValue)}</p>
        <div className={clsx("flex items-center gap-0.5 text-[10px] font-bold",
          anomaly.changePct > 0 ? isCritical ? "text-red-600" : "text-amber-600" : "text-green-600",
        )}>
          {anomaly.changePct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {anomaly.changePct > 0 ? "+" : ""}{anomaly.changePct.toFixed(1)}%
        </div>
        <p className="text-[9px] text-gray-400">
          מול {anomaly.type === "monthly_spike" ? "ממוצע" : "שנה קודמת"}: {fmtC(anomaly.referenceValue)}
        </p>
      </div>
    </button>
  );
}
