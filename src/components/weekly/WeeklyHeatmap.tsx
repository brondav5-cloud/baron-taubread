"use client";

import { useMemo } from "react";
import type { StoreWeekComparison } from "@/hooks/useWeeklyComparison";

// ── helpers ──────────────────────────────────────────────────────────────────

function cellBg(dir: string, pct: number | null): string {
  if (dir === "nodata") return "#f3f4f6";
  if (dir === "stable") return "#e5e7eb";
  const abs = Math.abs(pct ?? 0);
  if (dir === "up") {
    if (abs >= 30) return "#16a34a";
    if (abs >= 15) return "#4ade80";
    return "#bbf7d0";
  }
  if (abs >= 30) return "#dc2626";
  if (abs >= 15) return "#f87171";
  return "#fecaca";
}

function cellText(dir: string, pct: number | null): string {
  if (dir === "nodata") return "";
  if (pct === null) return "";
  return `${pct > 0 ? "+" : ""}${Math.round(pct)}%`;
}

function cellFg(dir: string, pct: number | null): string {
  const abs = Math.abs(pct ?? 0);
  if (dir === "up"   && abs >= 15) return "#fff";
  if (dir === "down" && abs >= 15) return "#fff";
  return "#374151";
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  stores:     StoreWeekComparison[];
  weeksCount: number;
}

export function WeeklyHeatmap({ stores, weeksCount }: Props) {
  const { topProducts, sortedStores, lookup } = useMemo(() => {
    // Aggregate total gross across all visible stores
    const volMap = new Map<string, { name: string; total: number }>();
    for (const s of stores) {
      for (const p of s.products) {
        const prev = volMap.get(p.productNameNormalized);
        if (prev) { prev.total += p.grossQty; }
        else { volMap.set(p.productNameNormalized, { name: p.productName, total: p.grossQty }); }
      }
    }

    const topProducts = Array.from(volMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 30)
      .map(([normalized, { name }]) => ({ normalized, name }));

    // Lookup: productNorm → storeId → cell data
    const lookup = new Map<string, Map<number, { dir: string; pct: number | null; qty: number }>>();
    for (const s of stores) {
      for (const p of s.products) {
        if (!lookup.has(p.productNameNormalized)) lookup.set(p.productNameNormalized, new Map());
        lookup.get(p.productNameNormalized)!.set(s.storeExternalId, {
          dir: p.vs3WeekAvg.direction,
          pct: p.vs3WeekAvg.pctChange,
          qty: p.grossQty,
        });
      }
    }

    return { topProducts, sortedStores: stores, lookup };
  }, [stores]);

  if (stores.length === 0) {
    return <div className="text-center py-16 text-gray-400 text-sm">אין נתונים להצגה</div>;
  }

  const periodLabel = weeksCount === 1 ? "" : ` (ממוצע ${weeksCount} שב׳)`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-base font-semibold text-gray-800">Heatmap — מגמות מוצרים × חנויות</span>
        <span className="text-xs text-gray-400">(לפי ממוצע 3 שבועות{periodLabel}, עד 30 מוצרים מובילים)</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          style={{ borderCollapse: "collapse", fontSize: "11px", direction: "rtl" }}
        >
          <thead>
            <tr>
              {/* Sticky product name column header */}
              <th
                style={{
                  position: "sticky",
                  right: 0,
                  background: "#f9fafb",
                  zIndex: 10,
                  minWidth: 150,
                  padding: "8px 10px",
                  textAlign: "right",
                  borderBottom: "2px solid #e5e7eb",
                  borderLeft: "1px solid #e5e7eb",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                מוצר \ חנות
              </th>
              {sortedStores.map((s) => (
                <th
                  key={s.storeExternalId}
                  style={{
                    padding: "4px 2px",
                    borderBottom: "2px solid #e5e7eb",
                    borderLeft: "1px solid #f3f4f6",
                    minWidth: 64,
                    maxWidth: 80,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      writingMode: "vertical-lr",
                      textOrientation: "mixed",
                      transform: "rotate(180deg)",
                      whiteSpace: "nowrap",
                      maxHeight: 90,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: "#374151",
                      fontWeight: 600,
                      fontSize: "10px",
                    }}
                    title={s.storeName}
                  >
                    {s.storeName.length > 10 ? s.storeName.slice(0, 10) + "…" : s.storeName}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topProducts.map((product, rowIdx) => (
              <tr key={product.normalized} style={{ background: rowIdx % 2 === 0 ? "#fff" : "#fafafa" }}>
                {/* Product name */}
                <td
                  style={{
                    position: "sticky",
                    right: 0,
                    background: rowIdx % 2 === 0 ? "#fff" : "#fafafa",
                    zIndex: 5,
                    padding: "4px 10px",
                    borderBottom: "1px solid #f3f4f6",
                    borderLeft: "1px solid #e5e7eb",
                    fontWeight: 500,
                    color: "#1f2937",
                    whiteSpace: "nowrap",
                  }}
                >
                  {product.name}
                </td>
                {/* Cells */}
                {sortedStores.map((s) => {
                  const cell = lookup.get(product.normalized)?.get(s.storeExternalId);
                  const bg  = cell ? cellBg(cell.dir, cell.pct) : "#f9fafb";
                  const fg  = cell ? cellFg(cell.dir, cell.pct) : "#9ca3af";
                  const txt = cell ? cellText(cell.dir, cell.pct) : "—";
                  const title = cell
                    ? `${s.storeName} / ${product.name}: ${cell.qty} יח׳ — ${txt || "יציב"} לעומת ממוצע 3`
                    : `${s.storeName} / ${product.name}: אין נתון`;
                  return (
                    <td
                      key={s.storeExternalId}
                      title={title}
                      style={{
                        padding: "3px 2px",
                        borderBottom: "1px solid #f3f4f6",
                        borderLeft: "1px solid #f3f4f6",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          background: bg,
                          color: fg,
                          borderRadius: 4,
                          margin: "0 2px",
                          padding: "3px 4px",
                          fontWeight: 600,
                          fontSize: "10px",
                          minWidth: 48,
                        }}
                      >
                        {txt || (cell ? "±0" : "—")}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="font-semibold text-gray-700">מקרא:</span>
        {[
          { bg: "#16a34a", fg: "#fff", label: "עלייה חזקה >30%" },
          { bg: "#4ade80", fg: "#374151", label: "עלייה 15-30%" },
          { bg: "#bbf7d0", fg: "#374151", label: "עלייה <15%" },
          { bg: "#e5e7eb", fg: "#374151", label: "יציב" },
          { bg: "#fecaca", fg: "#374151", label: "ירידה <15%" },
          { bg: "#f87171", fg: "#374151", label: "ירידה 15-30%" },
          { bg: "#dc2626", fg: "#fff", label: "ירידה חזקה >30%" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: 3,
                background: item.bg,
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
