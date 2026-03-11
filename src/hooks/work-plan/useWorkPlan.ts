"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import {
  getWorkPlanItems,
  insertWorkPlanItem,
  updateWorkPlanItem,
  deleteWorkPlanItem,
} from "@/lib/supabase/work-plan.queries";
import type { PlanItem, PlannedVisit, PlannedTask, Priority } from "./types";
import {
  getWeekKey,
  getWeekDates,
  formatDate as formatDateHelper,
  isToday as isTodayHelper,
  groupItemsByDay,
  calculateStats,
  getAvailableStores,
  getPriorityFromStatus,
} from "./helpers";
import type { DbWorkPlanItem } from "@/types/supabase";

function dbToPlanItem(row: DbWorkPlanItem): PlanItem {
  if (row.item_type === "visit" && row.store_id != null) {
    const visit: PlannedVisit = {
      id: row.id,
      type: "visit",
      storeId: row.store_id,
      store: {
        id: row.store_id,
        name: row.store_name || "",
        city: row.store_city || "",
        agent: row.store_agent || "",
        status_long: "יציב",
        metric_12v12: 0,
      },
      day: row.day,
      order: row.sort_order,
      priority: row.priority as Priority,
      completed: row.completed,
      weekKey: row.week_key,
    };
    return visit;
  }
  const task: PlannedTask = {
    id: row.id,
    type: "task",
    title: row.task_title || "",
    description: row.task_description || undefined,
    day: row.day,
    order: row.sort_order,
    priority: row.priority as Priority,
    completed: row.completed,
    weekKey: row.week_key,
  };
  return task;
}

export function useWorkPlan() {
  const auth = useAuth();
  const { stores: dbStores, getStoreByExternalId } = useStoresAndProducts();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const userId = auth.status === "authed" ? auth.user.userId : "";

  const stores = useMemo(
    () =>
      dbStores.map((s) => {
        const m = s.metrics || {};
        return {
          id: s.external_id,
          name: s.name,
          city: s.city || "",
          agent: s.agent || "",
          status_long: (m.status_long as string) || "יציב",
          metric_12v12: m.metric_12v12 ?? 0,
        };
      }),
    [dbStores],
  );
  const cities = useMemo(
    () =>
      Array.from(new Set(stores.map((s) => s.city).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "he"),
      ),
    [stores],
  );
  const agents = useMemo(
    () =>
      Array.from(new Set(stores.map((s) => s.agent).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "he"),
      ),
    [stores],
  );

  // State
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<PlanItem | null>(null);

  // Current week key
  const currentWeekKey = useMemo(() => getWeekKey(weekOffset), [weekOffset]);

  // Plan items for current week (loaded from Supabase)
  const [allPlanItems, setAllPlanItems] = useState<PlanItem[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);

  useEffect(() => {
    if (auth.status === "loading" || !companyId) {
      setAllPlanItems([]);
      setIsLoadingPlan(false);
      return;
    }
    setIsLoadingPlan(true);
    let cancelled = false;
    getWorkPlanItems(companyId, currentWeekKey)
      .then((rows) => {
        if (!cancelled) setAllPlanItems(rows.map(dbToPlanItem));
      })
      .catch(() => {
        if (!cancelled) setAllPlanItems([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPlan(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.status, companyId, currentWeekKey]);

  const refetchPlan = useCallback(() => {
    if (!companyId) return;
    getWorkPlanItems(companyId, currentWeekKey).then((rows) =>
      setAllPlanItems(rows.map(dbToPlanItem)),
    );
  }, [companyId, currentWeekKey]);

  useRealtimeTable("work_plan_items", companyId ? [companyId] : [], refetchPlan);

  const planItems = allPlanItems;

  // Computed values
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const itemsByDay = useMemo(() => groupItemsByDay(planItems), [planItems]);
  const stats = useMemo(() => calculateStats(planItems), [planItems]);
  const availableStores = useMemo(
    () => getAvailableStores(stores, planItems, selectedCity, selectedAgent),
    [stores, planItems, selectedCity, selectedAgent],
  );

  // === ADD HANDLERS ===

  const addVisit = useCallback(
    async (
      store: {
        id: number;
        name: string;
        city: string;
        agent: string;
        status_long: string;
      },
      day: number,
    ) => {
      if (!companyId || !userId) return;
      const dayItems = allPlanItems.filter((i) => i.day === day);
      const maxOrder =
        dayItems.length > 0 ? Math.max(...dayItems.map((i) => i.order)) + 1 : 0;
      const result = await insertWorkPlanItem({
        company_id: companyId,
        week_key: currentWeekKey,
        day,
        item_type: "visit",
        sort_order: maxOrder,
        priority: getPriorityFromStatus(store.status_long),
        completed: false,
        created_by: userId,
        store_id: store.id,
        store_name: store.name,
        store_city: store.city,
        store_agent: store.agent,
      });
      if (result.data)
        setAllPlanItems((prev) => [...prev, dbToPlanItem(result.data!)]);
      setShowAddModal(false);
      setSelectedDay(null);
    },
    [companyId, userId, currentWeekKey, allPlanItems],
  );

  const addVisitFromTreatment = useCallback(
    async (storeId: number, day: number, targetWeekOffset?: number) => {
      const dbStore = getStoreByExternalId(storeId);
      if (!dbStore || !companyId || !userId) return;
      const m = dbStore.metrics || {};
      const store = {
        id: dbStore.external_id,
        name: dbStore.name,
        city: dbStore.city || "",
        agent: dbStore.agent || "",
        status_long: (m.status_long as string) || "יציב",
        metric_12v12: m.metric_12v12 ?? 0,
      };
      const targetWeekKey =
        targetWeekOffset !== undefined
          ? getWeekKey(targetWeekOffset)
          : currentWeekKey;
      const dayItems = allPlanItems.filter(
        (i) => i.day === day && i.weekKey === targetWeekKey,
      );
      const maxOrder =
        dayItems.length > 0 ? Math.max(...dayItems.map((i) => i.order)) + 1 : 0;
      const result = await insertWorkPlanItem({
        company_id: companyId,
        week_key: targetWeekKey,
        day,
        item_type: "visit",
        sort_order: maxOrder,
        priority: getPriorityFromStatus(store.status_long),
        completed: false,
        created_by: userId,
        store_id: store.id,
        store_name: store.name,
        store_city: store.city,
        store_agent: store.agent,
      });
      if (result.data && targetWeekKey === currentWeekKey) {
        setAllPlanItems((prev) => [...prev, dbToPlanItem(result.data!)]);
      }
      setShowAddModal(false);
      setSelectedDay(null);
    },
    [companyId, userId, currentWeekKey, allPlanItems, getStoreByExternalId],
  );

  const addTask = useCallback(
    async (
      title: string,
      description: string,
      day: number,
      priority: Priority,
    ) => {
      if (!companyId || !userId) return;
      const dayItems = allPlanItems.filter((i) => i.day === day);
      const maxOrder =
        dayItems.length > 0 ? Math.max(...dayItems.map((i) => i.order)) + 1 : 0;
      const result = await insertWorkPlanItem({
        company_id: companyId,
        week_key: currentWeekKey,
        day,
        item_type: "task",
        sort_order: maxOrder,
        priority,
        completed: false,
        created_by: userId,
        task_title: title,
        task_description: description || undefined,
      });
      if (result.data)
        setAllPlanItems((prev) => [...prev, dbToPlanItem(result.data!)]);
      setShowTaskModal(false);
      setSelectedDay(null);
    },
    [companyId, userId, currentWeekKey, allPlanItems],
  );

  // === ITEM HANDLERS ===

  const removeItem = useCallback(async (itemId: string) => {
    const ok = await deleteWorkPlanItem(itemId);
    if (ok) setAllPlanItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const toggleComplete = useCallback(
    async (itemId: string) => {
      const item = allPlanItems.find((i) => i.id === itemId);
      if (!item) return;
      setAllPlanItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, completed: !i.completed } : i,
        ),
      );
      const ok = await updateWorkPlanItem(itemId, {
        completed: !item.completed,
      });
      if (!ok && companyId)
        getWorkPlanItems(companyId, currentWeekKey).then((rows) =>
          setAllPlanItems(rows.map(dbToPlanItem)),
        );
    },
    [allPlanItems, companyId, currentWeekKey],
  );

  // === DRAG & DROP ===

  const handleDragStart = useCallback((item: PlanItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  const handleDrop = useCallback(
    async (targetDay: number, targetOrder: number) => {
      if (!draggedItem || !companyId) return;

      const filtered = allPlanItems.filter((i) => i.id !== draggedItem.id);
      const targetDayItems = filtered.filter((i) => i.day === targetDay);
      const updatedItem = {
        ...draggedItem,
        day: targetDay,
        order: targetOrder,
      };
      const reorderedTargetItems = targetDayItems.map((item) =>
        item.order >= targetOrder ? { ...item, order: item.order + 1 } : item,
      );
      const otherItems = filtered.filter((i) => i.day !== targetDay);
      const newItems = [...otherItems, ...reorderedTargetItems, updatedItem];

      setAllPlanItems(newItems);
      setDraggedItem(null);

      await updateWorkPlanItem(draggedItem.id, {
        day: targetDay,
        sort_order: targetOrder,
      });
      for (const it of reorderedTargetItems) {
        if (it.order !== allPlanItems.find((x) => x.id === it.id)?.order) {
          await updateWorkPlanItem(it.id, { sort_order: it.order });
        }
      }
    },
    [draggedItem, allPlanItems, companyId],
  );

  const moveItem = useCallback(
    async (itemId: string, newDay: number, newOrder: number) => {
      const item = allPlanItems.find((i) => i.id === itemId);
      if (!item || !companyId) return;

      const oldDay = item.day;
      const oldOrder = item.order;

      const next = allPlanItems.map((i) => {
        if (i.id === itemId) return { ...i, day: newDay, order: newOrder };
        if (i.day === oldDay && i.order > oldOrder)
          return { ...i, order: i.order - 1 };
        if (i.day === newDay && i.order >= newOrder && i.id !== itemId)
          return { ...i, order: i.order + 1 };
        return i;
      });
      setAllPlanItems(next);

      await updateWorkPlanItem(itemId, { day: newDay, sort_order: newOrder });
    },
    [allPlanItems, companyId],
  );

  // === MODAL HANDLERS ===

  const openAddModal = useCallback((dayIndex: number) => {
    setSelectedDay(dayIndex);
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setSelectedDay(null);
  }, []);

  const openTaskModal = useCallback((dayIndex: number) => {
    setSelectedDay(dayIndex);
    setShowTaskModal(true);
  }, []);

  const closeTaskModal = useCallback(() => {
    setShowTaskModal(false);
    setSelectedDay(null);
  }, []);

  // === HELPERS ===

  const formatDate = useCallback((date: Date | undefined): string => {
    return formatDateHelper(date);
  }, []);

  const isToday = useCallback((date: Date | undefined): boolean => {
    return isTodayHelper(date);
  }, []);

  const duplicateItem = useCallback(
    async (itemId: string, targetDay: number) => {
      if (!companyId || !userId) return;
      const item = allPlanItems.find((i) => i.id === itemId);
      if (!item) return;

      const dayItems = allPlanItems.filter((i) => i.day === targetDay);
      const maxOrder =
        dayItems.length > 0 ? Math.max(...dayItems.map((i) => i.order)) + 1 : 0;

      if (item.type === "visit") {
        const visit = item as PlannedVisit;
        const result = await insertWorkPlanItem({
          company_id: companyId,
          week_key: currentWeekKey,
          day: targetDay,
          item_type: "visit",
          sort_order: maxOrder,
          priority: visit.priority,
          completed: false,
          created_by: userId,
          store_id: visit.storeId,
          store_name: visit.store.name,
          store_city: visit.store.city,
          store_agent: visit.store.agent,
        });
        if (result.data)
          setAllPlanItems((prev) => [...prev, dbToPlanItem(result.data!)]);
      } else {
        const task = item as PlannedTask;
        const result = await insertWorkPlanItem({
          company_id: companyId,
          week_key: currentWeekKey,
          day: targetDay,
          item_type: "task",
          sort_order: maxOrder,
          priority: task.priority,
          completed: false,
          created_by: userId,
          task_title: task.title,
          task_description: task.description || undefined,
        });
        if (result.data)
          setAllPlanItems((prev) => [...prev, dbToPlanItem(result.data!)]);
      }
    },
    [companyId, userId, currentWeekKey, allPlanItems],
  );

  return {
    // Data
    stores,
    cities,
    agents,
    weekDates,
    itemsByDay,
    availableStores,
    stats,

    // State
    isLoadingPlan,
    weekOffset,
    setWeekOffset,
    selectedCity,
    setSelectedCity,
    selectedAgent,
    setSelectedAgent,
    showAddModal,
    showTaskModal,
    selectedDay,
    draggedItem,

    // Actions
    addVisit,
    addVisitFromTreatment,
    addTask,
    removeItem,
    toggleComplete,
    duplicateItem,
    openAddModal,
    closeAddModal,
    openTaskModal,
    closeTaskModal,

    // Drag & Drop
    handleDragStart,
    handleDragEnd,
    handleDrop,
    moveItem,

    // Helpers
    formatDate,
    isToday,
  };
}
