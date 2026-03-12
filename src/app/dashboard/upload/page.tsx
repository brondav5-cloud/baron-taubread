"use client";

import { useCallback } from "react";
import { Upload, FileSpreadsheet, Truck, BarChart3, CheckCircle, XCircle, Loader2, Clock, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { useUploadQueue, type QueueItem } from "@/hooks/useUploadQueue";
import { uploadProductDeliveryFile } from "@/hooks/useProductDeliveryUpload";
import { uploadSalesFile }           from "@/hooks/useDataUpload";
import { uploadDeliveryFile }        from "@/hooks/useDeliveryUpload";
import { UploadDropZone }            from "@/components/upload";
import { useState } from "react";

type UploadTab = "sales" | "deliveries" | "product-deliveries";

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<UploadTab>("product-deliveries");

  const productQueue  = useUploadQueue(uploadProductDeliveryFile);
  const salesQueue    = useUploadQueue(uploadSalesFile);
  const deliveryQueue = useUploadQueue(uploadDeliveryFile);

  const activeQueue =
    activeTab === "sales"              ? salesQueue
    : activeTab === "deliveries"       ? deliveryQueue
    : productQueue;

  const accentColor =
    activeTab === "sales"        ? "blue"
    : activeTab === "deliveries" ? "green"
    : "purple";

  const handleFilesSelect = useCallback(
    (files: File[]) => activeQueue.addFiles(files),
    [activeQueue],
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Upload className="w-7 h-7 text-blue-600" />
          העלאת נתונים
        </h1>
        <p className="text-gray-500 mt-1">גרור מספר קבצים בבת אחת — המערכת תעלה אותם אחד אחד אוטומטית</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          { id: "product-deliveries", label: "פירוט מוצרים", Icon: BarChart3,    color: "purple" },
          { id: "sales",              label: "נתוני מכירות",  Icon: FileSpreadsheet, color: "blue" },
          { id: "deliveries",         label: "תעודות משלוח",  Icon: Truck,        color: "green"  },
        ] as { id: UploadTab; label: string; Icon: React.ElementType; color: string }[]).map(({ id, label, Icon, color }) => {
          const q = id === "sales" ? salesQueue : id === "deliveries" ? deliveryQueue : productQueue;
          const total = q.items.length;
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                "flex items-center gap-2 px-5 py-3 font-medium transition-colors border-b-2 -mb-px text-sm",
                isActive
                  ? `text-${color}-600 border-${color}-600 bg-${color}-50`
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50",
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {total > 0 && (
                <span className={clsx(
                  "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                  isActive ? `bg-${color}-100 text-${color}-700` : "bg-gray-200 text-gray-600",
                )}>
                  {total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Drop Zone */}
      <UploadDropZone
        onFileSelect={(f) => activeQueue.addFiles([f])}
        onFilesSelect={handleFilesSelect}
        multiple
        disabled={false}
        accentColor={accentColor}
      />

      {/* Queue */}
      {activeQueue.items.length > 0 && (
        <QueuePanel
          queue={activeQueue}
          accentColor={accentColor}
        />
      )}

      {/* Instructions */}
      <TabInstructions tab={activeTab} />
    </div>
  );
}

// ============================================================
// QUEUE PANEL
// ============================================================

function QueuePanel({
  queue,
  accentColor,
}: {
  queue: ReturnType<typeof useUploadQueue>;
  accentColor: "blue" | "green" | "purple";
}) {
  const colors = {
    blue:   { header: "bg-blue-50 border-blue-200 text-blue-900",   btn: "text-blue-600 hover:text-blue-800" },
    green:  { header: "bg-green-50 border-green-200 text-green-900", btn: "text-green-600 hover:text-green-800" },
    purple: { header: "bg-purple-50 border-purple-200 text-purple-900", btn: "text-purple-600 hover:text-purple-800" },
  };
  const c = colors[accentColor];

  const total   = queue.items.length;
  const done    = queue.successCount + queue.errorCount;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className={clsx("px-4 py-3 border-b flex items-center justify-between", c.header)}>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">
            {queue.isRunning
              ? `מעלה... ${done}/${total}`
              : done === total
                ? `הושלם — ${queue.successCount} הצליחו${queue.errorCount > 0 ? `, ${queue.errorCount} נכשלו` : ""}`
                : `${total} קבצים בתור`}
          </span>
          {total > 1 && (
            <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-current rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {queue.successCount > 0 && (
            <button
              onClick={queue.clearCompleted}
              className={clsx("text-xs underline", c.btn)}
            >
              נקה שהושלמו
            </button>
          )}
          {!queue.isRunning && (
            <button
              onClick={queue.clearAll}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              נקה הכל
            </button>
          )}
        </div>
      </div>

      {/* File list */}
      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {queue.items.map((item) => (
          <QueueRow key={item.id} item={item} onRemove={queue.removeItem} />
        ))}
      </div>
    </div>
  );
}

function QueueRow({
  item,
  onRemove,
}: {
  item: QueueItem;
  onRemove: (id: string) => void;
}) {
  const sizeMB = (item.file.size / 1024 / 1024).toFixed(1);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
      {/* Status icon */}
      <div className="w-5 h-5 shrink-0">
        {item.status === "pending"    && <Clock      className="w-5 h-5 text-gray-400" />}
        {item.status === "processing" && <Loader2    className="w-5 h-5 text-blue-500 animate-spin" />}
        {item.status === "success"    && <CheckCircle className="w-5 h-5 text-green-500" />}
        {item.status === "error"      && <XCircle    className="w-5 h-5 text-red-500" />}
      </div>

      {/* File name + info */}
      <div className="flex-1 min-w-0">
        <p className={clsx(
          "text-sm font-medium truncate",
          item.status === "error" ? "text-red-700" : "text-gray-800",
        )}>
          {item.file.name}
        </p>
        {item.status === "error" && (
          <p className="text-xs text-red-500 mt-0.5 truncate">{item.error}</p>
        )}
        {item.status === "processing" && (
          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden w-full">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
        {item.status === "success" && !!item.stats && (
          <p className="text-xs text-green-600 mt-0.5">
            {formatStats(item.stats as Record<string, unknown>)}
          </p>
        )}
      </div>

      {/* Size */}
      <span className="text-xs text-gray-400 shrink-0">{sizeMB} MB</span>

      {/* Remove (only pending/error) */}
      {(item.status === "pending" || item.status === "error") && (
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 text-gray-300 hover:text-red-500 rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function formatStats(stats: unknown): string {
  if (!stats || typeof stats !== "object") return "";
  const s = stats as Record<string, unknown>;
  const parts: string[] = [];
  if (s.recordsUpserted)  parts.push(`${s.recordsUpserted} רשומות`);
  if (s.storesCount)      parts.push(`${s.storesCount} חנויות`);
  if (s.weeksCount)       parts.push(`${s.weeksCount} שבועות`);
  if (s.deliveriesCount)  parts.push(`${s.deliveriesCount} אספקות`);
  if (s.stores)           parts.push(`${s.stores} חנויות`);
  return parts.join(" · ");
}

// ============================================================
// TAB INSTRUCTIONS
// ============================================================

function TabInstructions({ tab }: { tab: UploadTab }) {
  if (tab === "product-deliveries") {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <h3 className="font-medium text-purple-900 mb-2">פירוט מוצרים — נתונים שבועיים</h3>
        <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
          <li>גרור את כל 12 הקבצים החודשיים בבת אחת — המערכת תעלה אוטומטית</li>
          <li>עמודות נדרשות: תאריך מסמך, מזהה לקוח, שם מוצר, כמות, החזרות, שבוע</li>
          <li>העלאה חוזרת של אותה תקופה מעדכנת ולא מכפילה</li>
          <li>תומך בקבצים גדולים — מעובד בדפדפן ונשלח בחתיכות</li>
        </ul>
      </div>
    );
  }
  if (tab === "sales") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-2">נתוני מכירות — נתונים חודשיים</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>גרור מספר קבצים חודשיים בבת אחת</li>
          <li>עמודות נדרשות: חודש ושנה, מזהה לקוח, שם לקוח, מוצר, כמות נטו, מכירות</li>
          <li>הנתונים מצטברים — חודש חדש מתווסף לקיים</li>
        </ul>
      </div>
    );
  }
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
      <h3 className="font-medium text-green-900 mb-2">תעודות משלוח</h3>
      <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
        <li>גרור מספר קבצים בבת אחת</li>
        <li>עמודות נדרשות: תאריך מסמך, מזהה לקוח, שם לקוח, ערך כספי (לפני מע"מ)</li>
        <li>רק שורות עם ערך כספי חיובי יילקחו</li>
      </ul>
    </div>
  );
}
