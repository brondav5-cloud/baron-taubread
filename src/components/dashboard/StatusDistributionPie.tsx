"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  STATUS_CARD_COLORS,
  STATUS_CHART_HEX,
  type StatusLong,
} from "@/types/data";

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
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
          <div className="w-36 h-36 sm:w-48 sm:h-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  dataKey="value"
                >
                  {data.map((item, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        STATUS_CHART_HEX[item.status as StatusLong] || "#6b7280"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 w-full grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
            {data.map((item) => (
              <Link
                key={item.status}
                href={`/dashboard/stores?status_long=${item.status}`}
                className={clsx(
                  "p-2 sm:p-3 rounded-xl text-center hover:shadow-md transition-all cursor-pointer",
                  STATUS_CARD_COLORS[item.status as StatusLong] || "bg-gray-100",
                )}
              >
                <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">
                  {item.value}
                </p>
                <p className="text-[10px] sm:text-xs">{item.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
