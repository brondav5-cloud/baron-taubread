"use client";

import { ListTodo } from "lucide-react";
import { CategoryList } from "@/components/settings/task-categories";

export default function TaskCategoriesSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <ListTodo className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              קטגוריות משימות
            </h1>
            <p className="text-sm text-gray-500">
              נהל את הקטגוריות שמופיעות ביצירת משימה חדשה
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">מה זה קטגוריות משימות?</p>
            <p className="text-blue-700">
              קטגוריות עוזרות לסווג משימות לפי נושא (מלאי, תמחור, משלוח וכו׳).
              לכל קטגוריה אפשר להגדיר אחראי ברירת מחדל שייבחר אוטומטית כשיוצרים
              משימה חדשה.
            </p>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <CategoryList />
    </div>
  );
}
