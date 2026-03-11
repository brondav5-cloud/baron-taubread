"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Bug, Settings, BarChart3 } from "lucide-react";
import { useFaults } from "@/context/FaultsContext";
import {
  FaultsList,
  CreateFaultModal,
  FaultDetailModal,
} from "@/components/faults";

export default function FaultsPage() {
  const { getVisibleFaults, isLoading } = useFaults();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFaultId, setSelectedFaultId] = useState<string | null>(null);

  const visibleFaults = getVisibleFaults();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Bug className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">תקלות</h1>
            <p className="text-sm text-gray-500">דיווח וניהול תקלות</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/faults/analytics"
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="ניתוח תקלות"
          >
            <BarChart3 className="w-4 h-4 text-gray-600" />
            <span className="hidden sm:inline text-sm font-medium text-gray-700">
              ניתוח
            </span>
          </Link>
          <Link
            href="/dashboard/settings/fault-types"
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="הגדרות סוגי תקלות"
          >
            <Settings className="w-4 h-4 text-gray-600" />
            <span className="hidden sm:inline text-sm text-gray-700">
              הגדרות
            </span>
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">דווח תקלה</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">טוען...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <FaultsList faults={visibleFaults} onFaultClick={(f) => setSelectedFaultId(f.id)} />
        </div>
      )}

      <CreateFaultModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <FaultDetailModal
        faultId={selectedFaultId}
        onClose={() => setSelectedFaultId(null)}
      />
    </div>
  );
}
