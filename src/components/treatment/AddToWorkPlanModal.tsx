"use client";

import { useState, useMemo } from "react";
import { X, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"];

function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + weekOffset * 7);

  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });
}

function formatDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatWeekRange(dates: Date[]): string {
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (!first || !last) return "";
  return `${formatDate(first)} - ${formatDate(last)}`;
}

interface AddToWorkPlanModalProps {
  storeName: string;
  onConfirm: (day: number, weekOffset: number) => void;
  onCancel: () => void;
}

export function AddToWorkPlanModal({
  storeName,
  onConfirm,
  onCancel,
}: AddToWorkPlanModalProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDay !== null) {
      onConfirm(selectedDay, weekOffset);
    }
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="p-5 border-b flex items-center justify-between bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-blue-800">
                הוסף ללוח עבודה
              </h3>
              <p className="text-sm text-blue-600">{storeName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-blue-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Week Selector */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="font-bold text-gray-900">
                {formatWeekRange(weekDates)}
              </p>
              <p className="text-sm text-gray-500">
                {weekOffset === 0
                  ? "השבוע"
                  : weekOffset > 0
                    ? `בעוד ${weekOffset} שבועות`
                    : `לפני ${Math.abs(weekOffset)} שבועות`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Day Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              בחר יום לביקור:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {DAYS.map((day, index) => {
                const date = weekDates[index];
                if (!date) return null;
                const today = isToday(date);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedDay(index)}
                    className={`py-4 px-3 rounded-xl text-sm font-medium transition-all border-2 ${
                      selectedDay === index
                        ? "bg-blue-500 text-white border-blue-500 shadow-lg scale-105"
                        : today
                          ? "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400"
                          : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-bold">{day}</div>
                    <div
                      className={`text-xs mt-1 ${selectedDay === index ? "text-blue-100" : "text-gray-500"}`}
                    >
                      {formatDate(date)}
                    </div>
                    {today && selectedDay !== index && (
                      <div className="text-xs text-blue-600 mt-1">היום</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={selectedDay === null}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              הוסף ללוח עבודה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
