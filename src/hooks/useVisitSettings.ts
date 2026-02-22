"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================
// TYPES
// ============================================

export interface ChecklistItem {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

export interface CompetitorItem {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

// ============================================
// CONSTANTS
// ============================================

const CHECKLIST_STORAGE_KEY = "visit_checklist_settings";
const COMPETITORS_STORAGE_KEY = "competitors_settings";

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "1", label: "מדפים מסודרים ומלאים", enabled: true, order: 0 },
  { id: "2", label: "תוקף מוצרים תקין", enabled: true, order: 1 },
  { id: "3", label: "מחירים מעודכנים", enabled: true, order: 2 },
  { id: "4", label: "חומרי שיווק במקום", enabled: true, order: 3 },
  { id: "5", label: "ניקיון אזור המוצרים", enabled: true, order: 4 },
];

export const DEFAULT_COMPETITORS: CompetitorItem[] = [
  { id: "1", name: "אנג'ל", enabled: true, order: 0 },
  { id: "2", name: "ברמן", enabled: true, order: 1 },
  { id: "3", name: "בייגל בייגל", enabled: true, order: 2 },
  { id: "4", name: "לחם הארץ", enabled: true, order: 3 },
  { id: "5", name: "מאפיית ברדה", enabled: true, order: 4 },
  { id: "6", name: "אחר", enabled: true, order: 5 },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

// ============================================
// HOOK - CHECKLIST SETTINGS
// ============================================

export function useChecklistSettings() {
  const [checklist, setChecklist] =
    useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getFromStorage<ChecklistItem[]>(
      CHECKLIST_STORAGE_KEY,
      DEFAULT_CHECKLIST,
    );
    setChecklist(stored);
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  const saveChecklist = useCallback((items: ChecklistItem[]) => {
    setChecklist(items);
    setToStorage(CHECKLIST_STORAGE_KEY, items);
  }, []);

  // Add new item
  const addItem = useCallback(
    (label: string) => {
      const newItem: ChecklistItem = {
        id: `custom-${Date.now()}`,
        label,
        enabled: true,
        order: checklist.length,
      };
      saveChecklist([...checklist, newItem]);
    },
    [checklist, saveChecklist],
  );

  // Update item
  const updateItem = useCallback(
    (id: string, updates: Partial<ChecklistItem>) => {
      saveChecklist(
        checklist.map((item) =>
          item.id === id ? { ...item, ...updates } : item,
        ),
      );
    },
    [checklist, saveChecklist],
  );

  // Remove item
  const removeItem = useCallback(
    (id: string) => {
      saveChecklist(checklist.filter((item) => item.id !== id));
    },
    [checklist, saveChecklist],
  );

  // Toggle enabled
  const toggleEnabled = useCallback(
    (id: string) => {
      saveChecklist(
        checklist.map((item) =>
          item.id === id ? { ...item, enabled: !item.enabled } : item,
        ),
      );
    },
    [checklist, saveChecklist],
  );

  // Reorder items
  const reorderItems = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newItems = [...checklist];
      const [removed] = newItems.splice(fromIndex, 1);
      if (removed) {
        newItems.splice(toIndex, 0, removed);
        // Update order values
        const reordered = newItems.map((item, index) => ({
          ...item,
          order: index,
        }));
        saveChecklist(reordered);
      }
    },
    [checklist, saveChecklist],
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    saveChecklist(DEFAULT_CHECKLIST);
  }, [saveChecklist]);

  // Get enabled items for visit form
  const getEnabledItems = useCallback(() => {
    return checklist
      .filter((item) => item.enabled)
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        id: item.id,
        label: item.label,
        checked: false,
      }));
  }, [checklist]);

  return {
    checklist,
    isLoaded,
    addItem,
    updateItem,
    removeItem,
    toggleEnabled,
    reorderItems,
    resetToDefaults,
    getEnabledItems,
  };
}

// ============================================
// HOOK - COMPETITORS SETTINGS
// ============================================

export function useCompetitorsSettings() {
  const [competitors, setCompetitors] =
    useState<CompetitorItem[]>(DEFAULT_COMPETITORS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getFromStorage<CompetitorItem[]>(
      COMPETITORS_STORAGE_KEY,
      DEFAULT_COMPETITORS,
    );
    setCompetitors(stored);
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  const saveCompetitors = useCallback((items: CompetitorItem[]) => {
    setCompetitors(items);
    setToStorage(COMPETITORS_STORAGE_KEY, items);
  }, []);

  // Add new competitor
  const addCompetitor = useCallback(
    (name: string) => {
      const newItem: CompetitorItem = {
        id: `custom-${Date.now()}`,
        name,
        enabled: true,
        order: competitors.length,
      };
      saveCompetitors([...competitors, newItem]);
    },
    [competitors, saveCompetitors],
  );

  // Update competitor
  const updateCompetitor = useCallback(
    (id: string, updates: Partial<CompetitorItem>) => {
      saveCompetitors(
        competitors.map((item) =>
          item.id === id ? { ...item, ...updates } : item,
        ),
      );
    },
    [competitors, saveCompetitors],
  );

  // Remove competitor
  const removeCompetitor = useCallback(
    (id: string) => {
      saveCompetitors(competitors.filter((item) => item.id !== id));
    },
    [competitors, saveCompetitors],
  );

  // Toggle enabled
  const toggleEnabled = useCallback(
    (id: string) => {
      saveCompetitors(
        competitors.map((item) =>
          item.id === id ? { ...item, enabled: !item.enabled } : item,
        ),
      );
    },
    [competitors, saveCompetitors],
  );

  // Reorder items
  const reorderItems = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newItems = [...competitors];
      const [removed] = newItems.splice(fromIndex, 1);
      if (removed) {
        newItems.splice(toIndex, 0, removed);
        const reordered = newItems.map((item, index) => ({
          ...item,
          order: index,
        }));
        saveCompetitors(reordered);
      }
    },
    [competitors, saveCompetitors],
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    saveCompetitors(DEFAULT_COMPETITORS);
  }, [saveCompetitors]);

  // Get enabled competitors for visit form
  const getEnabledCompetitors = useCallback(() => {
    return competitors
      .filter((item) => item.enabled)
      .sort((a, b) => a.order - b.order);
  }, [competitors]);

  return {
    competitors,
    isLoaded,
    addCompetitor,
    updateCompetitor,
    removeCompetitor,
    toggleEnabled,
    reorderItems,
    resetToDefaults,
    getEnabledCompetitors,
  };
}
