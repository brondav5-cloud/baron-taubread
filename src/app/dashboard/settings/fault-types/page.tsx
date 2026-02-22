"use client";

import { AlertTriangle } from "lucide-react";
import { FaultTypesList } from "@/components/settings/fault-types";

export default function FaultTypesSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">סוגי תקלות</h1>
            <p className="text-sm text-gray-500">
              נהל את סוגי התקלות ואחראי ברירת מחדל לכל סוג
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">מה זה סוגי תקלות?</p>
            <p className="text-blue-700">
              סוגי תקלות מאפשרים לסווג דיווחים לפי קטגוריה (תקלה טכנית, ניקיון,
              בטיחות וכו׳). לכל סוג ניתן להגדיר אחראי ברירת מחדל שייבחר אוטומטית
              בדיווח תקלה חדשה.
            </p>
          </div>
        </div>
      </div>

      <FaultTypesList />
    </div>
  );
}
