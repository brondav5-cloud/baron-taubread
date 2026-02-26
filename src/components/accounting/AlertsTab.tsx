"use client";

import { useState } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Plus, Trash2, Bell, CheckCircle, Settings } from "lucide-react";
import { clsx } from "clsx";
import type { AccountAnomaly, DbAlertRule, DbAccount, AlertRuleType } from "@/types/accounting";

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
  margin_below: "רווח גולמי מתחת ל-(%)",
  new_account: "חשבון חדש שלא היה קודם",
};

const PRESET_RULES: Array<Partial<DbAlertRule> & { label: string; description: string }> = [
  {
    label: "ספק שעלה מעל 30% שנתי",
    rule_type: "yearly_change_pct",
    threshold_value: 30,
    severity: "warning",
    name: "ספק שעלה >30% שנתי",
    description: "חשבון שעלה ביותר מ-30% לעומת שנה קודמת",
  },
  {
    label: "הוצאה עלתה מעל 40% שנתי (קריטי)",
    rule_type: "yearly_change_pct",
    threshold_value: 40,
    severity: "critical",
    name: "חריגה קריטית שנתית >40%",
    description: "חשבון שעלה ביותר מ-40% לעומת שנה קודמת",
  },
  {
    label: "3 חודשים עלייה רצופה",
    rule_type: "consecutive_increase",
    threshold_value: 3,
    severity: "warning",
    name: "עלייה רצופה 3 חודשים",
    description: "הוצאה שעולה 3 חודשים ברצף",
  },
  {
    label: "רווח גולמי מתחת ל-30%",
    rule_type: "margin_below",
    threshold_value: 30,
    severity: "warning",
    name: "רווח גולמי <30%",
    description: "רווח גולמי ירד מתחת ל-30% מהכנסות",
  },
  {
    label: "חשבון חדש שלא היה קיים",
    rule_type: "new_account",
    threshold_value: null,
    severity: "warning",
    name: "חשבון חדש",
    description: "חשבון שלא היה קיים בשנה קודמת",
  },
];

const MONTH_SHORT = ["ינו","פבר","מרץ","אפר","מאי","יוני","יולי","אוג","ספט","אוק","נוב","דצמ"];

// ── Anomaly Card ─────────────────────────────────────────────

function AnomalyCard({
  anomaly, accountById, onClick,
}: {
  anomaly: AccountAnomaly;
  accountById: Map<string, DbAccount>;
  onClick: () => void;
}) {
  const account = accountById.get(anomaly.accountId);
  const isCritical = anomaly.severity === "critical";

  const typeLabel = {
    monthly_spike: `ספייק בחודש ${anomaly.month ? MONTH_SHORT[anomaly.month - 1] : ""}`,
    yoy_increase: "שינוי שנתי",
    consecutive_increase: `עלייה רצופה ${anomaly.months?.length ?? 0} חודשים`,
    margin_below: "רווח גולמי",
    new_account: "חשבון חדש",
  }[anomaly.type] ?? anomaly.type;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-start justify-between border rounded-xl px-4 py-3 text-xs text-right hover:opacity-90 transition-all hover:shadow-sm",
        isCritical ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-100",
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={clsx("w-4 h-4 shrink-0 mt-0.5", isCritical ? "text-red-500" : "text-amber-500")} />
        <div className="text-right">
          <p className="font-semibold text-gray-900">{account?.name ?? anomaly.accountName}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{typeLabel}</p>
          {anomaly.description && (
            <p className="text-[10px] text-gray-400 mt-0.5">{anomaly.description}</p>
          )}
        </div>
      </div>
      <div className="text-left shrink-0 mr-2">
        <p className="font-bold text-gray-900">{fmtC(anomaly.currentValue)}</p>
        {anomaly.changePct !== 0 && (
          <div className={clsx("flex items-center gap-0.5 text-[10px] font-bold justify-end",
            anomaly.changePct > 0 ? isCritical ? "text-red-600" : "text-amber-600" : "text-green-600",
          )}>
            {anomaly.changePct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {anomaly.changePct > 0 ? "+" : ""}{anomaly.changePct.toFixed(1)}%
          </div>
        )}
        {anomaly.referenceValue !== 0 && (
          <p className="text-[9px] text-gray-400">
            מול {anomaly.type === "monthly_spike" ? "ממוצע" : "שנה קודמת"}: {fmtC(anomaly.referenceValue)}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Rule Builder ─────────────────────────────────────────────

function RuleBuilder({
  accounts, onSave, onClose,
}: {
  accounts: DbAccount[];
  onSave: (rule: Partial<DbAlertRule>) => Promise<boolean>;
  onClose: () => void;
}) {
  const [ruleType, setRuleType] = useState<AlertRuleType>("monthly_change_pct");
  const [threshold, setThreshold] = useState("30");
  const [accountId, setAccountId] = useState("");
  const [severity, setSeverity] = useState<"warning" | "critical">("warning");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const needsThreshold = ruleType !== "new_account";

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave({
      rule_type: ruleType,
      threshold_value: needsThreshold ? parseFloat(threshold) : null,
      account_id: accountId || undefined,
      is_active: true,
      severity,
      name: name || undefined,
      applies_to: accountId ? "specific" : "all",
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="bg-white border border-blue-200 rounded-2xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-blue-900">כלל התראה חדש</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-[10px] text-gray-500 mb-1">שם הכלל (אופציונלי)</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="כלל חדש..."
            className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">סוג כלל</label>
          <select value={ruleType} onChange={e => setRuleType(e.target.value as AlertRuleType)}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-300">
            {(Object.keys(RULE_TYPE_LABELS) as AlertRuleType[]).map(k => (
              <option key={k} value={k}>{RULE_TYPE_LABELS[k]}</option>
            ))}
          </select>
        </div>
        {needsThreshold && (
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">ערך סף</label>
            <input type="number" value={threshold} onChange={e => setThreshold(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-300" />
          </div>
        )}
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">חשבון ספציפי (אופציונלי)</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-300">
            <option value="">כל החשבונות</option>
            {accounts.filter(a => a.account_type === "expense").map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">רמת חומרה</label>
          <div className="flex gap-2">
            {(["warning", "critical"] as const).map(s => (
              <button key={s} onClick={() => setSeverity(s)}
                className={clsx("flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition-colors",
                  severity === s
                    ? s === "critical" ? "bg-red-500 text-white border-red-500" : "bg-amber-400 text-white border-amber-400"
                    : "bg-white text-gray-500 border-gray-200",
                )}>
                {s === "warning" ? "🟡 אזהרה" : "🔴 קריטי"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? "שומר..." : "שמור כלל"}
        </button>
        <button onClick={onClose}
          className="px-4 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-colors">
          ביטול
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function AlertsTab({
  anomalies, alertRules, accounts, year,
  onSaveRule, onDeleteRule, onAccountClick,
}: Props) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "rules">("list");

  const critical = anomalies.filter(a => a.severity === "critical");
  const warning = anomalies.filter(a => a.severity === "warning");
  const okCount = accounts.length - new Set([...critical, ...warning].map(a => a.accountId)).size;

  const accountById = new Map(accounts.map(a => [a.id, a]));

  const handleSavePreset = async (preset: Partial<DbAlertRule>) => {
    await onSaveRule({
      ...preset,
      is_active: true,
      is_preset: true,
    });
  };

  const existingPresetTypes = new Set(alertRules.filter(r => r.is_preset).map(r => r.rule_type));

  return (
    <div className="space-y-4" dir="rtl">
      {/* 3 Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab("list")}
          className={clsx("border rounded-2xl p-4 text-center transition-all hover:shadow-sm",
            critical.length > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200",
            activeTab === "list" && "ring-2 ring-red-300",
          )}>
          <p className="text-2xl font-bold text-red-700">{critical.length}</p>
          <p className="text-xs text-red-600 mt-1">קריטיות 🔴</p>
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={clsx("border rounded-2xl p-4 text-center transition-all hover:shadow-sm",
            warning.length > 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200",
            activeTab === "list" && "ring-2 ring-amber-300",
          )}>
          <p className="text-2xl font-bold text-amber-700">{warning.length}</p>
          <p className="text-xs text-amber-600 mt-1">אזהרות 🟡</p>
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={clsx("bg-green-50 border border-green-200 rounded-2xl p-4 text-center transition-all hover:shadow-sm",
            activeTab === "rules" && "ring-2 ring-green-300",
          )}>
          <p className="text-2xl font-bold text-green-700">{okCount}</p>
          <p className="text-xs text-green-600 mt-1">תקינים 🟢</p>
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Alerts list (70%) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              התראות — {year}
              {anomalies.length > 0 && <span className="mr-2 text-xs text-gray-400">({anomalies.length} סה&quot;כ)</span>}
            </h3>
            <div className="flex gap-1">
              <button onClick={() => setActiveTab("list")}
                className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  activeTab === "list" ? "bg-primary-100 text-primary-700" : "text-gray-500 hover:bg-gray-100")}>
                רשימה
              </button>
            </div>
          </div>

          {anomalies.length === 0 ? (
            <div className="text-center py-12 bg-green-50 border border-green-200 rounded-2xl">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-sm text-green-700 font-medium">אין חריגות ב-{year}</p>
              <p className="text-xs text-green-500 mt-1">כל החשבונות בטווח תקין</p>
            </div>
          ) : (
            <div className="space-y-4">
              {critical.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> חריגות קריטיות ({critical.length})
                  </h4>
                  <div className="space-y-2">
                    {critical.map((a, i) => (
                      <AnomalyCard key={i} anomaly={a} accountById={accountById}
                        onClick={() => onAccountClick(a.accountId)} />
                    ))}
                  </div>
                </div>
              )}

              {warning.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> אזהרות ({warning.length})
                  </h4>
                  <div className="space-y-2">
                    {warning.map((a, i) => (
                      <AnomalyCard key={i} anomaly={a} accountById={accountById}
                        onClick={() => onAccountClick(a.accountId)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rules panel (30%) */}
        <div className="space-y-4 bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Settings className="w-4 h-4" />
              הגדרת כללים
            </h3>
            <button
              onClick={() => setShowBuilder(b => !b)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-600 text-white rounded-xl text-xs font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              כלל חדש
            </button>
          </div>

          {showBuilder && (
            <RuleBuilder
              accounts={accounts}
              onSave={onSaveRule}
              onClose={() => setShowBuilder(false)}
            />
          )}

          {/* Active rules */}
          {alertRules.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] text-gray-400 font-medium uppercase">כללים פעילים ({alertRules.length})</p>
              {alertRules.map(rule => {
                const account = rule.account_id ? accountById.get(rule.account_id) : null;
                return (
                  <div key={rule.id}
                    className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {rule.name || RULE_TYPE_LABELS[rule.rule_type]}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {rule.threshold_value != null ? `${rule.threshold_value}${rule.rule_type.includes("pct") || rule.rule_type === "margin_below" ? "%" : rule.rule_type === "absolute_threshold" ? "₪" : " חודשים"}` : ""}
                        {" "}{account ? `· ${account.name}` : "· כל החשבונות"}
                        <span className={clsx("mr-1 px-1 rounded text-[9px] font-bold",
                          rule.severity === "critical" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600",
                        )}>
                          {rule.severity === "critical" ? "קריטי" : "אזהרה"}
                        </span>
                      </p>
                    </div>
                    <button onClick={() => void onDeleteRule(rule.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 text-center py-2">
              ברירת מחדל: שינוי מעל 1.5σ = אזהרה · מעל 2.0σ = קריטי · YoY מעל 40% = קריטי
            </p>
          )}

          {/* Presets */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-gray-400 font-medium uppercase">כללים מוכנים — לחץ להפעלה</p>
            {PRESET_RULES.map((preset, i) => {
              const isActive = existingPresetTypes.has(preset.rule_type!);
              return (
                <button key={i}
                  onClick={!isActive ? () => void handleSavePreset(preset) : undefined}
                  disabled={isActive}
                  className={clsx("w-full text-right px-3 py-2 rounded-xl text-[11px] border transition-all",
                    isActive
                      ? "bg-green-50 border-green-200 text-green-700 cursor-default"
                      : "bg-white border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50 cursor-pointer",
                  )}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{preset.label}</span>
                    {isActive ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <Bell className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
