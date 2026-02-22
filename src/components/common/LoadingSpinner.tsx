"use client";

import { memo } from "react";
import { clsx } from "clsx";

// ============================================
// TYPES
// ============================================

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "white" | "gray";
  className?: string;
}

interface LoadingOverlayProps {
  message?: string;
  transparent?: boolean;
}

interface LoadingSkeletonProps {
  className?: string;
  animate?: boolean;
}

// ============================================
// SIZE CLASSES
// ============================================

const SIZE_CLASSES = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const BORDER_CLASSES = {
  sm: "border-2",
  md: "border-2",
  lg: "border-[3px]",
  xl: "border-4",
};

const COLOR_CLASSES = {
  primary: "border-primary-500 border-t-transparent",
  white: "border-white border-t-transparent",
  gray: "border-gray-400 border-t-transparent",
};

// ============================================
// LOADING SPINNER
// ============================================

function LoadingSpinnerComponent({
  size = "md",
  color = "primary",
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={clsx(
        "animate-spin rounded-full",
        SIZE_CLASSES[size],
        BORDER_CLASSES[size],
        COLOR_CLASSES[color],
        className,
      )}
      role="status"
      aria-label="טוען..."
    />
  );
}

export const LoadingSpinner = memo(LoadingSpinnerComponent);

// ============================================
// LOADING STATE (Full page or section)
// ============================================

interface LoadingStateProps {
  message?: string;
  size?: LoadingSpinnerProps["size"];
  className?: string;
}

function LoadingStateComponent({
  message = "טוען נתונים...",
  size = "lg",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center py-12",
        className,
      )}
    >
      <LoadingSpinner size={size} />
      {message && <p className="mt-4 text-gray-500 text-sm">{message}</p>}
    </div>
  );
}

export const LoadingState = memo(LoadingStateComponent);

// ============================================
// LOADING OVERLAY
// ============================================

function LoadingOverlayComponent({
  message,
  transparent = false,
}: LoadingOverlayProps) {
  return (
    <div
      className={clsx(
        "absolute inset-0 flex items-center justify-center z-50",
        transparent ? "bg-white/50" : "bg-white/80",
      )}
    >
      <div className="flex flex-col items-center">
        <LoadingSpinner size="xl" />
        {message && <p className="mt-4 text-gray-600 font-medium">{message}</p>}
      </div>
    </div>
  );
}

export const LoadingOverlay = memo(LoadingOverlayComponent);

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeletonComponent({
  className,
  animate = true,
}: LoadingSkeletonProps) {
  return (
    <div
      className={clsx(
        "bg-gray-200 rounded",
        animate && "animate-pulse",
        className,
      )}
    />
  );
}

export const LoadingSkeleton = memo(LoadingSkeletonComponent);

// ============================================
// SKELETON PRESETS
// ============================================

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-3">
        <LoadingSkeleton className="h-4 w-4" />
      </td>
      <td className="px-4 py-3">
        <LoadingSkeleton className="h-4 w-32 mb-1" />
        <LoadingSkeleton className="h-3 w-20" />
      </td>
      <td className="px-3 py-3">
        <LoadingSkeleton className="h-6 w-16 mx-auto rounded-full" />
      </td>
      <td className="px-3 py-3">
        <LoadingSkeleton className="h-4 w-12 mx-auto" />
      </td>
      <td className="px-3 py-3">
        <LoadingSkeleton className="h-4 w-12 mx-auto" />
      </td>
      <td className="px-3 py-3">
        <LoadingSkeleton className="h-4 w-12 mx-auto" />
      </td>
      <td className="px-3 py-3">
        <LoadingSkeleton className="h-4 w-12 mx-auto" />
      </td>
      <td className="px-2 py-3">
        <LoadingSkeleton className="h-4 w-4 mx-auto" />
      </td>
    </tr>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 w-10">
                <LoadingSkeleton className="h-4 w-4" />
              </th>
              <th className="px-4 py-3 text-right">
                <LoadingSkeleton className="h-4 w-16" />
              </th>
              <th className="px-3 py-3">
                <LoadingSkeleton className="h-4 w-12 mx-auto" />
              </th>
              <th className="px-3 py-3">
                <LoadingSkeleton className="h-4 w-12 mx-auto" />
              </th>
              <th className="px-3 py-3">
                <LoadingSkeleton className="h-4 w-12 mx-auto" />
              </th>
              <th className="px-3 py-3">
                <LoadingSkeleton className="h-4 w-12 mx-auto" />
              </th>
              <th className="px-3 py-3">
                <LoadingSkeleton className="h-4 w-12 mx-auto" />
              </th>
              <th className="px-2 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <LoadingSkeleton className="h-5 w-24" />
        <LoadingSkeleton className="h-8 w-8 rounded-full" />
      </div>
      <LoadingSkeleton className="h-8 w-32 mb-2" />
      <LoadingSkeleton className="h-4 w-20" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Table */}
      <TableSkeleton rows={8} />
    </div>
  );
}

// ============================================
// INLINE LOADING
// ============================================

export function InlineLoading({ text = "טוען..." }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-gray-500">
      <LoadingSpinner size="sm" />
      <span className="text-sm">{text}</span>
    </span>
  );
}

// ============================================
// BUTTON LOADING
// ============================================

interface ButtonLoadingProps {
  loading?: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function ButtonLoading({
  loading,
  children,
  loadingText = "טוען...",
}: ButtonLoadingProps) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-2">
        <LoadingSpinner size="sm" color="white" />
        <span>{loadingText}</span>
      </span>
    );
  }
  return <>{children}</>;
}

export default LoadingSpinner;
