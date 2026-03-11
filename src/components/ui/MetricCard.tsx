import { clsx } from "clsx";
import { ReactNode } from "react";
import {
  getMetricColor,
  getMetricBgColor,
  formatPercent,
} from "@/lib/calculations";

// ============================================
// METRIC CARD
// ============================================

interface MetricCardProps {
  label: string;
  value: number | null | undefined;
  subtitle?: string;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
  showBackground?: boolean;
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  size = "md",
  showBackground = true,
  className,
  onClick,
}: MetricCardProps) {
  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const valueSizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <div
      className={clsx(
        "rounded-xl text-center transition-all",
        showBackground && getMetricBgColor(value),
        onClick && "cursor-pointer hover:shadow-md",
        sizeClasses[size],
        className,
      )}
      onClick={onClick}
    >
      {icon && <div className="mb-2">{icon}</div>}
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p
        className={clsx(
          "font-bold",
          valueSizeClasses[size],
          getMetricColor(value),
        )}
      >
        {formatPercent(value)}
      </p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// ============================================
// METRIC ROW (for inline display)
// ============================================

interface MetricRowProps {
  label: string;
  value: number | null | undefined;
  className?: string;
}

export function MetricRow({ label, value, className }: MetricRowProps) {
  return (
    <div className={clsx("flex items-center justify-between", className)}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className={clsx("font-bold", getMetricColor(value))}>
        {formatPercent(value)}
      </span>
    </div>
  );
}

// ============================================
// METRICS GRID (4 metrics in a row)
// ============================================

interface MetricsGridProps {
  metrics: {
    "12v12": number;
    "6v6": number;
    "3v3": number;
    "2v2": number;
  };
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MetricsGrid({
  metrics,
  size = "md",
  className,
}: MetricsGridProps) {
  return (
    <div className={clsx("grid grid-cols-4 gap-3", className)}>
      <MetricCard label="12v12" value={metrics["12v12"]} size={size} />
      <MetricCard label="6v6" value={metrics["6v6"]} size={size} />
      <MetricCard label="3v3" value={metrics["3v3"]} size={size} />
      <MetricCard label="2v2" value={metrics["2v2"]} size={size} />
    </div>
  );
}

// ============================================
// METRIC INFO (with description)
// ============================================

const METRIC_DESCRIPTIONS: Record<string, string> = {
  "12v12": "השוואת סך שנה קודמת מול שנה נוכחית",
  "6v6": "ינו-יונ מול יול-דצמ (H1 מול H2)",
  "3v3": "Q4 שנה קודמת מול Q4 שנה נוכחית",
  "2v2": "ספט-אוק מול נוב-דצמ",
  peak: "מרחק מממוצע 4 חודשים גבוהים",
  returns: "אחוז החזרות מהאספקה",
};

interface MetricWithInfoProps {
  metricKey: string;
  value: number | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MetricWithInfo({
  metricKey,
  value,
  size = "md",
  className,
}: MetricWithInfoProps) {
  const description = METRIC_DESCRIPTIONS[metricKey] || "";

  return (
    <MetricCard
      label={metricKey}
      value={value}
      subtitle={description}
      size={size}
      className={className}
    />
  );
}
