"use client";

import MeetingForm from "@/components/meetings/MeetingForm";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

export default function NewMeetingPage() {
  const { logoUrl } = useCompanyLogo();

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-5">ישיבה חדשה</h1>
      <MeetingForm mode="create" companyLogo={logoUrl} />
    </div>
  );
}
