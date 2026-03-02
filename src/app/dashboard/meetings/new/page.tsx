"use client";

import MeetingForm from "@/components/meetings/MeetingForm";
import { useUsers } from "@/context/UsersContext";

export default function NewMeetingPage() {
  const { currentUser } = useUsers();
  const companyLogo = (currentUser as { company_logo?: string }).company_logo ?? null;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-5">ישיבה חדשה</h1>
      <MeetingForm mode="create" companyLogo={companyLogo} />
    </div>
  );
}
