"use client";

import { useState, useEffect } from "react";
import { FileText, X, CheckCircle } from "lucide-react";

export interface PdfSection {
  id: string;
  label: string;
  defaultChecked?: boolean;
}

interface PdfReportModalProps {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  onClose: () => void;
}

export function PdfReportModal({
  title,
  subtitle,
  sections,
  onClose,
}: PdfReportModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(sections.filter((s) => s.defaultChecked !== false).map((s) => s.id)),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(sections.map((s) => s.id)));
  const clearAll = () => setSelected(new Set());

  const handlePrint = () => {
    // Hide unselected sections
    sections.forEach((section) => {
      const el = document.getElementById(`pdf-section-${section.id}`);
      if (el) {
        if (!selected.has(section.id)) {
          el.classList.add("pdf-section-hidden");
        } else {
          el.classList.remove("pdf-section-hidden");
        }
      }
    });

    // Set print date on body
    document.body.setAttribute(
      "data-print-date",
      new Date().toLocaleDateString("he-IL"),
    );

    // Close modal before printing
    onClose();

    // Defer print so modal disappears first
    setTimeout(() => {
      window.print();
      // Restore after print
      sections.forEach((section) => {
        const el = document.getElementById(`pdf-section-${section.id}`);
        if (el) el.classList.remove("pdf-section-hidden");
      });
    }, 150);
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">הפקת דוח PDF</h2>
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Report title preview */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs text-gray-500 mb-1">כותרת הדוח</p>
          <p className="font-semibold text-gray-800">{title}</p>
        </div>

        {/* Sections */}
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">
              בחר חלקים לכלול בדוח
            </p>
            <div className="flex gap-2 text-xs">
              <button
                onClick={selectAll}
                className="text-blue-600 hover:text-blue-800"
              >
                בחר הכל
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearAll}
                className="text-gray-500 hover:text-gray-700"
              >
                נקה הכל
              </button>
            </div>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {sections.map((section) => {
              const isChecked = selected.has(section.id);
              return (
                <button
                  key={section.id}
                  onClick={() => toggle(section.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-right"
                >
                  {isChecked ? (
                    <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                  )}
                  <span
                    className={
                      isChecked ? "text-gray-900" : "text-gray-400"
                    }
                  >
                    {section.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-gray-50 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            {selected.size} מתוך {sections.length} חלקים נבחרו
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={handlePrint}
              disabled={selected.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              הדפס PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
