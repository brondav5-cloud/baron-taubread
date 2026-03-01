import type {
  DbAccount,
  DbTransaction,
  DbTransactionOverride,
  DbAlertRule,
  MonthlyPnl,
  YearlyPnl,
  ParentSection,
  AccountAnomaly,
} from "@/types/accounting";
import { PARENT_SECTION_ORDER } from "@/types/accounting";

/** Virtual group — derived from group_code at runtime (no stored classifications) */
export interface VirtualGroup {
  id: string;
  name: string;
  parent_section: ParentSection;
}

/** Derive parent_section from group_code (upload-time classification) */
function getParentSectionFromGroupCode(gc: string): ParentSection {
  const c = (gc || "").trim()[0];
  if (c === "7") return "cost_of_goods";
  if (c === "8") return "operating";
  if (c === "9") return "admin";
  return "other";
}

// ── Closing Entry Detection ──────────────────────────────────

const CLOSING_KEYWORDS = [
  "סגירה", "סגירת", "סגירת שנה", "סגירת ספרים",
  "closing", "year end", "yearend",
];

export type TransactionWithDesc = Pick<
  DbTransaction,
  "id" | "account_id" | "group_code" | "transaction_date" | "debit" | "credit"
> & { description?: string | null; header_number?: string | null };

export function isClosingEntry(tx: TransactionWithDesc): boolean {
  const desc = (tx.description || "").trim();
  if (!desc) return false;
  const lower = desc.toLowerCase();
  return CLOSING_KEYWORDS.some((kw) => lower.includes(kw));
}

export function countClosingEntries(transactions: TransactionWithDesc[]): number {
  return transactions.filter(isClosingEntry).length;
}

// ── P&L Calculation (group_code only — no stored classifications) ───────

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function calcYearlyPnl(
  year: number,
  transactions: TransactionWithDesc[],
  accounts: DbAccount[],
  _customGroups: unknown[],
  _classificationOverrides: unknown[],
  transactionOverrides: DbTransactionOverride[],
  _mode: "latest" | "original",
  excludeClosingEntries = true,
  revenueGroupCodes: Set<string> = new Set(),
): YearlyPnl {
  const filteredTx = excludeClosingEntries
    ? transactions.filter((tx) => !isClosingEntry(tx))
    : transactions;

  const overridesByTx = new Map<string, DbTransactionOverride[]>();
  for (const ov of transactionOverrides) {
    const list = overridesByTx.get(ov.transaction_id) ?? [];
    list.push(ov);
    overridesByTx.set(ov.transaction_id, list);
  }

  const accountById = new Map<string, DbAccount>();
  for (const a of accounts) accountById.set(a.id, a);

  const emptyMonth = (month: number): MonthlyPnl => ({
    month,
    revenue: 0,
    bySection: { cost_of_goods: 0, operating: 0, admin: 0, finance: 0, other: 0 },
    byGroup: new Map(),
    byAccount: new Map(),
    grossProfit: 0,
    operatingProfit: 0,
    adminTotal: 0,
    financeTotal: 0,
    otherTotal: 0,
    netProfit: 0,
  });

  const monthlyData: MonthlyPnl[] = MONTHS.map(emptyMonth);

  for (const tx of filteredTx) {
    const txDate = new Date(tx.transaction_date);
    if (txDate.getFullYear() !== year) continue;

    const month = txDate.getMonth() + 1;
    const md = monthlyData[month - 1]!;

    const overrides = overridesByTx.get(tx.id) ?? [];
    if (overrides.some((o) => o.override_type === "exclude")) continue;

    const amountOverride = overrides.find((o) => o.override_type === "amount");
    let debit = tx.debit;
    let credit = tx.credit;
    if (amountOverride?.new_value) {
      const v = parseFloat(amountOverride.new_value);
      if (!isNaN(v)) {
        debit = v > 0 ? v : 0;
        credit = v < 0 ? -v : 0;
      }
    }

    const account = accountById.get(tx.account_id);
    if (!account) continue;

    const txGroupCode = (tx.group_code || "").trim();
    const isRevenue =
      revenueGroupCodes.has(txGroupCode) || account.account_type === "revenue";

    if (isRevenue) {
      md.revenue += credit - debit;
    } else {
      const amount = debit - credit;
      const groupCode = txGroupCode || "other";
      const section = getParentSectionFromGroupCode(groupCode);

      md.bySection[section] += amount;
      md.byGroup.set(groupCode, (md.byGroup.get(groupCode) ?? 0) + amount);
      md.byAccount.set(tx.account_id, (md.byAccount.get(tx.account_id) ?? 0) + amount);
    }
  }

  const groupToAccountIds = new Map<string, string[]>();
  const groupToAccountIdsSet = new Map<string, Set<string>>();
  for (const tx of filteredTx) {
    const acct = accountById.get(tx.account_id);
    if (!acct || acct.account_type !== "expense") continue;
    const gc = tx.group_code || "other";
    const s = groupToAccountIdsSet.get(gc) ?? new Set<string>();
    s.add(tx.account_id);
    groupToAccountIdsSet.set(gc, s);
  }
  groupToAccountIdsSet.forEach((set, gc) => groupToAccountIds.set(gc, Array.from(set)));

  for (const md of monthlyData) {
    md.grossProfit = md.revenue - md.bySection.cost_of_goods;
    md.operatingProfit = md.grossProfit - md.bySection.operating;
    md.adminTotal = md.bySection.admin;
    md.financeTotal = md.bySection.finance;
    md.otherTotal = md.bySection.other;
    md.netProfit = md.operatingProfit - md.adminTotal - md.financeTotal - md.otherTotal;
  }

  const total = emptyMonth(0);
  for (const md of monthlyData) {
    total.revenue += md.revenue;
    for (const sec of PARENT_SECTION_ORDER) {
      total.bySection[sec] += md.bySection[sec];
    }
    md.byGroup.forEach((val, key) => {
      total.byGroup.set(key, (total.byGroup.get(key) ?? 0) + val);
    });
    md.byAccount.forEach((val, key) => {
      total.byAccount.set(key, (total.byAccount.get(key) ?? 0) + val);
    });
  }
  total.grossProfit = total.revenue - total.bySection.cost_of_goods;
  total.operatingProfit = total.grossProfit - total.bySection.operating;
  total.adminTotal = total.bySection.admin;
  total.financeTotal = total.bySection.finance;
  total.otherTotal = total.bySection.other;
  total.netProfit = total.operatingProfit - total.adminTotal - total.financeTotal - total.otherTotal;

  return { year, months: monthlyData, total, groupToAccountIds };
}

/** Build virtual groups from yearly PnL (group_code as id) */
export function getVirtualGroupsFromPnl(pnl: YearlyPnl): VirtualGroup[] {
  const seen = new Set<string>();
  const result: VirtualGroup[] = [];
  for (const [groupCode, amount] of Array.from(pnl.total.byGroup.entries())) {
    if (seen.has(groupCode) || amount === 0) continue;
    seen.add(groupCode);
    result.push({
      id: groupCode,
      name: groupCode,
      parent_section: getParentSectionFromGroupCode(groupCode),
    });
  }
  result.sort((a, b) => a.parent_section.localeCompare(b.parent_section) || a.name.localeCompare(b.name));
  return result;
}

// ── Anomaly Detection ────────────────────────────────────────

export function detectAnomalies(
  pnl: YearlyPnl,
  prevPnl: YearlyPnl | null,
  accounts: DbAccount[],
  alertRules: DbAlertRule[],
): AccountAnomaly[] {
  const anomalies: AccountAnomaly[] = [];
  const accountById = new Map<string, DbAccount>();
  for (const a of accounts) accountById.set(a.id, a);

  const yearlyChangePct = alertRules.find(r => r.rule_type === "yearly_change_pct" && !r.account_id)?.threshold_value ?? 40;
  const consecutiveCount = alertRules.find(r => r.rule_type === "consecutive_increase" && !r.account_id)?.threshold_value ?? 3;
  const marginThreshold = alertRules.find(r => r.rule_type === "margin_below")?.threshold_value ?? 30;

  if (pnl.total.revenue > 0) {
    const grossMarginPct = (pnl.total.grossProfit / pnl.total.revenue) * 100;
    if (grossMarginPct < marginThreshold) {
      anomalies.push({
        accountId: "_gross_margin",
        accountCode: "",
        accountName: "רווח גולמי",
        type: "margin_below",
        severity: grossMarginPct < marginThreshold * 0.7 ? "critical" : "warning",
        currentValue: grossMarginPct,
        referenceValue: marginThreshold,
        changePct: grossMarginPct - marginThreshold,
        description: `רווח גולמי ${grossMarginPct.toFixed(1)}% — מתחת לסף ${marginThreshold}%`,
      });
    }
  }

  if (prevPnl) {
    const prevAccountIds = new Set<string>();
    prevPnl.total.byAccount.forEach((_, id) => prevAccountIds.add(id));

    pnl.total.byAccount.forEach((amount, id) => {
      if (amount <= 0) return;
      if (!prevAccountIds.has(id)) {
        const account = accountById.get(id);
        if (!account) return;
        anomalies.push({
          accountId: id,
          accountCode: account.code,
          accountName: account.name,
          type: "new_account",
          severity: "warning",
          currentValue: amount,
          referenceValue: 0,
          changePct: 100,
          description: `חשבון חדש שלא היה קיים ב-${pnl.year - 1}`,
        });
      }
    });
  }

  const allAccountIdsSet = new Set<string>();
  for (const md of pnl.months) {
    md.byAccount.forEach((_, id) => allAccountIdsSet.add(id));
  }

  for (const accountId of Array.from(allAccountIdsSet)) {
    const account = accountById.get(accountId);
    if (!account) continue;

    const monthlyAmounts = pnl.months.map((md) => md.byAccount.get(accountId) ?? 0);
    const nonZeroMonths = monthlyAmounts.filter((v) => v !== 0);
    if (nonZeroMonths.length < 2) continue;

    const avg = nonZeroMonths.reduce((s, v) => s + v, 0) / nonZeroMonths.length;
    const variance = nonZeroMonths.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / nonZeroMonths.length;
    const stddev = Math.sqrt(variance);

    for (let m = 0; m < 12; m++) {
      const val = monthlyAmounts[m] ?? 0;
      if (val === 0) continue;
      const deviation = stddev > 0 ? (val - avg) / stddev : 0;
      if (deviation > 2.0) {
        anomalies.push({
          accountId,
          accountCode: account.code,
          accountName: account.name,
          type: "monthly_spike",
          severity: "critical",
          month: m + 1,
          currentValue: val,
          referenceValue: avg,
          changePct: avg > 0 ? ((val - avg) / avg) * 100 : 0,
        });
      } else if (deviation > 1.5) {
        anomalies.push({
          accountId,
          accountCode: account.code,
          accountName: account.name,
          type: "monthly_spike",
          severity: "warning",
          month: m + 1,
          currentValue: val,
          referenceValue: avg,
          changePct: avg > 0 ? ((val - avg) / avg) * 100 : 0,
        });
      }
    }

    if (prevPnl) {
      const currTotal = pnl.total.byAccount.get(accountId) ?? 0;
      const prevTotal = prevPnl.total.byAccount.get(accountId) ?? 0;
      if (prevTotal > 0 && currTotal > 0) {
        const pct = ((currTotal - prevTotal) / prevTotal) * 100;
        if (Math.abs(pct) > yearlyChangePct) {
          anomalies.push({
            accountId,
            accountCode: account.code,
            accountName: account.name,
            type: "yoy_increase",
            severity: Math.abs(pct) > yearlyChangePct * 1.5 ? "critical" : "warning",
            currentValue: currTotal,
            referenceValue: prevTotal,
            changePct: pct,
          });
        }
      }
    }

    let consecutiveUp = 0;
    let consecutiveStart = -1;
    for (let m = 1; m < 12; m++) {
      const prev = monthlyAmounts[m - 1] ?? 0;
      const curr = monthlyAmounts[m] ?? 0;
      if (curr > prev && curr > 0) {
        if (consecutiveUp === 0) consecutiveStart = m - 1;
        consecutiveUp++;
        if (consecutiveUp >= consecutiveCount - 1) {
          if (!anomalies.find(a => a.accountId === accountId && a.type === "consecutive_increase")) {
            const pct =
              (monthlyAmounts[consecutiveStart] ?? 0) > 0
                ? ((curr - (monthlyAmounts[consecutiveStart] ?? 0)) / Math.abs(monthlyAmounts[consecutiveStart] ?? 1)) * 100
                : 0;
            anomalies.push({
              accountId,
              accountCode: account.code,
              accountName: account.name,
              type: "consecutive_increase",
              severity: "warning",
              months: Array.from({ length: consecutiveUp + 1 }, (_, i) => consecutiveStart + i + 1),
              currentValue: curr,
              referenceValue: monthlyAmounts[consecutiveStart] ?? 0,
              changePct: pct,
            });
          }
        }
      } else {
        consecutiveUp = 0;
        consecutiveStart = -1;
      }
    }
  }

  return anomalies;
}
