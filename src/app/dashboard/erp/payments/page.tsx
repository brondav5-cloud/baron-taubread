"use client";

import { ErpReportPage } from "@/components/erp/ErpReportPage";

export default function ErpPaymentsPage() {
  return (
    <ErpReportPage
      title="תקבולים"
      subtitle="כסף שהתקבל בקופה לפי Solvit"
      endpoint="/api/erp/reports/payments"
      mode="range"
    />
  );
}
