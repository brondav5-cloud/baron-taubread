"use client";

import {
  ArrowRight,
  Save,
  CheckCircle,
  Link as LinkIcon,
  Clock,
  ListTodo,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { useNewVisit } from "@/hooks/useNewVisit";
import { VisitPhotosSection } from "@/components/visits/VisitPhotosSection";
import { VisitCompetitorsSection } from "@/components/visits/VisitCompetitorsSection";

export default function NewVisitPage() {
  const [storeSearch, setStoreSearch] = useState("");
  const {
    allStores,
    store,
    isLoading,
    selectedStore,
    setSelectedStore,
    date,
    time,
    notes,
    setNotes,
    checklist,
    photos,
    competitors,
    isSubmitting,
    showSuccess,
    cameraInputRef,
    fileInputRef,
    toggleChecklistItem,
    openCamera,
    openFilePicker,
    handleFileChange,
    removePhoto,
    toggleCompetitor,
    updateCompetitorNotes,
    handleSubmit,
    handleSubmitAndCreateTask,
    goBack,
  } = useNewVisit();

  const filteredStores = useMemo(() => {
    const searchTerm = storeSearch.trim().toLowerCase();
    if (!searchTerm) return allStores;
    return allStores.filter((s) => {
      const name = s.name.toLowerCase();
      const city = (s.city ?? "").toLowerCase();
      const agent = (s.agent ?? "").toLowerCase();
      return (
        name.includes(searchTerm) ||
        city.includes(searchTerm) ||
        agent.includes(searchTerm)
      );
    });
  }, [allStores, storeSearch]);

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-scale-in">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          הביקור נשמר בהצלחה!
        </h2>
        <p className="text-gray-500">מעביר אותך לרשימת הביקורים...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowRight className="w-4 h-4" />
          <span className="text-sm">חזרה</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">ביקור חדש</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store & Date & Time */}
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">פרטי ביקור</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                בחר חנות *
              </label>
              <div className="relative mb-2">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  placeholder="חיפוש מהיר חנות..."
                  className="w-full pr-9 pl-9 py-2 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                />
                {storeSearch && (
                  <button
                    type="button"
                    onClick={() => setStoreSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="נקה חיפוש"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">בחר חנות...</option>
                {filteredStores.map((s) => (
                  <option key={s.id} value={s.id.toString()}>
                    {s.name} - {s.city}
                  </option>
                ))}
              </select>
              {storeSearch && filteredStores.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">לא נמצאו חנויות לחיפוש הזה</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תאריך *
              </label>
              <input
                type="date"
                value={date}
                readOnly
                required
                className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-sm cursor-default select-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4" /> שעה
              </label>
              <input
                type="time"
                value={time}
                readOnly
                className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-sm cursor-default select-none"
              />
            </div>
          </div>
          {store && (
            <div className="p-4 bg-primary-50 rounded-xl">
              <p className="font-medium text-primary-900">{store.name}</p>
              <p className="text-sm text-primary-700">
                {store.city} • {store.network || "עצמאי"} • {store.agent}
              </p>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">צ&apos;קליסט</h2>
            <Link
              href="/dashboard/settings/checklist"
              className="text-xs text-primary-600 hover:underline flex items-center gap-1"
            >
              <LinkIcon className="w-3 h-3" />
              ערוך צ&apos;קליסט
            </Link>
          </div>
          {checklist.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              לא הוגדרו פריטים בצ&apos;קליסט.{" "}
              <Link
                href="/dashboard/settings/checklist"
                className="text-primary-600 hover:underline"
              >
                הגדר
              </Link>
            </p>
          ) : (
            <div className="space-y-2">
              {checklist.map((item) => (
                <label
                  key={item.id}
                  className={clsx(
                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                    item.checked
                      ? "bg-green-50"
                      : "bg-gray-50 hover:bg-gray-100",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="w-5 h-5 rounded border-gray-300 text-green-600"
                  />
                  <span
                    className={clsx(
                      "text-sm",
                      item.checked ? "text-green-700" : "text-gray-700",
                    )}
                  >
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Photos */}
        <VisitPhotosSection
          photos={photos}
          cameraInputRef={cameraInputRef}
          fileInputRef={fileInputRef}
          onOpenCamera={openCamera}
          onOpenFilePicker={openFilePicker}
          onFileChange={handleFileChange}
          onRemovePhoto={removePhoto}
        />

        {/* Competitors */}
        <VisitCompetitorsSection
          competitors={competitors}
          onToggle={toggleCompetitor}
          onUpdateNotes={updateCompetitorNotes}
        />

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">הערות</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הערות נוספות על הביקור..."
            rows={4}
            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-1 gap-3">
            <button
              type="submit"
              disabled={!selectedStore || isSubmitting}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium",
                selectedStore && !isSubmitting
                  ? "bg-primary-500 text-white hover:bg-primary-600"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed",
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  שמור ביקור
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSubmitAndCreateTask}
              disabled={!selectedStore || isSubmitting}
              className={clsx(
                "flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium",
                selectedStore && !isSubmitting
                  ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed",
              )}
              title="שמור ביקור ועבור ליצירת משימה לחנות"
            >
              <ListTodo className="w-5 h-5" /> שמור ועבור למשימה
            </button>
          </div>
          <button
            type="button"
            onClick={goBack}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}
