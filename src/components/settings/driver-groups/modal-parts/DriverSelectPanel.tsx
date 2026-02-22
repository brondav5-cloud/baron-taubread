"use client";

import { X, Plus, Search } from "lucide-react";

interface DriverSelectPanelProps {
  selectedDrivers: string[];
  availableDrivers: string[];
  searchDriver: string;
  onSearchChange: (value: string) => void;
  onAddDriver: (driver: string) => void;
  onRemoveDriver: (driver: string) => void;
}

export function DriverSelectPanel({
  selectedDrivers,
  availableDrivers,
  searchDriver,
  onSearchChange,
  onAddDriver,
  onRemoveDriver,
}: DriverSelectPanelProps) {
  return (
    <div className="space-y-4">
      {/* Selected Drivers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          נהגים בקבוצה
        </label>
        {selectedDrivers.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">לא נבחרו נהגים</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedDrivers.map((driver) => (
              <span
                key={driver}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full"
              >
                {driver}
                <button
                  onClick={() => onRemoveDriver(driver)}
                  className="hover:bg-blue-100 rounded-full p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Add Drivers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          הוסף נהגים
        </label>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchDriver}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="חיפוש נהג..."
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
          {availableDrivers.length === 0 ? (
            <p className="text-sm text-gray-500 p-4 text-center">
              אין נהגים זמינים
            </p>
          ) : (
            availableDrivers.map((driver) => (
              <button
                key={driver}
                onClick={() => onAddDriver(driver)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-right border-b border-gray-100 last:border-0"
              >
                <span className="text-sm text-gray-700">{driver}</span>
                <Plus className="w-4 h-4 text-gray-400" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
