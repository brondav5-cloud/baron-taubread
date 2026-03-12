"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Plus,
  Filter,
  Clock,
  Phone,
  CheckCircle,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { clsx } from "clsx";

import {
  useTreatmentContext,
  type TreatmentStatus,
  type TreatmentReason,
  TREATMENT_STATUS_CONFIG,
} from "@/context/TreatmentContext";
import { useWorkPlan } from "@/hooks/useWorkPlan";
import {
  TreatmentStoreCard,
  AddToTreatmentModal,
  TreatmentHistorySection,
  ResolutionModal,
  AddToWorkPlanModal,
} from "@/components/treatment";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageHeader,
} from "@/components/ui";

export default function TreatmentPage() {
  const router = useRouter();
  const {
    stores,
    stats,
    isLoading,
    updateStoreStatus,
    removeStore,
    resolveStore,
    addStore,
    getStoreById,
  } = useTreatmentContext();

  const { addVisitFromTreatment } = useWorkPlan();

  // Filter state
  const [filterStatus, setFilterStatus] = useState<TreatmentStatus | "all">(
    "all",
  );
  const [showAddModal, setShowAddModal] = useState(false);

  // Resolution modal state
  const [resolvingStoreId, setResolvingStoreId] = useState<number | null>(null);
  const resolvingStore = resolvingStoreId
    ? getStoreById(resolvingStoreId)
    : null;

  // Work plan modal state
  const [workPlanStoreId, setWorkPlanStoreId] = useState<number | null>(null);
  const workPlanStore = workPlanStoreId ? getStoreById(workPlanStoreId) : null;

  // Filter stores
  const filteredStores = useMemo(() => {
    if (filterStatus === "all") return stores;
    return stores.filter((s) => s.treatmentStatus === filterStatus);
  }, [stores, filterStatus]);

  const handleAddStore = (
    storeId: number,
    reason: TreatmentReason,
    notes: string,
  ) => {
    addStore(storeId, reason, notes);
  };

  const handleResolve = (storeId: number) => {
    setResolvingStoreId(storeId);
  };

  const handleConfirmResolve = (resolutionNotes: string) => {
    if (resolvingStoreId) {
      resolveStore(resolvingStoreId, resolutionNotes);
      setResolvingStoreId(null);
    }
  };

  const handleAddToWorkPlan = (storeId: number) => {
    setWorkPlanStoreId(storeId);
  };

  const handleConfirmWorkPlan = (day: number, weekOffset: number) => {
    if (workPlanStoreId) {
      addVisitFromTreatment(workPlanStoreId, day, weekOffset);
      setWorkPlanStoreId(null);
      router.push(`/dashboard/work-plan?week=${weekOffset}`);
    }
  };

  const existingStoreIds = useMemo(() => stores.map((s) => s.id), [stores]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="חנויות בטיפול"
        subtitle={`${stats.total} חנויות נוספו ידנית לטיפול`}
        icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              הוסף חנות
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-medium hover:bg-green-200 transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
              ייצוא
            </button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setFilterStatus("all")}
          className={clsx(
            "p-4 rounded-xl text-center transition-all",
            filterStatus === "all"
              ? "ring-2 ring-gray-500 bg-gray-100"
              : "bg-gray-50 hover:bg-gray-100",
          )}
        >
          <AlertTriangle className="w-6 h-6 text-gray-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
          <p className="text-sm text-gray-600">סה״כ בטיפול</p>
        </button>
        <button
          onClick={() =>
            setFilterStatus(filterStatus === "pending" ? "all" : "pending")
          }
          className={clsx(
            "p-4 rounded-xl text-center transition-all",
            filterStatus === "pending"
              ? "ring-2 ring-gray-500 bg-gray-100"
              : "bg-gray-50 hover:bg-gray-100",
          )}
        >
          <Clock className="w-6 h-6 text-gray-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-700">{stats.pending}</p>
          <p className="text-sm text-gray-500">ממתין לטיפול</p>
        </button>
        <button
          onClick={() =>
            setFilterStatus(
              filterStatus === "in_progress" ? "all" : "in_progress",
            )
          }
          className={clsx(
            "p-4 rounded-xl text-center transition-all",
            filterStatus === "in_progress"
              ? "ring-2 ring-blue-500 bg-blue-50"
              : "bg-blue-50 hover:bg-blue-100",
          )}
        >
          <Phone className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
          <p className="text-sm text-blue-600">בטיפול</p>
        </button>
      </div>

      {/* Filter Bar */}
      {filterStatus !== "all" && (
        <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl">
          <Filter className="w-4 h-4 text-primary-600" />
          <span className="text-sm text-primary-700">
            מציג: {TREATMENT_STATUS_CONFIG[filterStatus].label}
          </span>
          <button
            onClick={() => setFilterStatus("all")}
            className="mr-auto flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <X className="w-4 h-4" />
            נקה סינון
          </button>
        </div>
      )}

      {/* Stores List */}
      <Card>
        <CardHeader>
          <CardTitle>רשימת חנויות ({filteredStores.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">טוען...</div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-12">
              {stats.total === 0 ? (
                <>
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">
                    אין חנויות בטיפול
                  </p>
                  <p className="text-gray-500 mb-4">
                    הוסף חנויות ידנית לרשימת הטיפול
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    הוסף חנות
                  </button>
                </>
              ) : (
                <>
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">
                    אין חנויות בסטטוס זה
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStores.map((store) => (
                <TreatmentStoreCard
                  key={store.id}
                  store={store}
                  onStatusChange={updateStoreStatus}
                  onRemove={removeStore}
                  onResolve={handleResolve}
                  onAddToWorkPlan={handleAddToWorkPlan}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment History */}
      <TreatmentHistorySection />

      {/* Add Store Modal */}
      {showAddModal && (
        <AddToTreatmentModal
          existingStoreIds={existingStoreIds}
          onAdd={handleAddStore}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Resolution Modal */}
      {resolvingStore && (
        <ResolutionModal
          storeName={resolvingStore.name}
          onConfirm={handleConfirmResolve}
          onCancel={() => setResolvingStoreId(null)}
        />
      )}

      {/* Add to Work Plan Modal */}
      {workPlanStore && (
        <AddToWorkPlanModal
          storeName={workPlanStore.name}
          onConfirm={handleConfirmWorkPlan}
          onCancel={() => setWorkPlanStoreId(null)}
        />
      )}
    </div>
  );
}
