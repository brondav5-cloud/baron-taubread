"use client";

interface DataFreshnessBannerProps {
  lastUploadLabel: string | null;
  periodEnd: string | null;
  latestClosedWeek: string | null;
}

function formatWeek(weekStart: string): string {
  const [y, m, d] = weekStart.split("-");
  if (!y || !m || !d) return weekStart;
  return `${d}/${m}/${y}`;
}

export function DataFreshnessBanner({
  lastUploadLabel,
  periodEnd,
  latestClosedWeek,
}: DataFreshnessBannerProps) {
  if (!lastUploadLabel && !periodEnd && !latestClosedWeek) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
      <p className="font-medium text-gray-800">טריות נתונים</p>
      <p className="mt-1">
        {lastUploadLabel ? `עדכון אחרון: ${lastUploadLabel}` : "אין חותמת העלאה"}
        {periodEnd ? ` · תקופה עד ${periodEnd}` : ""}
        {latestClosedWeek
          ? ` · שבוע סגור אחרון מתחיל ב-${formatWeek(latestClosedWeek)}`
          : ""}
        {" · "}
        החודש השוטף עדיין מתמלא — לא משווים אותו לחודש מלא.
      </p>
    </div>
  );
}
