"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  X,
  Calendar,
  MapPin,
  User,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Users,
  FileText,
  ExternalLink,
  ListTodo,
} from "lucide-react";
import { clsx } from "clsx";
import { useVisits } from "@/context/VisitsContext";
import type { Visit } from "@/context/VisitsContext";
import { CreateTaskModal } from "@/components/tasks";

interface VisitDetailModalProps {
  visit: Visit;
  onClose: () => void;
}

export function VisitDetailModal({ visit, onClose }: VisitDetailModalProps) {
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const { stores: storesFromContext } = useVisits();
  const stores = storesFromContext.map((s) => ({
    id: s.external_id,
    name: s.name,
    city: s.city,
    agent: s.agent,
  }));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("he-IL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between bg-gradient-to-l from-primary-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-xl">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">תעודת ביקור</h3>
                <p className="text-sm text-gray-500">{visit.storeName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Store Info */}
            <div className="p-4 bg-gray-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <Link
                  href={`/dashboard/stores/${visit.storeId}`}
                  className="font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  {visit.storeName}
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <span
                  className={clsx(
                    "px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1",
                    visit.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  {visit.status === "completed" ? (
                    <>
                      <CheckCircle className="w-4 h-4" /> הושלם
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" /> טיוטה
                    </>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {visit.storeCity}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(visit.date)}
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {visit.agentName}
                </div>
              </div>
            </div>

            {/* Checklist */}
            {visit.checklist.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  צ׳קליסט
                </h4>
                <div className="grid gap-2">
                  {visit.checklist.map((item) => (
                    <div
                      key={item.id}
                      className={clsx(
                        "flex items-center gap-3 p-3 rounded-lg",
                        item.checked ? "bg-green-50" : "bg-gray-50",
                      )}
                    >
                      <div
                        className={clsx(
                          "w-5 h-5 rounded flex items-center justify-center flex-shrink-0",
                          item.checked
                            ? "bg-green-500 text-white"
                            : "border-2 border-gray-300",
                        )}
                      >
                        {item.checked && <CheckCircle className="w-3 h-3" />}
                      </div>
                      <span
                        className={clsx(
                          "text-sm",
                          item.checked ? "text-green-700" : "text-gray-600",
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {visit.notes && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">הערות</h4>
                <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                  {visit.notes}
                </p>
              </div>
            )}

            {/* Competitors */}
            {visit.competitors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-600" />
                  מתחרים שנצפו ({visit.competitors.length})
                </h4>
                <div className="grid gap-2">
                  {visit.competitors.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-3 bg-orange-50 rounded-lg border border-orange-100"
                    >
                      <p className="font-medium text-orange-700">{comp.name}</p>
                      {comp.notes && (
                        <p className="text-sm text-orange-600 mt-1">
                          {comp.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos */}
            {visit.photos.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  תמונות ({visit.photos.length})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {visit.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative"
                    >
                      {photo.url ? (
                        <Image
                          src={photo.url}
                          alt={photo.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center">
                          <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">
                            {photo.name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                נוצר: {new Date(visit.createdAt).toLocaleString("he-IL")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateTaskModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                >
                  <ListTodo className="w-4 h-4" />
                  צור משימה
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <CreateTaskModal
          isOpen={true}
          onClose={() => setShowCreateTaskModal(false)}
          storeId={visit.storeId}
          storeName={visit.storeName}
          visitId={visit.id}
          stores={stores}
        />
      )}
    </>
  );
}
