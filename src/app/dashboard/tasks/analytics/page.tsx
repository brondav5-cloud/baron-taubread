"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { BarChart3, ArrowRight } from "lucide-react";
import { useTasks } from "@/context/TasksContext";
import { useUsers } from "@/context/UsersContext";
import type { Task } from "@/types/task";
import {
  AnalyticsFilters,
  AnalyticsSummary,
  CategoryBreakdown,
  type CategoryStats,
  type MonthlyData,
} from "@/components/tasks/analytics";

const TasksTrendChart = dynamic(
  () => import("@/components/tasks/analytics/TasksTrendChart").then((m) => m.TasksTrendChart),
  { ssr: false },
);
import {
  createDateRange,
  type DateRange,
} from "@/components/ui/DateRangePicker";

// ============================================
// HELPER FUNCTIONS (outside component)
// ============================================

function getTasksInRange(tasks: Task[], from: Date, to: Date): Task[] {
  const fromTime = from.getTime();
  const toTime = to.getTime() + (24 * 60 * 60 * 1000 - 1); // סוף היום

  return tasks.filter((task) => {
    const taskTime = new Date(task.createdAt).getTime();
    return taskTime >= fromTime && taskTime <= toTime;
  });
}

function calculateStats(taskList: Task[]) {
  const completed = taskList.filter((t) => t.status === "approved").length;
  const overdue = taskList.filter((t) => {
    if (t.status === "approved") return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const completedTasks = taskList.filter((t) => t.status === "approved");
  let avgDays = 0;
  if (completedTasks.length > 0) {
    const totalDays = completedTasks.reduce((sum, task) => {
      const created = new Date(task.createdAt);
      const lastUpdate = new Date(task.updatedAt);
      const days =
        (lastUpdate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    avgDays = totalDays / completedTasks.length;
  }

  return { total: taskList.length, completed, overdue, avgDays };
}

function getPreviousRange(dateRange: DateRange): { from: Date; to: Date } {
  const rangeDays =
    Math.ceil(
      (dateRange.to.getTime() - dateRange.from.getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1;

  const prevTo = new Date(dateRange.from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - rangeDays + 1);

  return { from: prevFrom, to: prevTo };
}

function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getTasksForMonth(tasks: Task[], month: string): Task[] {
  return tasks.filter((task) => {
    const taskDate = new Date(task.createdAt);
    const taskMonth = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, "0")}`;
    return taskMonth === month;
  });
}

// ============================================
// COMPONENT
// ============================================

export default function TasksAnalyticsPage() {
  const { tasks } = useTasks();
  const { categories } = useUsers();

  // Default: this month
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    createDateRange("this_month"),
  );
  const [selectedCategory, setSelectedCategory] = useState("");

  // Main stats for selected range
  const rangeTasks = useMemo(() => {
    let filtered = getTasksInRange(tasks, dateRange.from, dateRange.to);
    if (selectedCategory) {
      filtered = filtered.filter((t) => t.categoryId === selectedCategory);
    }
    return filtered;
  }, [tasks, dateRange, selectedCategory]);

  const stats = useMemo(() => calculateStats(rangeTasks), [rangeTasks]);

  // Previous period comparison
  const comparisonPercent = useMemo(() => {
    const prevRange = getPreviousRange(dateRange);
    const prevTasks = getTasksInRange(tasks, prevRange.from, prevRange.to);
    if (prevTasks.length === 0) return undefined;
    return Math.round(
      ((rangeTasks.length - prevTasks.length) / prevTasks.length) * 100,
    );
  }, [tasks, dateRange, rangeTasks.length]);

  // Category breakdown
  const categoryStats: CategoryStats[] = useMemo(() => {
    const prevRange = getPreviousRange(dateRange);

    return categories
      .map((cat) => {
        const catTasks = rangeTasks.filter((t) => t.categoryId === cat.id);
        const catStats = calculateStats(catTasks);
        const prevCatTasks = getTasksInRange(
          tasks,
          prevRange.from,
          prevRange.to,
        ).filter((t) => t.categoryId === cat.id);

        return {
          categoryId: cat.id,
          categoryName: cat.name,
          categoryIcon: cat.icon,
          totalTasks: catStats.total,
          completedTasks: catStats.completed,
          overdueTasks: catStats.overdue,
          avgHandlingDays: catStats.avgDays,
          previousMonthTasks: prevCatTasks.length,
        };
      })
      .filter((c) => c.totalTasks > 0 || c.previousMonthTasks! > 0);
  }, [categories, rangeTasks, dateRange, tasks]);

  // Monthly trend data (last 6 months)
  const now = useMemo(() => new Date(), []);
  const trendData: MonthlyData[] = useMemo(() => {
    const months: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = formatMonth(date);
      const label = date.toLocaleDateString("he-IL", { month: "short" });
      const tasksForMonth = getTasksForMonth(tasks, month);
      const monthStats = calculateStats(tasksForMonth);

      months.push({
        month,
        label,
        total: monthStats.total,
        completed: monthStats.completed,
        overdue: monthStats.overdue,
      });
    }
    return months;
  }, [tasks, now]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-xl">
            <BarChart3 className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ניתוח משימות</h1>
            <p className="text-gray-500 text-sm">מעקב וניתוח ביצועים</p>
          </div>
        </div>
        <Link
          href="/dashboard/tasks"
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה למשימות
        </Link>
      </div>

      {/* Filters */}
      <AnalyticsFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Summary Cards */}
      <AnalyticsSummary
        totalTasks={stats.total}
        completedTasks={stats.completed}
        overdueTasks={stats.overdue}
        avgHandlingDays={stats.avgDays}
        comparisonPercent={comparisonPercent}
      />

      {/* Charts & Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TasksTrendChart data={trendData} />
        <CategoryBreakdown data={categoryStats} />
      </div>
    </div>
  );
}
