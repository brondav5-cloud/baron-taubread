// ============================================
// EXCEL EXPORT UTILITIES (Optimized)
// ============================================
// xlsx is loaded ONLY when export is triggered (saves ~900KB from initial bundle)

import { StoreWithStatus, ProductWithStatus, StatusLong } from "@/types/data";
import { STATUS_DISPLAY_LONG } from "@/types/data";

// ============================================
// TYPES
// ============================================

interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatNum(value: number): number {
  return Math.round(value);
}

function getStatusDisplay(status: string): string {
  return STATUS_DISPLAY_LONG[status as StatusLong] || status;
}

// ============================================
// STORES EXPORT
// ============================================

export async function exportStoresToExcel(
  stores: StoreWithStatus[],
  options: ExportOptions = {},
): Promise<void> {
  // Dynamic import - only loads when function is called
  const XLSX = await import("xlsx");

  const { filename = "חנויות", sheetName = "חנויות" } = options;

  const data = stores.map((store, index) => ({
    "#": index + 1,
    מזהה: store.id,
    "שם חנות": store.name,
    עיר: store.city,
    רשת: store.network || "",
    סוכן: store.agent,
    נהג: store.driver || "",
    סטטוס: getStatusDisplay(store.status_long),
    "12v12": formatPercent(store.metric_12v12),
    "6v6": formatPercent(store.metric_6v6),
    "3v3": formatPercent(store.metric_3v3),
    "2v2": formatPercent(store.metric_2v2),
    מהשיא: formatPercent(store.metric_peak_distance),
    "אחוז החזרות": `${store.returns_pct_last6.toFixed(1)}%`,
    "כמות 2025": formatNum(store.qty_2025),
    "כמות נטו 2025": formatNum(store.qty_total),
    "מכירות 2025": formatNum(store.sales_2025),
    "ערך נוכחי": formatNum(store.current_value),
    שיא: formatNum(store.peak_value),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws["!cols"] = [
    { wch: 5 },
    { wch: 8 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `${filename}_${today}.xlsx`);
}

// ============================================
// PRODUCTS EXPORT
// ============================================

export async function exportProductsToExcel(
  products: ProductWithStatus[],
  options: ExportOptions = {},
): Promise<void> {
  const XLSX = await import("xlsx");

  const { filename = "מוצרים", sheetName = "מוצרים" } = options;

  const data = products.map((product, index) => ({
    "#": index + 1,
    'מק"ט': product.id,
    "שם מוצר": product.name,
    קטגוריה: product.category,
    סטטוס: getStatusDisplay(product.status_long),
    "12v12": formatPercent(product.metric_12v12),
    "6v6": formatPercent(product.metric_6v6),
    "3v3": formatPercent(product.metric_3v3),
    "2v2": formatPercent(product.metric_2v2),
    מהשיא: formatPercent(product.metric_peak_distance),
    "אחוז החזרות": `${product.returns_pct_last6.toFixed(1)}%`,
    "כמות 2025": formatNum(product.qty_2025),
    "מכירות 2025": formatNum(product.sales_2025),
    "ערך נוכחי": formatNum(product.current_value),
    שיא: formatNum(product.peak_value),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws["!cols"] = [
    { wch: 5 },
    { wch: 8 },
    { wch: 30 },
    { wch: 15 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `${filename}_${today}.xlsx`);
}

// ============================================
// STORE DETAIL EXPORT
// ============================================

export async function exportStoreDetailToExcel(
  store: StoreWithStatus,
  options: ExportOptions = {},
): Promise<void> {
  const XLSX = await import("xlsx");

  const { filename = `חנות_${store.name}` } = options;
  const wb = XLSX.utils.book_new();

  // Sheet 1: Store Info
  const infoData = [
    ["פרטי חנות", ""],
    ["מזהה", store.id],
    ["שם", store.name],
    ["עיר", store.city],
    ["רשת", store.network || "עצמאי"],
    ["סוכן", store.agent],
    ["נהג", store.driver || "-"],
    ["סטטוס", getStatusDisplay(store.status_long)],
    ["", ""],
    ["מדדים", ""],
    ["12v12", formatPercent(store.metric_12v12)],
    ["6v6", formatPercent(store.metric_6v6)],
    ["3v3", formatPercent(store.metric_3v3)],
    ["2v2", formatPercent(store.metric_2v2)],
    ["מרחק מהשיא", formatPercent(store.metric_peak_distance)],
    ["אחוז החזרות", `${store.returns_pct_last6.toFixed(1)}%`],
    ["", ""],
    ["סיכומים", ""],
    ["כמות 2025", formatNum(store.qty_2025)],
    ["כמות נטו 2025", formatNum(store.qty_total)],
    ["מכירות 2025", formatNum(store.sales_2025)],
    ["ערך נוכחי", formatNum(store.current_value)],
    ["שיא", formatNum(store.peak_value)],
  ];

  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  wsInfo["!cols"] = [{ wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "פרטים");

  // Sheet 2: Monthly Data
  const months = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ];

  const monthlyData: (string | number)[][] = [
    ["חודש", "כמות 2024", "כמות 2025", "שינוי"],
  ];

  months.forEach((month, i) => {
    const period2024 = `2024${String(i + 1).padStart(2, "0")}`;
    const period2025 = `2025${String(i + 1).padStart(2, "0")}`;
    const qty2024 = store.monthly_qty[period2024] ?? 0;
    const qty2025 = store.monthly_qty[period2025] ?? 0;
    const change = qty2024 > 0 ? ((qty2025 - qty2024) / qty2024) * 100 : 0;

    monthlyData.push([
      month,
      formatNum(qty2024),
      formatNum(qty2025),
      formatPercent(change),
    ]);
  });

  const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyData);
  wsMonthly["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsMonthly, "נתונים חודשיים");

  const today = new Date().toISOString().split("T")[0];
  const safeFilename = filename.replace(/[^א-תa-zA-Z0-9_]/g, "_");
  XLSX.writeFile(wb, `${safeFilename}_${today}.xlsx`);
}

// ============================================
// DASHBOARD SUMMARY EXPORT
// ============================================

export async function exportDashboardSummaryToExcel(
  stores: StoreWithStatus[],
  products: ProductWithStatus[],
  options: ExportOptions = {},
): Promise<void> {
  const XLSX = await import("xlsx");

  const { filename = "סיכום_דאשבורד" } = options;
  const wb = XLSX.utils.book_new();

  // Calculate stats
  const totalStores = stores.length;
  const totalProducts = products.length;
  const totalSales = stores.reduce((sum, s) => sum + s.sales_2025, 0);
  const totalQty = stores.reduce((sum, s) => sum + s.qty_total, 0);
  const avgMetric12v12 =
    stores.reduce((sum, s) => sum + s.metric_12v12, 0) / totalStores;
  const avgMetric6v6 =
    stores.reduce((sum, s) => sum + s.metric_6v6, 0) / totalStores;

  // Status distribution
  const statusCounts: Record<string, number> = {};
  stores.forEach((s) => {
    const status = getStatusDisplay(s.status_long);
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  // Sheet 1: Summary
  const summaryData = [
    ["סיכום כללי", ""],
    ["תאריך הפקה", new Date().toLocaleDateString("he-IL")],
    ["", ""],
    ["מספר חנויות", totalStores],
    ["מספר מוצרים", totalProducts],
    ['סה"כ מכירות 2025', `₪${totalSales.toLocaleString("he-IL")}`],
    ['סה"כ כמות נטו 2025', totalQty.toLocaleString("he-IL")],
    ["ממוצע 12v12", formatPercent(avgMetric12v12)],
    ["ממוצע 6v6", formatPercent(avgMetric6v6)],
    ["", ""],
    ["התפלגות סטטוסים", ""],
    ...Object.entries(statusCounts).map(([status, count]) => [status, count]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "סיכום");

  // Sheet 2: Top Stores
  const topStores = [...stores]
    .sort((a, b) => b.metric_12v12 - a.metric_12v12)
    .slice(0, 20)
    .map((store, i) => ({
      "#": i + 1,
      שם: store.name,
      עיר: store.city,
      "12v12": formatPercent(store.metric_12v12),
      סטטוס: getStatusDisplay(store.status_long),
    }));

  const wsTop = XLSX.utils.json_to_sheet(topStores);
  XLSX.utils.book_append_sheet(wb, wsTop, "טופ 20 חנויות");

  // Sheet 3: Bottom Stores
  const bottomStores = [...stores]
    .sort((a, b) => a.metric_12v12 - b.metric_12v12)
    .slice(0, 20)
    .map((store, i) => ({
      "#": i + 1,
      שם: store.name,
      עיר: store.city,
      "12v12": formatPercent(store.metric_12v12),
      סטטוס: getStatusDisplay(store.status_long),
    }));

  const wsBottom = XLSX.utils.json_to_sheet(bottomStores);
  XLSX.utils.book_append_sheet(wb, wsBottom, "חנויות לשיפור");

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `${filename}_${today}.xlsx`);
}
