import type { DbProduct, DbStore } from "@/types/db";

export type OpsAlertSeverity = "critical" | "warning" | "watch";
export type OpsAlertKind =
  | "store_crash"
  | "store_decline"
  | "store_short_alarm"
  | "store_week_drop"
  | "store_week_miss"
  | "product_crash"
  | "product_decline"
  | "product_short_alarm";

export interface OpsAlert {
  id: string;
  kind: OpsAlertKind;
  severity: OpsAlertSeverity;
  title: string;
  evidence: string;
  href: string;
  entityName: string;
}

export interface WeeklyStoreQty {
  storeExternalId: number;
  year: number;
  month: number;
  week: number;
  qty: number;
}

const MIN_WEEKLY_BASELINE = 20;
const WEEK_WATCH_PCT = -10;
const WEEK_ALERT_PCT = -15;
const WEEK_CRITICAL_PCT = -25;

export function jerusalemTodayYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const parts = ymd.split("-");
  return {
    y: Number(parts[0]) || 1970,
    m: Number(parts[1]) || 1,
    d: Number(parts[2]) || 1,
  };
}

export function sundayWeekStart(ymd: string): string {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - dt.getUTCDay());
  return dt.toISOString().slice(0, 10);
}

export function addDaysIso(ymd: string, days: number): string {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function isWeekClosed(weekStart: string, today = jerusalemTodayYmd()): boolean {
  return today >= addDaysIso(weekStart, 7);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function weekSortKey(row: WeeklyStoreQty): number {
  return row.year * 10000 + row.month * 100 + row.week;
}

export function buildStoreMetricAlerts(stores: DbStore[]): OpsAlert[] {
  const alerts: OpsAlert[] = [];
  for (const store of stores) {
    const longStatus = store.metrics?.status_long || "יציב";
    const shortStatus = store.metrics?.status_short || "יציב";
    const m12 = store.metrics?.metric_12v12 ?? 0;
    const m2 = store.metrics?.metric_2v2 ?? 0;
    const href = `/dashboard/stores/${store.external_id}`;

    if (longStatus === "התרסקות") {
      alerts.push({
        id: `store-crash-${store.id}`,
        kind: "store_crash",
        severity: "critical",
        title: store.name,
        evidence: `מגמה שנתית התרסקות · 12v12 ${fmtPct(m12)}`,
        href,
        entityName: store.name,
      });
    } else if (longStatus === "ירידה") {
      alerts.push({
        id: `store-decline-${store.id}`,
        kind: "store_decline",
        severity: "warning",
        title: store.name,
        evidence: `מגמה שנתית ירידה · 12v12 ${fmtPct(m12)}`,
        href,
        entityName: store.name,
      });
    }

    if (shortStatus === "אזעקה") {
      alerts.push({
        id: `store-alarm-${store.id}`,
        kind: "store_short_alarm",
        severity: "critical",
        title: store.name,
        evidence: `מגמה קצרה אזעקה · 2v2 ${fmtPct(m2)}`,
        href,
        entityName: store.name,
      });
    }
  }
  return alerts;
}

export function buildProductMetricAlerts(products: DbProduct[], limit = 20): OpsAlert[] {
  const alerts: OpsAlert[] = [];
  for (const product of products) {
    const longStatus = product.metrics?.status_long || "יציב";
    const shortStatus = product.metrics?.status_short || "יציב";
    const m12 = product.metrics?.metric_12v12 ?? 0;
    const m2 = product.metrics?.metric_2v2 ?? 0;
    const href = `/dashboard/products/${product.external_id}`;

    if (longStatus === "התרסקות") {
      alerts.push({
        id: `product-crash-${product.id}`,
        kind: "product_crash",
        severity: "critical",
        title: product.name,
        evidence: `מוצר בהתמוטטות · 12v12 ${fmtPct(m12)}`,
        href,
        entityName: product.name,
      });
    } else if (longStatus === "ירידה") {
      alerts.push({
        id: `product-decline-${product.id}`,
        kind: "product_decline",
        severity: "warning",
        title: product.name,
        evidence: `מוצר בירידה · 12v12 ${fmtPct(m12)}`,
        href,
        entityName: product.name,
      });
    }

    if (shortStatus === "אזעקה") {
      alerts.push({
        id: `product-alarm-${product.id}`,
        kind: "product_short_alarm",
        severity: "critical",
        title: product.name,
        evidence: `מוצר באזעקה קצרה · 2v2 ${fmtPct(m2)}`,
        href,
        entityName: product.name,
      });
    }
  }

  return rankAlerts(alerts).slice(0, limit);
}

export function buildWeeklyStoreAlerts(
  rows: WeeklyStoreQty[],
  storeNameById: Map<number, string>,
  today = jerusalemTodayYmd(),
): { alerts: OpsAlert[]; latestClosedWeek: string | null } {
  const currentWeekStart = sundayWeekStart(today);
  const byStore = new Map<number, WeeklyStoreQty[]>();

  for (const row of rows) {
    const list = byStore.get(row.storeExternalId) ?? [];
    list.push(row);
    byStore.set(row.storeExternalId, list);
  }

  const alerts: OpsAlert[] = [];
  let latestClosedWeek: string | null = null;

  for (const [storeId, list] of Array.from(byStore.entries())) {
    const sorted = [...list].sort((a, b) => weekSortKey(a) - weekSortKey(b));
    if (sorted.length < 5) continue;

    const closed = sorted.filter((row) => {
      const start = weekStartFromYearMonthWeek(row.year, row.month, row.week);
      if (!start) return false;
      if (start >= currentWeekStart) return false;
      if (!latestClosedWeek || start > latestClosedWeek) latestClosedWeek = start;
      return isWeekClosed(start, today);
    });
    if (closed.length < 5) continue;

    const last = closed[closed.length - 1]!;
    const prev = closed.slice(-9, -1);
    const baseline = median(prev.map((r) => r.qty));
    if (baseline === null || baseline < MIN_WEEKLY_BASELINE) continue;

    const change = pctChange(last.qty, baseline);
    if (change === null) continue;

    const prevLast = closed[closed.length - 2];
    const prevBaseline = prevLast
      ? median(closed.slice(-10, -2).map((r) => r.qty))
      : null;
    const prevChange =
      prevLast && prevBaseline && prevBaseline >= MIN_WEEKLY_BASELINE
        ? pctChange(prevLast.qty, prevBaseline)
        : null;

    const name = storeNameById.get(storeId) ?? String(storeId);
    const href = `/dashboard/stores/${storeId}?tab=weekly`;

    if (last.qty === 0 && baseline >= MIN_WEEKLY_BASELINE) {
      alerts.push({
        id: `store-week-miss-${storeId}`,
        kind: "store_week_miss",
        severity: "critical",
        title: name,
        evidence: `שבוע סגור בלי אספקה · בסיס ${Math.round(baseline)} יח׳`,
        href,
        entityName: name,
      });
      continue;
    }

    const twoWeekDrop =
      change <= WEEK_ALERT_PCT && prevChange !== null && prevChange <= WEEK_ALERT_PCT;

    if (change <= WEEK_CRITICAL_PCT || twoWeekDrop) {
      alerts.push({
        id: `store-week-drop-${storeId}`,
        kind: "store_week_drop",
        severity: change <= WEEK_CRITICAL_PCT ? "critical" : "warning",
        title: name,
        evidence: twoWeekDrop
          ? `שני שבועות סגורים בירידה · אחרון ${fmtPct(change)} מול חציון 8 שבועות`
          : `שבוע סגור ${fmtPct(change)} מול חציון 8 שבועות`,
        href,
        entityName: name,
      });
    } else if (change <= WEEK_WATCH_PCT) {
      alerts.push({
        id: `store-week-watch-${storeId}`,
        kind: "store_week_drop",
        severity: "watch",
        title: name,
        evidence: `מעקב שבועי · ${fmtPct(change)} מול חציון 8 שבועות`,
        href,
        entityName: name,
      });
    }
  }

  return { alerts, latestClosedWeek };
}

/** Approximate Sunday week-start from stored year/month/ISO week. */
function weekStartFromYearMonthWeek(
  year: number,
  month: number,
  week: number,
): string | null {
  if (!year || !month || !week) return null;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  jan4.setUTCDate(jan4.getUTCDate() - (day - 1) + (week - 1) * 7);
  const sunday = new Date(jan4);
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());
  return sunday.toISOString().slice(0, 10);
}

export function mergeOpsAlerts(...groups: OpsAlert[][]): OpsAlert[] {
  const byEntity = new Map<string, OpsAlert>();
  for (const group of groups) {
    for (const alert of group) {
      const key = `${alert.href}|${alert.kind}`;
      const existing = byEntity.get(key);
      if (!existing || severityRank(alert.severity) < severityRank(existing.severity)) {
        byEntity.set(key, alert);
      }
    }
  }
  return rankAlerts(Array.from(byEntity.values()));
}

export function rankAlerts(alerts: OpsAlert[]): OpsAlert[] {
  return [...alerts].sort((a, b) => {
    const sev = severityRank(a.severity) - severityRank(b.severity);
    if (sev !== 0) return sev;
    return a.title.localeCompare(b.title, "he");
  });
}

function severityRank(severity: OpsAlertSeverity): number {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
}

function fmtPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatFreshnessTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
