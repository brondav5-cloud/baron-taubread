"use client";

import { ErpReportPage } from "@/components/erp/ErpReportPage";

export default function ErpRevenuePage() {
  return (
    <ErpReportPage
      title="מחזור"
      subtitle="סיכום חשבוניות מתוכנת האם (לא דוח הבנק)"
      endpoint="/api/erp/reports/revenue"
      mode="range"
    />
  );
}
