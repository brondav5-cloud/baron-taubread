"use client";

import React from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  children: React.ReactNode;
  headerBg?: string;
  headerTextClass?: string;
  footer?: React.ReactNode;
}

const SIZE_MAP: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export default function ModalShell({
  isOpen,
  onClose,
  title,
  size = "lg",
  children,
  headerBg,
  headerTextClass = "text-gray-900",
  footer,
}: ModalShellProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={clsx(
          "relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col",
          SIZE_MAP[size] ?? "max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={clsx(
          "flex items-center justify-between p-4 border-b border-gray-100 shrink-0",
          headerBg,
        )}>
          <h2 className={clsx("text-lg font-bold", headerTextClass)}>{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">{children}</div>

        {footer && (
          <div className="border-t border-gray-100 p-4 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
