import { NextRequest } from "next/server";
import { proxySolvitReport } from "@/lib/erp/solvit/proxyReport";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  return proxySolvitReport(request, "/mcp/aging", ["as_of_date"]);
}
