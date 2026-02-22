import { SettingsTabs } from "@/components/settings";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SettingsTabs />
      {children}
    </div>
  );
}
