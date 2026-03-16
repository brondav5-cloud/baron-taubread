"use client";

import { useEffect, useRef, useState } from "react";
import { X, FileText, FileSpreadsheet, File, Download, Trash2 } from "lucide-react";
import { useFaults } from "@/context/FaultsContext";
import type { FaultDocument } from "@/lib/supabase/faults.queries";
import { useUsers } from "@/context/UsersContext";

interface FaultDetailModalProps {
  faultId: string | null;
  onClose: () => void;
}

function getDocIcon(type: string) {
  if (type.includes("pdf")) return <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />;
  if (type.includes("word") || type.includes("document"))
    return <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  if (type.includes("excel") || type.includes("spreadsheet") || type.includes("csv"))
    return <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />;
  return <File className="w-4 h-4 text-gray-500 flex-shrink-0" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  gray: "bg-gray-100 text-gray-700",
  purple: "bg-purple-100 text-purple-700",
  pink: "bg-pink-100 text-pink-700",
};

export function FaultDetailModal({ faultId, onClose }: FaultDetailModalProps) {
  const { faults, faultStatuses, updateFaultStatus, deleteFault, markFaultViewed, addComment, canComment } =
    useFaults();
  const { currentUser } = useUsers();
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{
    kind: "image" | "pdf";
    url: string;
    name: string;
    downloadUrl: string;
    isObjectUrl?: boolean;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Always get the LIVE fault from context — realtime updates are reflected automatically
  const fault = faults.find((f) => f.id === faultId) ?? null;

  // Track which fault ID we already marked as viewed so we only fire once per open
  const viewedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!faultId || viewedRef.current === faultId) return;
    viewedRef.current = faultId;
    markFaultViewed(faultId);
  }, [faultId, markFaultViewed]);

  // Reset comment input when the modal opens for a different fault
  useEffect(() => {
    setCommentText("");
    if (preview?.isObjectUrl) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(false);
    // Intentionally depends on fault switch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faultId]);

  if (!faultId || !fault) return null;

  const activeStatuses = faultStatuses
    .filter((s) => s.is_active)
    .sort((a, b) => a.order - b.order);
  const canWriteComment = canComment(fault);
  const canDeleteFault =
    currentUser.role === "admin" || currentUser.role === "super_admin";

  const handleStatusChange = async (statusId: string) => {
    setSaving(true);
    const ok = await updateFaultStatus(fault.id, statusId);
    setSaving(false);
    if (ok) {
      const status = faultStatuses.find((s) => s.id === statusId);
      if (status?.is_final) {
        onClose();
      }
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSaving(true);
    await addComment(fault.id, commentText.trim());
    setCommentText("");
    setSaving(false);
  };

  const handleDeleteFault = async () => {
    if (!canDeleteFault) return;
    const confirmed = window.confirm("למחוק את התקלה לצמיתות?");
    if (!confirmed) return;

    setSaving(true);
    const ok = await deleteFault(fault.id);
    setSaving(false);
    if (ok) {
      onClose();
      return;
    }
    window.alert("מחיקת התקלה נכשלה. נסה שוב.");
  };

  const assigneeDisplay =
    fault.assignedToNames.length > 0
      ? fault.assignedToNames.join(", ")
      : fault.assignedToName || "—";

  const isPdfDoc = (doc: FaultDocument): boolean => {
    const name = doc.name.toLowerCase();
    const type = doc.type.toLowerCase();
    return name.endsWith(".pdf") || type.includes("pdf");
  };

  const closePreview = () => {
    if (preview?.isObjectUrl) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(false);
  };

  const openPdfPreview = async (doc: FaultDocument) => {
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(doc.url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (preview?.isObjectUrl) URL.revokeObjectURL(preview.url);
      setPreview({
        kind: "pdf",
        url: blobUrl,
        name: doc.name,
        downloadUrl: doc.url,
        isObjectUrl: true,
      });
    } catch (err) {
      console.error("[FaultDetailModal] PDF preview failed:", err);
      setPreview({
        kind: "pdf",
        url: doc.url,
        name: doc.name,
        downloadUrl: doc.url,
      });
      setPreviewError("לא ניתן להציג תצוגה מקדימה לקובץ הזה בדפדפן.");
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{fault.typeIcon || "⚠️"}</span>
            <h2 className="text-lg font-bold text-gray-900">{fault.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {canDeleteFault && (
              <button
                type="button"
                onClick={handleDeleteFault}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                title="מחק תקלה"
              >
                <Trash2 className="w-4 h-4" />
                מחיקה
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-sm font-medium ${COLOR_MAP[fault.statusColor ?? "gray"] ?? "bg-gray-100 text-gray-700"}`}
            >
              {fault.statusName}
            </span>
            <span className="px-2.5 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              {fault.typeIcon} {fault.typeName}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">דווח על ידי:</span>
              <p className="font-medium">{fault.reportedByName}</p>
            </div>
            <div>
              <span className="text-gray-500">
                {fault.assignedToNames.length > 1 ? "מוקצה אל:" : "מוקצה אל:"}
              </span>
              <p className="font-medium">{assigneeDisplay}</p>
            </div>
          </div>

          {fault.description && (
            <div>
              <span className="text-gray-500 text-sm">תיאור:</span>
              <p className="mt-1">{fault.description}</p>
            </div>
          )}

          {fault.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {fault.photos.map((url, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() =>
                    setPreview({
                      kind: "image",
                      url,
                      name: `photo-${i + 1}.jpg`,
                      downloadUrl: url,
                    })
                  }
                  className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="object-cover w-full h-full hover:scale-105 transition-transform"
                  />
                </button>
              ))}
            </div>
          )}

          {fault.documents && fault.documents.length > 0 && (
            <div>
              <span className="text-gray-500 text-sm block mb-1.5">מסמכים מצורפים:</span>
              <div className="space-y-1.5">
                {fault.documents.map((doc: FaultDocument) => (
                  <button
                    type="button"
                    key={doc.path}
                    onClick={() => {
                      if (isPdfDoc(doc)) {
                        void openPdfPreview(doc);
                        return;
                      }
                      window.open(doc.url, "_blank", "noopener,noreferrer");
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg transition-colors group"
                  >
                    {getDocIcon(doc.type)}
                    <span className="flex-1 text-sm text-gray-800 truncate group-hover:text-blue-700">
                      {doc.name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatSize(doc.size)}
                    </span>
                    <a
                      href={doc.url}
                      download={doc.name}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex"
                      title="הורד קובץ"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    </a>
                  </button>
                ))}
              </div>
            </div>
          )}

          {canWriteComment && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                עדכון סטטוס
              </label>
              <div className="flex flex-wrap gap-2">
                {activeStatuses.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStatusChange(s.id)}
                    disabled={saving || fault.statusId === s.id}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${fault.statusId === s.id ? "ring-2 ring-primary-500" : "hover:bg-gray-100"} ${COLOR_MAP[s.color] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {s.name}
                    {s.is_final && (
                      <span className="mr-1 text-xs opacity-60">✓</span>
                    )}
                  </button>
                ))}
              </div>
              {activeStatuses.some((s) => s.is_final && fault.statusId !== s.id) && (
                <p className="text-xs text-gray-400 mt-1">
                  סטטוס עם ✓ יסגור את החלון אוטומטית
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              הערות
            </label>
            {fault.comments.length === 0 ? (
              <p className="text-gray-500 text-sm">אין הערות</p>
            ) : (
              <div className="space-y-2">
                {fault.comments.map((c) => (
                  <div key={c.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">
                      {c.userName}
                      {c.userId === currentUser.id && (
                        <span className="text-xs text-gray-400 mr-1">(אתה)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700 mt-0.5">{c.text}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(c.createdAt).toLocaleString("he-IL")}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {canWriteComment && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="הוסף הערה..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  שליחה
                </button>
              </div>
            )}
          </div>

          {fault.history.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                היסטוריה
              </label>
              <div className="space-y-1 text-sm text-gray-600">
                {fault.history
                  .slice()
                  .reverse()
                  .map((h) => (
                    <p key={h.id}>
                      {h.userName}: {h.details || h.action} –{" "}
                      {new Date(h.timestamp).toLocaleString("he-IL")}
                    </p>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={closePreview}
          />
          <div className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-800 truncate">
                {preview.name}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={preview.downloadUrl}
                  download={preview.name}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  הורדה
                </a>
                <button
                  type="button"
                  onClick={closePreview}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="bg-gray-100 h-[80vh]">
              {previewError && (
                <div className="px-4 py-3 text-sm text-amber-700 bg-amber-50 border-b border-amber-200">
                  {previewError}
                </div>
              )}
              {previewLoading ? (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  טוען תצוגה מקדימה...
                </div>
              ) : preview.kind === "pdf" ? (
                <iframe
                  src={`${preview.url}#toolbar=1&navpanes=0&view=FitH`}
                  title={preview.name}
                  className="w-full h-full"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
