import type { SupabaseClient } from "@supabase/supabase-js";

function toYyyymm(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 100001) {
    return value;
  }
  if (typeof value !== "string") return null;
  const digits = value.trim().replace("-", "").slice(0, 6);
  if (!/^\d{6}$/.test(digits)) return null;
  const n = Number(digits);
  return n >= 100001 ? n : null;
}

export function monthRangeFromValues(
  from: string | number | null | undefined,
  to: string | number | null | undefined,
): { from: number; to: number } | null {
  const start = toYyyymm(from);
  const end = toYyyymm(to);
  if (!start || !end) return null;
  return start <= end ? { from: start, to: end } : { from: end, to: start };
}

export function monthRangeFromList(
  months: string[] | null | undefined,
): { from: number; to: number } | null {
  const nums = (months ?? [])
    .map((m) => toYyyymm(m))
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  if (nums.length === 0) return null;
  return { from: nums[0]!, to: nums[nums.length - 1]! };
}

export async function syncCatalogFromMonthlyDist(
  supabase: SupabaseClient,
  companyId: string,
  range: { from: number; to: number },
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("sync_catalog_from_monthly_dist", {
    p_company_id: companyId,
    p_from_yyyymm: range.from,
    p_to_yyyymm: range.to,
  });
  if (error) {
    console.error("[syncCatalogFromMonthlyDist]", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
