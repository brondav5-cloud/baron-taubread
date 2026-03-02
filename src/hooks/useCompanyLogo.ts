"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseCompanyLogoReturn {
  logoUrl: string | null;
  uploading: boolean;
  uploadLogo: (file: File) => Promise<boolean>;
}

export function useCompanyLogo(): UseCompanyLogoReturn {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    supabase
      .from("companies")
      .select("logo_url")
      .eq("id", companyId)
      .single()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
      });
  }, [companyId]);

  const uploadLogo = async (file: File): Promise<boolean> => {
    if (!companyId) return false;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "png";
      const path = `company-logos/${companyId}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("public-assets")
        .upload(path, file, { upsert: true });

      if (uploadErr) {
        console.error("[uploadLogo]", uploadErr);
        return false;
      }

      const { data: urlData } = supabase.storage
        .from("public-assets")
        .getPublicUrl(path);

      const url = urlData.publicUrl;

      const { error: updateErr } = await supabase
        .from("companies")
        .update({ logo_url: url })
        .eq("id", companyId);

      if (updateErr) {
        console.error("[uploadLogo] update error", updateErr);
        return false;
      }

      setLogoUrl(url);
      return true;
    } finally {
      setUploading(false);
    }
  };

  return { logoUrl, uploading, uploadLogo };
}
