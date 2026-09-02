"use client";

import { ErpReportPage } from "@/components/erp/ErpReportPage";

export default function ErpDebtsPage() {
  return (
    <ErpReportPage
      title="חובות"
      subtitle="יתרות לקוחות מתוכנת האם"
      endpoint="/api/erp/reports/debts"
      mode="asOf"
    />
  );
}
