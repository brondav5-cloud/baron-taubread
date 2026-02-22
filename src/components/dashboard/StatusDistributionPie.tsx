"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

const DASHBOARD_CHART_COLORS = [
  "#10b981",
  "#84cc16",
  "#6b7280",
  "#f59e0b",
  "#ef4444",
];

const STATUS_ICONS: Record<string, string> = {
  עליה_חדה: "🚀",
  צמיחה: "📈",
  יציב: "➡️",
  ירידה: "📉",
  התרסקות: "🔴",
};

const STATUS_CARD_COLORS: Record<string, string> = {
  עליה_חדה: "bg-emerald-100 text-emerald-800",
  צמיחה: "bg-lime-100 text-lime-800",
  יציב: "bg-gray-100 text-gray-800",
  ירידה: "bg-amber-100 text-amber-800",
  התרסקות: "bg-red-100 text-red-800",
};

interface StatusDistributionItem {
  name: string;
  value: number;
  status: string;
}

interface StatusDistributionPieProps {
  data: StatusDistributionItem[];
}

export function StatusDistributionPie({ data }: StatusDistributionPieProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>התפלגות סטטוסים</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <div className="w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        DASHBOARD_CHART_COLORS[
                          index % DASHBOARD_CHART_COLORS.length
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {data.map((item) => (
              <Link
                key={item.status}
                href={`/dashboard/stores?status_long=${item.status}`}
                className={clsx(
                  "p-3 rounded-xl text-center hover:shadow-md transition-all cursor-pointer",
                  STATUS_CARD_COLORS[item.status] || "bg-gray-100",
                )}
              >
                <span className="text-xl">
                  {STATUS_ICONS[item.status] || "❓"}
                </span>
                <p className="text-2xl font-bold mt-1">{item.value}</p>
                <p className="text-xs">{item.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
