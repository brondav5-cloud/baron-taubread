"use client";

import { CheckCircle } from "lucide-react";
import { FaultStatusesList } from "@/components/settings/fault-statuses";

export default function FaultStatusesSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">סטטוסי תקלות</h1>
            <p className="text-sm text-gray-500">
              נהל את הסטטוסים שמציינים את מצב התקלה (חדש, בטיפול, נפתר וכו׳)
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">מה זה סטטוסי תקלות?</p>
            <p className="text-blue-700">
              הסטטוסים מציינים את מצב הטיפול בתקלה. סטטוס סופי (נסגר, נפתר) מסמן
              שהתקלה הסתיימה. ניתן לערוך את הסטטוסים בהתאם לצרכי הארגון.
            </p>
          </div>
        </div>
      </div>

      <FaultStatusesList />
    </div>
  );
}
