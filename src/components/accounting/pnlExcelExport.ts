import type { YearlyPnl, DbCustomGroup, MonthlyPnl } from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER } from "@/types/accounting";
import { loadXlsx } from "@/lib/loadXlsx";
import { MONTH_SHORT } from "./pnlHelpers";

export async function exportPnlToExcel(
  yearlyPnl: YearlyPnl,
  year: number,
  groupsBySection: Map<string, DbCustomGroup[]>,
): Promise<void> {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  const headers = ["סעיף", ...MONTH_SHORT, 'סה"כ', "% מהכנסות"];
  const rows: (string | number)[][] = [headers];

  const addRow = (label: string, getFn: (m: MonthlyPnl) => number) => {
    const rev = yearlyPnl.total.revenue;
    const totalVal = getFn(yearlyPnl.total);
    rows.push([
      label,
      ...yearlyPnl.months.map(m => {
        const v = getFn(m);
        return v !== 0 ? Math.round(v) : 0;
      }),
      Math.round(totalVal),
      rev > 0 ? `${((Math.abs(totalVal) / rev) * 100).toFixed(1)}%` : "—",
    ]);
  };

  addRow("הכנסות נטו", m => m.revenue);
  for (const sec of PARENT_SECTION_ORDER) {
    addRow(`(-) ${PARENT_SECTION_LABELS[sec]}`, m => m.bySection[sec]);
    const groups = (groupsBySection.get(sec) ?? []).filter(
      g => (yearlyPnl.total.byGroup.get(g.id) ?? 0) > 0
    );
    for (const g of groups) {
      addRow(`  ▸ ${g.name}`, m => m.byGroup.get(g.id) ?? 0);
    }
    if (sec === "cost_of_goods") addRow("= רווח גולמי", m => m.grossProfit);
    if (sec === "admin") addRow("= רווח תפעולי", m => m.operatingProfit);
  }
  addRow("= רווח נקי", m => m.netProfit);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 35 }, ...Array(14).fill({ wch: 11 })];
  ws["!dir"] = "RTL";
  XLSX.utils.book_append_sheet(wb, ws, `רו"ה ${year}`);
  XLSX.writeFile(wb, `רווח-והפסד-${year}.xlsx`);
}
