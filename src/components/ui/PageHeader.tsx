"use client";

import { clsx } from "clsx";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

// ============================================
// PAGE HEADER
// ============================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconBgColor?: string;
  backHref?: string;
  backLabel?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  iconBgColor = "bg-blue-100",
  backHref,
  backLabel = "חזרה",
  badge,
  actions,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div
      className={clsx(
        "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4",
        className,
      )}
    >
      <div>
        {backHref && (
          <button
            onClick={() => router.push(backHref)}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm">{backLabel}</span>
          </button>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {icon && (
            <div className={clsx("p-2 rounded-xl", iconBgColor)}>{icon}</div>
          )}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">{actions}</div>
      )}
    </div>
  );
}

// ============================================
// SECTION HEADER
// ============================================

interface SectionHeaderProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  count?: number;
  className?: string;
}

export function SectionHeader({
  title,
  icon,
  action,
  count,
  className,
}: SectionHeaderProps) {
  return (
    <div className={clsx("flex items-center justify-between mb-4", className)}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {count !== undefined && (
          <span className="text-sm text-gray-500">({count})</span>
        )}
      </div>
      {action}
    </div>
  );
}
