import { clsx } from "clsx";
import { ReactNode } from "react";
import type { StatusLong, StatusShort } from "@/types/data";
import {
  STATUS_COLORS_LONG,
  STATUS_COLORS_SHORT,
  STATUS_DISPLAY_LONG,
  STATUS_DISPLAY_SHORT,
} from "@/types/data";

// ============================================
// GENERIC BADGE
// ============================================

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "gray";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  gray: "bg-gray-100 text-gray-500",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  icon,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-medium",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

// ============================================
// STATUS BADGE (Long Term)
// ============================================

const statusIcons: Record<StatusLong, string> = {
  עליה_חדה: "🚀",
  צמיחה: "📈",
  יציב: "➡️",
  ירידה: "📉",
  התרסקות: "⚠️",
};

interface StatusBadgeLongProps {
  status: StatusLong;
  size?: BadgeSize;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadgeLong({
  status,
  size = "md",
  showIcon = true,
  className,
}: StatusBadgeLongProps) {
  const colors = STATUS_COLORS_LONG[status];
  const label = STATUS_DISPLAY_LONG[status];
  const icon = statusIcons[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-medium",
        colors.bg,
        colors.text,
        sizeClasses[size],
        className,
      )}
    >
      {showIcon && <span>{icon}</span>}
      {label}
    </span>
  );
}

// ============================================
// STATUS BADGE (Short Term)
// ============================================

const statusIconsShort: Record<StatusShort, string> = {
  עליה_חדה: "🚀",
  יציב: "➡️",
  ירידה: "📉",
  אזעקה: "🚨",
};

interface StatusBadgeShortProps {
  status: StatusShort;
  size?: BadgeSize;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadgeShort({
  status,
  size = "md",
  showIcon = true,
  className,
}: StatusBadgeShortProps) {
  const colors = STATUS_COLORS_SHORT[status];
  const label = STATUS_DISPLAY_SHORT[status];
  const icon = statusIconsShort[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-medium",
        colors.bg,
        colors.text,
        sizeClasses[size],
        className,
      )}
    >
      {showIcon && <span>{icon}</span>}
      {label}
    </span>
  );
}

// ============================================
// METRIC BADGE (colored by value)
// ============================================

interface MetricBadgeProps {
  value: number;
  showSign?: boolean;
  size?: BadgeSize;
  className?: string;
}

export function MetricBadge({
  value,
  showSign = true,
  size = "md",
  className,
}: MetricBadgeProps) {
  const getVariant = (): BadgeVariant => {
    if (value >= 10) return "success";
    if (value >= 0) return "info";
    if (value >= -10) return "gray";
    if (value >= -20) return "warning";
    return "error";
  };

  const sign = showSign && value > 0 ? "+" : "";

  return (
    <Badge variant={getVariant()} size={size} className={className}>
      {sign}
      {value.toFixed(1)}%
    </Badge>
  );
}
