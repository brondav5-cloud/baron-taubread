"use client";

import { ErpReportPage } from "@/components/erp/ErpReportPage";

export default function ErpActivityPage() {
  return (
    <ErpReportPage
      title="פעילות לקוחות"
      subtitle="לקוחות ללא הזמנה לאחרונה"
      endpoint="/api/erp/reports/activity"
      mode="activity"
    />
  );
}
