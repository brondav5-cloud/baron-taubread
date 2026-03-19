/**
 * Export distribution-v2 filtered rows to Excel.
 * Uses loadXlsx (no direct xlsx import per project rules).
 */

import { loadXlsx } from "@/lib/loadXlsx";
import type { DistributionV2Row } from "../types";

const SHEET_NAME = "נתונים";
const FILENAME_PREFIX = "נתוני_חלוקה";

export async function exportDistributionV2ToExcel(
  rows: DistributionV2Row[],
): Promise<void> {
  const XLSX = await loadXlsx();

  const data = rows.map((row) => ({
    חודש: row.month ?? "",
    תאריך: row.periodDate ?? "",
    "מזהה לקוח": row.customerId ?? "",
    לקוח: row.customer ?? "",
    רשת: row.network ?? "",
    עיר: row.city ?? "",
    "מזהה מוצר": row.productId ?? "",
    מוצר: row.product ?? "",
    "קטגורית מוצרים": row.productCategory ?? "",
    "כמות ברוטו": row.grossQuantity ?? "",
    כמות: row.quantity,
    חזרות: row.returns,
    "חזרות(%)": row.returnsPct ?? "",
    מכירות: row.sales != null ? row.sales : "",
    נהג: row.driver ?? "",
    סוכן: row.agent ?? "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws["!cols"] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 28 },
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `${FILENAME_PREFIX}_${today}.xlsx`);
}
