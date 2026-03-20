// ============================================================
// SMART ORDER ENGINE
// Pure computation — no DB / no React.
//
// Logic:
//   1. Look up the "normal returns %" for this product's monthly qty bracket.
//   2. Compute the excess returns rate vs the normal rate.
//   3. Convert excess → monthly reduction qty → weekly reduction qty.
//   4. Split the weekly reduction across days proportional to each day's
//      historical average delivery share.
//
// Example (from spec):
//   Monthly delivered = 60, monthly returns = 30  → actual rate = 50 %
//   Normal rate (bracket 31-60) = 16 %
//   Excess = 34 %  →  monthly reduction = 60 × 34% = 20.4 ≈ 20
//   Weekly reduction = 20 / 4 = 5
//   Day pattern: Sun=10, Thu=5  → total=15
//     Sun share = 10/15 = 67%  → reduce 3   → suggest 10−3 = 7
//     Thu share =  5/15 = 33%  → reduce 2   → suggest  5−2 = 3
// ============================================================

export const DAY_LABELS: Record<number, string> = {
  1: "ראשון",
  2: "שני",
  3: "שלישי",
  4: "רביעי",
  5: "חמישי",
  6: "שישי",
  7: "שבת",
};

// ── Policy ────────────────────────────────────────────────────────────────

export interface PolicyBracket {
  minQty:           number;
  maxQty:           number | null;   // null = unbounded (top bracket)
  normalReturnsPct: number;
  label?:           string;
}

/** Built-in defaults, used when the company hasn't configured its own policy. */
export const DEFAULT_POLICY: PolicyBracket[] = [
  { minQty: 0,  maxQty: 10,   normalReturnsPct: 30, label: "עד 10 יח׳ / חודש" },
  { minQty: 11, maxQty: 30,   normalReturnsPct: 22, label: "11–30 יח׳ / חודש" },
  { minQty: 31, maxQty: 60,   normalReturnsPct: 16, label: "31–60 יח׳ / חודש" },
  { minQty: 61, maxQty: null, normalReturnsPct: 12, label: "61+ יח׳ / חודש"   },
];

export function findNormalReturnsPct(monthlyQty: number, policy: PolicyBracket[]): number {
  const sorted = [...policy].sort((a, b) => a.minQty - b.minQty);
  for (const bracket of sorted) {
    if (
      monthlyQty >= bracket.minQty &&
      (bracket.maxQty === null || monthlyQty <= bracket.maxQty)
    ) {
      return bracket.normalReturnsPct;
    }
  }
  // Fallback: last bracket's rate
  return sorted[sorted.length - 1]?.normalReturnsPct ?? 12;
}

// ── Day patterns ──────────────────────────────────────────────────────────

export interface DayPattern {
  dayOfWeek:     number;   // 1=Sun … 7=Sat
  avgGrossQty:   number;   // average delivery qty on this day (over sampled weeks)
  avgReturnsQty: number;
  occurrences:   number;   // how many weeks this day appeared
}

// ── Recommendation output ─────────────────────────────────────────────────

export interface DayRecommendation {
  dayOfWeek:    number;
  dayLabel:     string;
  currentQty:   number;   // rounded avg delivery for this day
  suggestedQty: number;   // after applying proportional reduction
  reductionQty: number;   // suggestedQty = currentQty − reductionQty
  shareOfWeek:  number;   // 0-1 proportion of this day in the weekly total
}

export interface OrderRecommendation {
  productName:           string;
  productNameNormalized: string;

  // Monthly context (last complete month)
  monthlyGrossQty:    number;
  monthlyReturnsQty:  number;
  monthlyReturnsRate: number;   // percent, e.g. 50.0

  // Policy
  normalReturnsPct:   number;   // from policy bracket
  excessReturnsPct:   number;   // max(actual − normal, 0)
  isExcess:           boolean;  // true when excessReturnsPct >= EXCESS_THRESHOLD

  // Reduction
  monthlyReductionQty: number;
  weeklyReductionQty:  number;

  // Per-day split
  dayBreakdown: DayRecommendation[];
}

/** Minimum excess (%) before we consider it actionable. */
const EXCESS_THRESHOLD = 2;

// ── Main computation ──────────────────────────────────────────────────────

export function computeOrderRecommendation(params: {
  productName:           string;
  productNameNormalized: string;
  monthlyGrossQty:       number;
  monthlyReturnsQty:     number;
  dayPatterns:           DayPattern[];
  policy:                PolicyBracket[];
}): OrderRecommendation {
  const {
    productName,
    productNameNormalized,
    monthlyGrossQty,
    monthlyReturnsQty,
    dayPatterns,
    policy,
  } = params;

  const monthlyReturnsRate =
    monthlyGrossQty > 0 ? (monthlyReturnsQty / monthlyGrossQty) * 100 : 0;

  const normalReturnsPct = findNormalReturnsPct(monthlyGrossQty, policy);
  const excessReturnsPct = Math.max(monthlyReturnsRate - normalReturnsPct, 0);
  const isExcess = excessReturnsPct >= EXCESS_THRESHOLD;

  const monthlyReductionQty = monthlyGrossQty * (excessReturnsPct / 100);
  const weeklyReductionQty  = monthlyReductionQty / 4;

  // Only active delivery days
  const activeDays = dayPatterns
    .filter((d) => d.avgGrossQty > 0)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const weeklyTotalAvg = activeDays.reduce((s, d) => s + d.avgGrossQty, 0);

  const dayBreakdown: DayRecommendation[] = activeDays.map((d) => {
    const share        = weeklyTotalAvg > 0 ? d.avgGrossQty / weeklyTotalAvg : 0;
    const reductionQty = Math.round(weeklyReductionQty * share);
    const currentQty   = Math.round(d.avgGrossQty);
    const suggestedQty = Math.max(0, currentQty - reductionQty);
    return {
      dayOfWeek:    d.dayOfWeek,
      dayLabel:     DAY_LABELS[d.dayOfWeek] ?? `יום ${d.dayOfWeek}`,
      currentQty,
      suggestedQty,
      reductionQty,
      shareOfWeek:  share,
    };
  });

  return {
    productName,
    productNameNormalized,
    monthlyGrossQty:     Math.round(monthlyGrossQty),
    monthlyReturnsQty:   Math.round(monthlyReturnsQty),
    monthlyReturnsRate:  Math.round(monthlyReturnsRate * 10) / 10,
    normalReturnsPct,
    excessReturnsPct:    Math.round(excessReturnsPct * 10) / 10,
    isExcess,
    monthlyReductionQty: Math.round(monthlyReductionQty),
    weeklyReductionQty:  Math.round(weeklyReductionQty),
    dayBreakdown,
  };
}
