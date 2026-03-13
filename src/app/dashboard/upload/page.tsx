"use client";

import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, Truck, BarChart3, CheckCircle, XCircle, Loader2, Clock, Trash2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";
import { useUploadQueue, type QueueItem } from "@/hooks/useUploadQueue";
import { uploadProductDeliveryFile } from "@/hooks/useProductDeliveryUpload";
import { uploadSalesFile }           from "@/hooks/useDataUpload";
import { uploadDeliveryFile }        from "@/hooks/useDeliveryUpload";
import { UploadDropZone }            from "@/components/upload";

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
  const [expanded, setExpanded] = useState(false);
  const sizeMB = (item.file.size / 1024 / 1024).toFixed(1);
  const s = item.stats as Record<string, unknown> | null | undefined;
  const hasWarning = s && (
    (s.validation as Record<string, unknown> | undefined)?.status === "warning" ||
    (s.dbVerification as Record<string, unknown> | undefined)?.status === "warning"
  );

  return (
    <div className={clsx(
      "px-4 py-2.5 hover:bg-gray-50",
      hasWarning && item.status === "success" ? "bg-amber-50 hover:bg-amber-50" : "",
    )}>
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div className="w-5 h-5 shrink-0">
          {item.status === "pending"    && <Clock       className="w-5 h-5 text-gray-400" />}
          {item.status === "processing" && <Loader2     className="w-5 h-5 text-blue-500 animate-spin" />}
          {item.status === "success" && !hasWarning && <CheckCircle className="w-5 h-5 text-green-500" />}
          {item.status === "success" && hasWarning  && <AlertTriangle className="w-5 h-5 text-amber-500" />}
          {item.status === "error"      && <XCircle     className="w-5 h-5 text-red-500" />}
        </div>

        {/* File name + info */}
        <div className="flex-1 min-w-0">
          <p className={clsx(
            "text-sm font-medium truncate",
            item.status === "error"   ? "text-red-700"
            : hasWarning              ? "text-amber-800"
            : "text-gray-800",
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

          {item.status === "success" && !!s && (
            <p className={clsx("text-xs mt-0.5", hasWarning ? "text-amber-700" : "text-green-600")}>
              {formatStatsSummary(s)}
            </p>
          )}
        </div>

        {/* Size */}
        <span className="text-xs text-gray-400 shrink-0">{sizeMB} MB</span>

        {/* Expand/collapse for success items */}
        {item.status === "success" && !!s && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded shrink-0"
            title="פרטים"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Remove (only pending/error) */}
        {(item.status === "pending" || item.status === "error") && (
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 text-gray-300 hover:text-red-500 rounded shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Expanded details panel */}
      {item.status === "success" && expanded && !!s && (
        <StatsDetail stats={s} />
      )}
    </div>
  );
}

// One-line summary shown inline
function formatStatsSummary(s: Record<string, unknown>): string {
  const parts: string[] = [];
  const stores = s.stores ?? s.storesCount;
  if (stores)               parts.push(`${stores} חנויות`);
  if (s.weeksCount)         parts.push(`${s.weeksCount} שבועות`);
  if (s.store_products_upserted) parts.push(`${s.store_products_upserted} רצועות`);
  if (s.recordsUpserted)    parts.push(`${s.recordsUpserted} רשומות`);
  if (s.deliveriesCount)    parts.push(`${s.deliveriesCount} אספקות`);
  const validation = s.validation as Record<string, unknown> | undefined;
  const dbVerif = s.dbVerification as Record<string, unknown> | undefined;
  const hasIssue = validation?.status === "warning" || dbVerif?.status === "warning";
  if (hasIssue)             parts.push("⚠ נמצא פער — לחץ לפרטים");
  return parts.join(" · ");
}

// Expanded details panel
function StatsDetail({ stats: s }: { stats: Record<string, unknown> }) {
  const validation = s.validation as Record<string, unknown> | undefined;
  const dbVerif    = s.dbVerification as Record<string, unknown> | undefined;

  const fmt = (n: unknown) =>
    typeof n === "number" ? Math.round(n).toLocaleString("he-IL") : "—";

  return (
    <div className="mt-2 ms-8 rounded-lg border border-gray-100 bg-white text-xs divide-y divide-gray-100">

      {/* Quantities section */}
      <div className="px-3 py-2 grid grid-cols-2 gap-x-6 gap-y-1">
        <span className="text-gray-500">שורות בקובץ</span>
        <span className="font-medium text-gray-800">{fmt(s.clientRowsCount ?? s.rowsProcessed ?? s.rowsCount)}</span>

        {(s.clientRowsSkipped != null ? Number(s.clientRowsSkipped) : Number(s.rowsSkipped ?? 0)) > 0 && (
          <>
            <span className="text-gray-500">שורות דחויות (client)</span>
            <span className="font-medium text-amber-700">
              {fmt(s.clientRowsSkipped ?? s.rowsSkipped)}
              {s.clientSkipReasons != null && typeof s.clientSkipReasons === "object" && Object.keys(s.clientSkipReasons as Record<string, number>).length > 0 && (
                <span className="text-gray-400 font-normal ms-1">
                  ({Object.entries(s.clientSkipReasons as Record<string, number>)
                    .map(([r, n]) => `${r === "no_period" ? "תאריך חסר" : r === "no_id" ? "מזהה חסר" : r}: ${n}`)
                    .join(", ")})
                </span>
              )}
            </span>
          </>
        )}

        {s.rejectedRows != null && Number(s.rejectedRows) > 0 && (
          <>
            <span className="text-gray-500">רצועות שנדחו</span>
            <span className="font-medium text-amber-700">{fmt(s.rejectedRows)}</span>
          </>
        )}

        <span className="text-gray-500">חנויות</span>
        <span className="font-medium text-gray-800">{fmt(s.stores ?? s.storesCount)}</span>

        {s.productsCount != null && (
          <>
            <span className="text-gray-500">מוצרים</span>
            <span className="font-medium text-gray-800">{fmt(s.productsCount)}</span>
          </>
        )}
      </div>

      {/* Returns & Gross section */}
      {(s.totalGrossQty != null || s.totalReturnsQty != null) && (
        <div className="px-3 py-2">
          <p className="text-gray-500 mb-1 font-medium">כמויות:</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {s.totalGrossQty != null && (
              <>
                <span className="text-gray-500">אספקות (ברוטו)</span>
                <span className={clsx(
                  "font-medium",
                  (s.validation as Record<string,unknown>|undefined)?.grossMatch === false ? "text-amber-700" : "text-gray-800",
                )}>
                  {fmt(s.totalGrossQty)}
                  {s.clientTotalGrossQty != null && Number(s.clientTotalGrossQty) !== Number(s.totalGrossQty) && (
                    <span className="text-amber-600 ms-1">(בקובץ: {fmt(s.clientTotalGrossQty)})</span>
                  )}
                </span>
              </>
            )}
            {s.totalReturnsQty != null && (
              <>
                <span className="text-gray-500">חזרות</span>
                <span className={clsx(
                  "font-medium",
                  (s.validation as Record<string,unknown>|undefined)?.returnsMatch === false ? "text-amber-700" : "text-gray-800",
                )}>
                  {fmt(s.totalReturnsQty)}
                  {s.clientTotalReturnsQty != null && Number(s.clientTotalReturnsQty) !== Number(s.totalReturnsQty) && (
                    <span className="text-amber-600 ms-1">(בקובץ: {fmt(s.clientTotalReturnsQty)})</span>
                  )}
                </span>
              </>
            )}
            {/* DB verification (product deliveries) */}
            {dbVerif?.dbTotalGrossQty != null && (
              <>
                <span className="text-gray-500">אספקות (DB)</span>
                <span className={clsx("font-medium", dbVerif.grossMatch === false ? "text-amber-700" : "text-gray-800")}>
                  {fmt(dbVerif.dbTotalGrossQty)}
                </span>
              </>
            )}
            {dbVerif?.dbTotalReturnsQty != null && (
              <>
                <span className="text-gray-500">חזרות (DB)</span>
                <span className={clsx("font-medium", dbVerif.returnsMatch === false ? "text-amber-700" : "text-gray-800")}>
                  {fmt(dbVerif.dbTotalReturnsQty)}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Validation status */}
      {(validation || dbVerif) && (
        <div className="px-3 py-2">
          {validation?.status === "ok" && dbVerif?.status !== "warning" && (
            <p className="text-green-700 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              הנתונים אומתו — אין פערים
            </p>
          )}
          {(validation?.status === "warning" || dbVerif?.status === "warning") && (
            <p className="text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              נמצא פער — מומלץ לבדוק את הנתונים
            </p>
          )}
        </div>
      )}
    </div>
  );
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
        <li>עמודות נדרשות: תאריך מסמך, מזהה לקוח, שם לקוח, ערך כספי (לפני מע&quot;מ)</li>
        <li>רק שורות עם ערך כספי חיובי יילקחו</li>
      </ul>
    </div>
  );
}
