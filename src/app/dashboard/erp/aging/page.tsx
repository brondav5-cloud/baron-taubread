"use client";

import { ErpReportPage } from "@/components/erp/ErpReportPage";

export default function ErpAgingPage() {
  return (
    <ErpReportPage
      title="גיול חובות"
      subtitle="פיזור חוב לפי חודשים"
      endpoint="/api/erp/reports/aging"
      mode="asOf"
    />
  );
}
