import { ReturnsPolicyTab } from "@/components/settings/ReturnsPolicyTab";

export default function ReturnsPolicyPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">נורמת חזרות</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          הגדר אחוזי חזרות נורמליים לפי טווח כמות אספקה חודשית.
          המנגנון החכם ישתמש בנורמות אלו להמליץ על צמצום הזמנות יומי.
        </p>
      </div>
      <ReturnsPolicyTab />
    </div>
  );
}
