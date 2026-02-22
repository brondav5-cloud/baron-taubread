import { clsx } from "clsx";
import { ReactNode } from "react";

// ============================================
// STAT CARD (with icon)
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  subtitle?: string;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  icon,
  iconBgColor = "bg-blue-100",
  iconColor = "text-blue-600",
  subtitle,
  trend,
  className,
  onClick,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-2xl shadow-card p-4 flex items-center gap-3",
        onClick && "cursor-pointer hover:shadow-lg transition-shadow",
        className,
      )}
      onClick={onClick}
    >
      {icon && (
        <div className={clsx("p-2 rounded-lg", iconBgColor)}>
          <span className={iconColor}>{icon}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="font-semibold text-gray-900 truncate">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 truncate">{subtitle}</p>
        )}
      </div>
      {trend && (
        <div
          className={clsx(
            "text-xs font-medium",
            trend.value >= 0 ? "text-green-600" : "text-red-600",
          )}
        >
          {trend.value > 0 ? "+" : ""}
          {trend.value.toFixed(1)}%
          {trend.label && (
            <span className="text-gray-400 mr-1">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// INFO CARD (simple label-value)
// ============================================

interface InfoCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  className?: string;
}

export function InfoCard({
  label,
  value,
  icon,
  iconBgColor = "bg-gray-100",
  iconColor = "text-gray-600",
  className,
}: InfoCardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-2xl shadow-card p-4 flex items-center gap-3",
        className,
      )}
    >
      {icon && (
        <div className={clsx("p-2 rounded-lg", iconBgColor)}>
          <span className={iconColor}>{icon}</span>
        </div>
      )}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// ============================================
// LARGE STAT (for prominent display)
// ============================================

interface LargeStatProps {
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

export function LargeStat({
  label,
  value,
  subtitle,
  className,
}: LargeStatProps) {
  return (
    <div className={clsx("text-center p-4 bg-gray-50 rounded-xl", className)}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// ============================================
// STAT ROW (horizontal key-value)
// ============================================

interface StatRowProps {
  label: string;
  value: string | number;
  valueColor?: string;
  className?: string;
}

export function StatRow({
  label,
  value,
  valueColor = "text-gray-900",
  className,
}: StatRowProps) {
  return (
    <div className={clsx("flex items-center justify-between py-2", className)}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className={clsx("font-medium", valueColor)}>{value}</span>
    </div>
  );
}
