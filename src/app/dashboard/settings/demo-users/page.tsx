"use client";

import { Users } from "lucide-react";
import { DemoUsersList } from "@/components/settings/demo-users";

export default function DemoUsersSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">משתמשי דמו</h1>
          <p className="text-sm text-gray-500">
            עריכת שמות, תפקידים ומחלקות – מופיעים במשימות, תקלות והקצאות
          </p>
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          🎭 במצב דמו השמות האלה משמשים לבחירת מוקצים במשימות ותקלות. לחץ עריכה
          ליד כל משתמש כדי לשנות שם, תפקיד או מחלקה.
        </p>
      </div>
      <DemoUsersList />
    </div>
  );
}
