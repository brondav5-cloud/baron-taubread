"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
];
import { useRouter, useSearchParams } from "next/navigation";
import {
  useChecklistSettings,
  useCompetitorsSettings,
} from "@/hooks/useVisitSettings";
import { useVisits } from "@/context/VisitsContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/providers/ToastProvider";

/** Options for general visit (ביקור כללי) activity type */
export const GENERAL_VISIT_ACTIVITY_OPTIONS = [
  { value: "team_meeting", label: "ישיבת צוות" },
  { value: "errands", label: "שליחות" },
  { value: "general_task", label: "משימה כללית" },
  { value: "other", label: "אחר" },
] as const;

// ============================================
// TYPES
// ============================================

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface Photo {
  id: string;
  name: string;
  url: string; // Base64 או URL
  file?: File;
}

export interface SelectedCompetitor {
  id: string;
  name: string;
  selected: boolean;
  notes: string;
}

// ============================================
// HELPERS
// ============================================

function getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0] ?? "";
}

// דחיסת תמונה - מקסימום 800px רוחב, איכות 0.7
async function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.7,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // חישוב גודל חדש תוך שמירת יחס
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // המרה ל-JPEG עם דחיסה
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ============================================
// HOOK
// ============================================

export function useNewVisit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedStoreId = searchParams.get("store");
  // Support pre-fill from work plan: ?visitType=general&activity=ישיבת+צוות
  const preVisitType = searchParams.get("visitType") as "store" | "general" | null;
  const preActivity = searchParams.get("activity");
  const { addVisit, stores } = useVisits();
  const auth = useAuth();
  const agentName =
    auth.status === "authed" ? auth.user.userName || "" : "";

  // Refs for file inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get settings
  const { getEnabledItems, isLoaded: checklistLoaded } = useChecklistSettings();
  const { getEnabledCompetitors, isLoaded: competitorsLoaded } =
    useCompetitorsSettings();

  // Stores from Supabase (mapped to { id, name, city, network, agent } for compatibility)
  const allStores = useMemo(
    () =>
      stores.map((s) => ({
        id: s.external_id,
        name: s.name,
        city: s.city,
        network: s.network,
        agent: s.agent,
      })),
    [stores],
  );

  // Form state - תאריך ושעה נקבעים אוטומטית
  const [visitType, setVisitType] = useState<"store" | "general">(
    preVisitType === "general" ? "general" : "store",
  );
  const [selectedStore, setSelectedStore] = useState<string>(
    preSelectedStoreId || "",
  );
  const [generalActivityLabel, setGeneralActivityLabel] = useState<string>(
    preActivity ? decodeURIComponent(preActivity) : "",
  );
  const [date, setDate] = useState<string>(getCurrentDate());
  const [time, setTime] = useState<string>(getCurrentTime());
  const [notes, setNotes] = useState<string>("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [competitors, setCompetitors] = useState<SelectedCompetitor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load checklist from settings
  useEffect(() => {
    if (checklistLoaded) {
      setChecklist(getEnabledItems());
    }
  }, [checklistLoaded, getEnabledItems]);

  // Load competitors from settings
  useEffect(() => {
    if (competitorsLoaded) {
      const enabledCompetitors = getEnabledCompetitors();
      setCompetitors(
        enabledCompetitors.map((c) => ({
          id: c.id,
          name: c.name,
          selected: false,
          notes: "",
        })),
      );
    }
  }, [competitorsLoaded, getEnabledCompetitors]);

  // Get selected store info
  const store = allStores.find((s) => s.id.toString() === selectedStore);

  // Checklist handlers
  const toggleChecklistItem = useCallback((id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  }, []);

  const MAX_FILE_SIZE_MB = 10;

  const processFile = useCallback(
    async (file: File) => {
      if (photos.length >= 3) return;

      const isImage =
        ALLOWED_IMAGE_TYPES.includes(file.type) ||
        file.type.startsWith("image/");
      if (!isImage) {
        toast.error("נא לבחור קובץ תמונה (JPEG, PNG, WebP)");
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`הקובץ גדול מדי (מקסימום ${MAX_FILE_SIZE_MB}MB)`);
        return;
      }

      const safeName =
        file.name?.replace(/[^\w.-]/g, "_") || `תמונה_${Date.now()}.jpg`;

      try {
        const compressedBase64 = await compressImage(file, 800, 0.7);
        const newPhoto: Photo = {
          id: Date.now().toString(),
          name: safeName,
          url: compressedBase64,
        };
        setPhotos((prev) => [...prev, newPhoto]);
      } catch (error) {
        console.error("Failed to compress image:", error);
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === "string") {
            const newPhoto: Photo = {
              id: Date.now().toString(),
              name: safeName,
              url: result,
            };
            setPhotos((prev) => [...prev, newPhoto]);
          }
        };
        reader.onerror = () => console.error("Failed to read file");
        reader.readAsDataURL(file);
      }
    },
    [photos.length],
  );

  // Open camera
  const openCamera = useCallback(() => {
    if (photos.length >= 3) return;
    cameraInputRef.current?.click();
  }, [photos.length]);

  // Open file picker
  const openFilePicker = useCallback(() => {
    if (photos.length >= 3) return;
    fileInputRef.current?.click();
  }, [photos.length]);

  // Handle file selection (camera or file)
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // Reset input to allow selecting same file again
      e.target.value = "";
    },
    [processFile],
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Competitor handlers
  const toggleCompetitor = useCallback((id: string) => {
    setCompetitors((prev) =>
      prev.map((comp) =>
        comp.id === id ? { ...comp, selected: !comp.selected } : comp,
      ),
    );
  }, []);

  const updateCompetitorNotes = useCallback(
    (id: string, notesValue: string) => {
      setCompetitors((prev) =>
        prev.map((comp) =>
          comp.id === id ? { ...comp, notes: notesValue } : comp,
        ),
      );
    },
    [],
  );

  // Submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const isGeneral = visitType === "general";
      if (!isGeneral && !store) return;
      if (isGeneral && !generalActivityLabel.trim()) return;

      setIsSubmitting(true);

      await new Promise((resolve) => setTimeout(resolve, 800));

      const selectedCompetitors = competitors
        .filter((c) => c.selected)
        .map((c) => ({ id: c.id, name: c.name, notes: c.notes }));

      addVisit({
        visitType,
        ...(isGeneral
          ? {
              generalActivityLabel: generalActivityLabel.trim(),
              agentName,
            }
          : {
              storeId: store!.id,
              storeName: store!.name,
              storeCity: store!.city,
              agentName: store!.agent,
            }),
        date,
        time,
        notes,
        checklist: checklist.map((item) => ({
          id: item.id,
          label: item.label,
          checked: item.checked,
        })),
        competitors: selectedCompetitors,
        photos: photos.map((p) => ({ id: p.id, name: p.name, url: p.url })),
        status: "completed",
      });

      setIsSubmitting(false);
      setShowSuccess(true);

      setTimeout(() => {
        router.push("/dashboard/visits");
      }, 1500);
    },
    [
      visitType,
      store,
      generalActivityLabel,
      agentName,
      date,
      time,
      notes,
      checklist,
      competitors,
      photos,
      addVisit,
      router,
    ],
  );

  // Submit and create task (store visits only)
  const handleSubmitAndCreateTask = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (visitType !== "store" || !store) return;

      setIsSubmitting(true);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const selectedCompetitors = competitors
        .filter((c) => c.selected)
        .map((c) => ({ id: c.id, name: c.name, notes: c.notes }));

      addVisit({
        visitType: "store",
        storeId: store.id,
        storeName: store.name,
        storeCity: store.city,
        agentName: store.agent,
        date,
        time,
        notes,
        checklist: checklist.map((item) => ({
          id: item.id,
          label: item.label,
          checked: item.checked,
        })),
        competitors: selectedCompetitors,
        photos: photos.map((p) => ({ id: p.id, name: p.name, url: p.url })),
        status: "completed",
      });

      setIsSubmitting(false);

      sessionStorage.setItem(
        "createTaskStore",
        JSON.stringify({
          storeId: store.id,
          storeName: store.name,
        }),
      );
      router.push("/dashboard/tasks");
    },
    [
      visitType,
      store,
      date,
      time,
      notes,
      checklist,
      competitors,
      photos,
      addVisit,
      router,
    ],
  );

  const goBack = useCallback(() => router.back(), [router]);

  const isLoading = !checklistLoaded || !competitorsLoaded;

  const canSubmit =
    visitType === "general"
      ? generalActivityLabel.trim().length > 0
      : !!selectedStore && !!store;

  return {
    // Data
    allStores,
    store,
    isLoading,

    // Form state
    visitType,
    setVisitType,
    generalActivityLabel,
    setGeneralActivityLabel,
    selectedStore,
    setSelectedStore,
    date,
    setDate,
    time,
    setTime,
    notes,
    setNotes,
    checklist,
    photos,
    competitors,
    isSubmitting,
    showSuccess,
    canSubmit,

    // Refs
    cameraInputRef,
    fileInputRef,

    // Actions
    toggleChecklistItem,
    openCamera,
    openFilePicker,
    handleFileChange,
    removePhoto,
    toggleCompetitor,
    updateCompetitorNotes,
    handleSubmit,
    handleSubmitAndCreateTask,
    goBack,
  };
}
