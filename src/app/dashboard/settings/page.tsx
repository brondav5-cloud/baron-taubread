"use client";

import {
  Settings,
  User,
  Bell,
  Palette,
  Database,
  Shield,
  Save,
  RefreshCw,
  Check,
  ClipboardList,
  Users,
  ChevronLeft,
  Loader2,
  Image,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";

import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageHeader,
} from "@/components/ui";

// ============================================
// SUB-COMPONENTS
// ============================================

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SettingsSection({
  title,
  description,
  icon,
  children,
}: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface ToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}

function Toggle({ enabled, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={clsx(
          "relative w-12 h-6 rounded-full transition-colors",
          enabled ? "bg-primary-600" : "bg-gray-300",
        )}
      >
        <span
          className={clsx(
            "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
            enabled ? "right-1" : "right-7",
          )}
        />
      </button>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

const ROLE_LABELS: Record<string, string> = {
  admin: "מנהל מערכת",
  super_admin: "מנהל על",
  editor: "עורך",
  viewer: "צופה",
};

export default function SettingsPage() {
  const auth = useAuth();
  const {
    stores,
    products,
    metadata,
    isLoading: dataLoading,
    refetch: refetchData,
  } = useSupabaseData();
  const {
    saved,
    handleSave,
    emailAlerts,
    setEmailAlerts,
    pushAlerts,
    setPushAlerts,
    weeklyReport,
    setWeeklyReport,
    darkMode,
    setDarkMode,
    compactView,
    setCompactView,
    showMetrics,
    setShowMetrics,
    crashThreshold,
    setCrashThreshold,
    declineThreshold,
    setDeclineThreshold,
    returnsThreshold,
    setReturnsThreshold,
  } = useSettings();

  const { logoUrl, uploading: logoUploading, uploadLogo } = useCompanyLogo();
  const displayName = auth.status === "authed" ? auth.user.userName : "משתמש";
  const displayEmail = auth.status === "authed" ? auth.user.userEmail : "";
  const roleLabel =
    auth.status === "authed" && auth.user.role
      ? ROLE_LABELS[auth.user.role] ?? auth.user.role
      : "—";
  const initials =
    displayName && displayName.length >= 2
      ? String(displayName).slice(0, 2)
      : "מנ";

  return (
    <div className="space-y-6">
      <PageHeader
        title="הגדרות"
        subtitle="ניהול העדפות והגדרות המערכת"
        icon={<Settings className="w-6 h-6" />}
        actions={
          <button
            onClick={handleSave}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              saved
                ? "bg-green-100 text-green-700"
                : "bg-primary-600 text-white hover:bg-primary-700",
            )}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                נשמר!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                שמור שינויים
              </>
            )}
          </button>
        }
      />

      <div className="grid gap-6">
        {/* Profile Section */}
        <SettingsSection
          title="פרופיל"
          description="הגדרות פרופיל המשתמש"
          icon={<User className="w-5 h-5 text-gray-600" />}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-700">
                  {initials}
                </span>
              </div>
              <div>
                <p className="font-bold text-gray-900">{displayName}</p>
                <p className="text-sm text-gray-500">{displayEmail}</p>
                <p className="text-xs text-gray-400 mt-1">
                  תפקיד: {roleLabel}
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם מלא
                </label>
                <input
                  type="text"
                  value={displayName}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אימייל
                </label>
                <input
                  type="email"
                  value={displayEmail}
                  readOnly
                  dir="ltr"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection
          title="התראות"
          description="הגדרות התראות והודעות"
          icon={<Bell className="w-5 h-5 text-gray-600" />}
        >
          <div className="divide-y">
            <Toggle
              enabled={emailAlerts}
              onChange={setEmailAlerts}
              label="התראות באימייל"
              description="קבל התראות על חנויות בירידה"
            />
            <Toggle
              enabled={pushAlerts}
              onChange={setPushAlerts}
              label="התראות Push"
              description="התראות מיידיות בדפדפן"
            />
            <Toggle
              enabled={weeklyReport}
              onChange={setWeeklyReport}
              label="דוח שבועי"
              description="קבל סיכום שבועי באימייל"
            />
          </div>
        </SettingsSection>

        {/* Display Section */}
        <SettingsSection
          title="תצוגה"
          description="התאמה אישית של המראה"
          icon={<Palette className="w-5 h-5 text-gray-600" />}
        >
          <div className="divide-y">
            <Toggle
              enabled={darkMode}
              onChange={setDarkMode}
              label="מצב כהה"
              description="מראה כהה לעיניים (בפיתוח)"
            />
            <Toggle
              enabled={compactView}
              onChange={setCompactView}
              label="תצוגה קומפקטית"
              description="פחות רווחים בין אלמנטים"
            />
            <Toggle
              enabled={showMetrics}
              onChange={setShowMetrics}
              label="הצג מדדים מורחבים"
              description="הצג את כל המדדים בטבלאות"
            />
          </div>
        </SettingsSection>

        {/* Alert Thresholds */}
        <SettingsSection
          title="ספי התראה"
          description="הגדר מתי לשלוח התראות"
          icon={<Shield className="w-5 h-5 text-gray-600" />}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                סף התרסקות (12v12)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="-50"
                  max="0"
                  value={crashThreshold}
                  onChange={(e) => setCrashThreshold(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-16 text-center font-bold text-red-600">
                  {crashThreshold}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                חנויות עם ירידה מעל ערך זה יסומנו כ&quot;התרסקות&quot;
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                סף ירידה (12v12)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="-30"
                  max="0"
                  value={declineThreshold}
                  onChange={(e) => setDeclineThreshold(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-16 text-center font-bold text-orange-600">
                  {declineThreshold}%
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                סף אחוז החזרות
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={returnsThreshold}
                  onChange={(e) => setReturnsThreshold(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-16 text-center font-bold text-amber-600">
                  {returnsThreshold}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                חנויות עם אחוז החזרות מעל ערך זה יקבלו התראה
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Visit Settings */}
        <SettingsSection
          title="הגדרות ביקור"
          description="התאמה אישית של טופס הביקור"
          icon={<ClipboardList className="w-5 h-5 text-gray-600" />}
        >
          <div className="space-y-3">
            <Link
              href="/dashboard/settings/checklist"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    צ&apos;קליסט ביקור
                  </p>
                  <p className="text-sm text-gray-500">
                    הגדר את פריטי הבדיקה בביקור
                  </p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <Link
              href="/dashboard/settings/competitors"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">רשימת מתחרים</p>
                  <p className="text-sm text-gray-500">
                    הגדר מתחרים לתיעוד בביקורים
                  </p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </SettingsSection>

        {/* Company Logo */}
        <SettingsSection
          title="לוגו חברה"
          description="לוגו המופיע בסיכומי ישיבות ובכותרת"
          icon={<Image className="w-5 h-5 text-gray-600" />}
        >
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="לוגו" className="w-full h-full object-contain p-1" />
              ) : (
                <Image className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <div>
              <label className="cursor-pointer">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors ${logoUploading ? "opacity-50 pointer-events-none" : ""}`}>
                  {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                  {logoUploading ? "מעלה..." : "העלה לוגו"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await uploadLogo(file);
                  }}
                />
              </label>
              <p className="text-xs text-gray-400 mt-1.5">PNG, JPG, SVG עד 2MB</p>
            </div>
          </div>
        </SettingsSection>

        {/* Data Section */}
        <SettingsSection
          title="נתונים"
          description="ניהול נתוני המערכת"
          icon={<Database className="w-5 h-5 text-gray-600" />}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">סנכרון נתונים</p>
                <p className="text-sm text-gray-500">
                  {metadata?.updated_at
                    ? `עדכון אחרון: ${new Date(metadata.updated_at).toLocaleDateString("he-IL")}`
                    : "לא הועלו נתונים עדיין"}
                </p>
              </div>
              <button
                onClick={() => void refetchData()}
                disabled={dataLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {dataLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {dataLoading ? "מסנכרן..." : "סנכרן עכשיו"}
              </button>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-700">
                  {dataLoading ? "..." : stores.length}
                </p>
                <p className="text-sm text-blue-600">חנויות</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <p className="text-2xl font-bold text-purple-700">
                  {dataLoading ? "..." : products.length}
                </p>
                <p className="text-sm text-purple-600">מוצרים</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-700">
                  {dataLoading
                    ? "..."
                    : (metadata?.months_list?.length ?? 0)}
                </p>
                <p className="text-sm text-green-600">חודשי נתונים</p>
              </div>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
