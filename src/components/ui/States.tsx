import { clsx } from "clsx";
import { ReactNode } from "react";
import { Inbox, AlertCircle, Search, FileX } from "lucide-react";

// ============================================
// EMPTY STATE
// ============================================

type EmptyStateVariant = "default" | "search" | "error" | "noData";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const variantConfig: Record<
  EmptyStateVariant,
  { icon: ReactNode; title: string; description: string }
> = {
  default: {
    icon: <Inbox className="w-12 h-12 text-gray-300" />,
    title: "אין נתונים",
    description: "לא נמצאו פריטים להצגה",
  },
  search: {
    icon: <Search className="w-12 h-12 text-gray-300" />,
    title: "לא נמצאו תוצאות",
    description: "נסה לשנות את מילות החיפוש או את הסינון",
  },
  error: {
    icon: <AlertCircle className="w-12 h-12 text-red-300" />,
    title: "שגיאה בטעינת הנתונים",
    description: "אירעה שגיאה, נסה לרענן את הדף",
  },
  noData: {
    icon: <FileX className="w-12 h-12 text-gray-300" />,
    title: "אין נתונים זמינים",
    description: "הנתונים עדיין לא הועלו למערכת",
  },
};

export function EmptyState({
  variant = "default",
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];

  return (
    <div className={clsx("p-12 text-center", className)}>
      <div className="flex justify-center mb-4">{icon || config.icon}</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title || config.title}
      </h3>
      <p className="text-gray-500 mb-4">{description || config.description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============================================
// LOADING STATE
// ============================================

interface LoadingStateProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function LoadingState({
  text = "טוען...",
  size = "md",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center p-8",
        className,
      )}
    >
      <div
        className={clsx(
          "animate-spin rounded-full border-4 border-gray-200 border-t-primary-500",
          sizeClasses[size],
        )}
      />
      {text && <p className="text-gray-500 mt-4">{text}</p>}
    </div>
  );
}

// ============================================
// SKELETON LOADER
// ============================================

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={clsx(
        "bg-gray-200 animate-pulse",
        variantClasses[variant],
        className,
      )}
      style={{
        width: width || (variant === "circular" ? height : "100%"),
        height: height || (variant === "text" ? undefined : "100%"),
      }}
    />
  );
}

// ============================================
// NOTE: TableSkeleton and CardSkeleton are exported from
// @/components/common/LoadingSpinner for consistency
// ============================================
