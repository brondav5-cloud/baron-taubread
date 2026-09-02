"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ErpSubnav } from "@/components/erp/ErpSubnav";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  const { canAccess, currentUser } = usePermissions();
  const auth = useAuth();
  const router = useRouter();
  const authRole =
    auth.status === "authed"
      ? (auth.user.selectedCompanyRole ?? auth.user.role)
      : null;
  const isAdmin = authRole === "admin" || authRole === "super_admin";
  const usersReady = currentUser.id !== "anon";
  const allowed = isAdmin || canAccess("erp");
  const ready = auth.status === "authed" && (isAdmin || usersReady);

  useEffect(() => {
    if (auth.status === "authed" && usersReady && !allowed) {
      router.replace("/dashboard");
    }
  }, [allowed, auth.status, router, usersReady]);

  if (!ready || !allowed) return null;

  return (
    <div>
      <ErpSubnav />
      {children}
    </div>
  );
}
