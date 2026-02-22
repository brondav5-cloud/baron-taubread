"use client";

import Link from "next/link";
import { Users, Link as LinkIcon } from "lucide-react";
import { clsx } from "clsx";
import type { SelectedCompetitor } from "@/hooks/useNewVisit";

interface CompetitorsSectionProps {
  competitors: SelectedCompetitor[];
  onToggle: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

export function VisitCompetitorsSection({
  competitors,
  onToggle,
  onUpdateNotes,
}: CompetitorsSectionProps) {
  const selectedCount = competitors.filter((c) => c.selected).length;

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-gray-900">מתחרים בחנות</h2>
          {selectedCount > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              {selectedCount} נבחרו
            </span>
          )}
        </div>
        <Link
          href="/dashboard/settings/competitors"
          className="text-xs text-primary-600 hover:underline flex items-center gap-1"
        >
          <LinkIcon className="w-3 h-3" />
          ערוך רשימה
        </Link>
      </div>

      {competitors.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          לא הוגדרו מתחרים.{" "}
          <Link
            href="/dashboard/settings/competitors"
            className="text-primary-600 hover:underline"
          >
            הגדר עכשיו
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {competitors.map((comp) => (
              <button
                key={comp.id}
                type="button"
                onClick={() => onToggle(comp.id)}
                className={clsx(
                  "px-3 py-2 rounded-xl text-sm font-medium transition-colors border",
                  comp.selected
                    ? "bg-orange-100 border-orange-300 text-orange-700"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100",
                )}
              >
                {comp.selected && <span className="mr-1">✓</span>}
                {comp.name}
              </button>
            ))}
          </div>

          {selectedCount > 0 && (
            <div className="pt-3 border-t space-y-2">
              <p className="text-sm text-gray-600">הערות למתחרים שנבחרו:</p>
              {competitors
                .filter((c) => c.selected)
                .map((comp) => (
                  <div key={comp.id} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-orange-700 w-24 flex-shrink-0">
                      {comp.name}:
                    </span>
                    <input
                      type="text"
                      value={comp.notes}
                      onChange={(e) => onUpdateNotes(comp.id, e.target.value)}
                      placeholder="מחיר, מבצע, מיקום..."
                      className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm border-0 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
