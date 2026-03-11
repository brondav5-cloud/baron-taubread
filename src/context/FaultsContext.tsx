"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/context/UsersContext";
import {
  getFaultTypes as fetchFaultTypes,
  getFaultStatuses as fetchFaultStatuses,
  getAllAccessibleFaultTypes as fetchAllFaultTypes,
  getAllAccessibleFaultStatuses as fetchAllFaultStatuses,
  getFaults as fetchFaults,
  insertFault,
  insertFaultType,
  updateFaultType as updateFaultTypeInDb,
  deleteFaultType as deleteFaultTypeInDb,
  insertFaultStatus,
  updateFaultStatus as updateFaultStatusInDb,
  deleteFaultStatus as deleteFaultStatusInDb,
  updateFault,
  type DbFaultType,
  type DbFaultStatus,
  type DbFault,
} from "@/lib/supabase/faults.queries";
import { sendNotification } from "@/lib/notifications/notify";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

// ============================================
// TYPES
// ============================================

export interface Fault {
  id: string;
  companyId: string;
  typeId: string;
  statusId: string;
  title: string;
  description: string;
  reportedBy: string;
  reportedByName: string;
  assignedTo: string;
  assignedToName: string;
  assignedToIds: string[];
  assignedToNames: string[];
  photos: string[];
  comments: Array<{
    id: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    action: string;
    userId: string;
    userName: string;
    timestamp: string;
    details?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  typeName?: string;
  typeIcon?: string;
  statusName?: string;
  statusColor?: string;
}

interface FaultsContextValue {
  faultTypes: DbFaultType[];
  faultStatuses: DbFaultStatus[];
  faults: Fault[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  addFaultType: (
    input: Omit<DbFaultType, "id" | "company_id" | "created_at">,
  ) => Promise<boolean>;
  updateFaultType: (
    id: string,
    updates: Partial<DbFaultType>,
  ) => Promise<boolean>;
  deleteFaultType: (id: string) => Promise<boolean>;
  addFaultStatus: (
    input: Omit<DbFaultStatus, "id" | "company_id" | "created_at">,
  ) => Promise<boolean>;
  updateFaultStatusSetting: (
    id: string,
    updates: Partial<DbFaultStatus>,
  ) => Promise<boolean>;
  deleteFaultStatus: (id: string) => Promise<boolean>;
  createFault: (input: CreateFaultInput) => Promise<Fault | null>;
  updateFaultStatus: (faultId: string, statusId: string) => Promise<boolean>;
  markFaultViewed: (faultId: string) => Promise<void>;
  addComment: (faultId: string, text: string) => Promise<boolean>;
  getVisibleFaults: () => Fault[];
  canComment: (fault: Fault) => boolean;
}

interface CreateFaultInput {
  typeId: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedToName: string;
  assignedToIds?: string[];
  assignedToNames?: string[];
  photos?: string[];
  notifyEmail?: boolean;
  notifySms?: boolean;
}

// ============================================
// HELPERS
// ============================================

function dbToFault(
  db: DbFault,
  types: DbFaultType[],
  statuses: DbFaultStatus[],
): Fault {
  const type = types.find((t) => t.id === db.type_id);
  const status = statuses.find((s) => s.id === db.status_id);
  // Normalise multi-assignee fields: fall back to legacy single-assignee columns
  const assignedToIds: string[] =
    Array.isArray(db.assigned_to_ids) && db.assigned_to_ids.length > 0
      ? db.assigned_to_ids
      : db.assigned_to
        ? [db.assigned_to]
        : [];
  const assignedToNames: string[] =
    Array.isArray(db.assigned_to_names) && db.assigned_to_names.length > 0
      ? db.assigned_to_names
      : db.assigned_to_name
        ? [db.assigned_to_name]
        : [];
  return {
    id: db.id,
    companyId: db.company_id,
    typeId: db.type_id,
    statusId: db.status_id,
    title: db.title,
    description: db.description || "",
    reportedBy: db.reported_by,
    reportedByName: db.reported_by_name,
    assignedTo: assignedToIds[0] ?? db.assigned_to ?? "",
    assignedToName: assignedToNames[0] ?? db.assigned_to_name ?? "",
    assignedToIds,
    assignedToNames,
    photos: db.photos || [],
    comments: db.comments || [],
    history: db.history || [],
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    typeName: type?.name,
    typeIcon: type?.icon,
    statusName: status?.name,
    statusColor: status?.color,
  };
}

const DEFAULT_STATUSES = [
  { name: "חדש", color: "blue", order: 1, is_final: false },
  { name: "נצפה", color: "yellow", order: 2, is_final: false },
  { name: "בטיפול", color: "orange", order: 3, is_final: false },
  { name: "נפתר", color: "green", order: 4, is_final: false },
  { name: "נסגר", color: "gray", order: 5, is_final: true },
];

// ============================================
// CONTEXT
// ============================================

/** Guards against concurrent default-status seeding (e.g. React StrictMode double-invoke). */
const seedingCompanies = new Set<string>();

const FaultsContext = createContext<FaultsContextValue | null>(null);

export function FaultsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { currentUser } = useUsers();
  const companyId =
    auth.status === "authed"
      ? auth.user.company_id
      : null;
  const userId = currentUser.id;

  const [faultTypes, setFaultTypes] = useState<DbFaultType[]>([]);
  const [faultStatuses, setFaultStatuses] = useState<DbFaultStatus[]>([]);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!companyId) return;
    let types = await fetchFaultTypes(companyId);
    let statuses = await fetchFaultStatuses(companyId);

    if (statuses.length === 0 && !seedingCompanies.has(companyId)) {
      seedingCompanies.add(companyId);
      try {
        await Promise.all(
          DEFAULT_STATUSES.map((s) =>
            insertFaultStatus({
              company_id: companyId,
              name: s.name,
              color: s.color,
              order: s.order,
              is_final: s.is_final,
              is_active: true,
            }),
          ),
        );
        // Re-fetch to get the authoritative state (handles any concurrent seeding)
        statuses = await fetchFaultStatuses(companyId);
      } finally {
        seedingCompanies.delete(companyId);
      }
    }

    // Fetch all accessible types/statuses (cross-company via RLS) for resolving
    // type names and status colors on faults from other companies
    const [allTypes, allStatuses, rawFaults] = await Promise.all([
      fetchAllFaultTypes(),
      fetchAllFaultStatuses(),
      fetchFaults(companyId),
    ]);

    setFaultTypes(types);
    setFaultStatuses(statuses);
    setFaults(rawFaults.map((f) => dbToFault(f, allTypes, allStatuses)));
  }, [companyId]);

  const addFaultType = useCallback(
    async (input: Omit<DbFaultType, "id" | "company_id" | "created_at">) => {
      if (!companyId) return false;
      const inserted = await insertFaultType({
        ...input,
        company_id: companyId,
      });
      if (inserted) await refetch();
      return !!inserted;
    },
    [companyId, refetch],
  );

  const updateFaultType = useCallback(
    async (id: string, updates: Partial<DbFaultType>) => {
      const ok = await updateFaultTypeInDb(id, updates);
      if (ok) await refetch();
      return ok;
    },
    [refetch],
  );

  const deleteFaultType = useCallback(
    async (id: string) => {
      const ok = await deleteFaultTypeInDb(id);
      if (ok) await refetch();
      return ok;
    },
    [refetch],
  );

  const addFaultStatus = useCallback(
    async (input: Omit<DbFaultStatus, "id" | "company_id" | "created_at">) => {
      if (!companyId) return false;
      const inserted = await insertFaultStatus({
        ...input,
        company_id: companyId,
      });
      if (inserted) await refetch();
      return !!inserted;
    },
    [companyId, refetch],
  );

  const updateFaultStatusSetting = useCallback(
    async (id: string, updates: Partial<DbFaultStatus>) => {
      const ok = await updateFaultStatusInDb(id, updates);
      if (ok) await refetch();
      return ok;
    },
    [refetch],
  );

  const deleteFaultStatus = useCallback(
    async (id: string) => {
      const ok = await deleteFaultStatusInDb(id);
      if (ok) await refetch();
      return ok;
    },
    [refetch],
  );

  useEffect(() => {
    if (auth.status === "loading" || !companyId) {
      setIsLoading(false);
      return;
    }
    refetch().finally(() => setIsLoading(false));
  }, [auth.status, companyId, refetch]);

  useRealtimeTable("faults", companyId ? [companyId] : [], refetch);

  const createFault = useCallback(
    async (input: CreateFaultInput): Promise<Fault | null> => {
      if (!companyId) return null;
      const ids = input.assignedToIds?.length
        ? input.assignedToIds
        : input.assignedTo
          ? [input.assignedTo]
          : [];
      const names = input.assignedToNames?.length
        ? input.assignedToNames
        : input.assignedToName
          ? [input.assignedToName]
          : [];
      const { data, error } = await insertFault({
        company_id: companyId,
        type_id: input.typeId,
        status_id:
          faultStatuses.find((s) => s.order === 1)?.id ??
          faultStatuses[0]?.id ??
          "",
        title: input.title,
        description: input.description || "",
        reported_by: userId,
        reported_by_name: currentUser.name,
        assigned_to: ids[0] ?? "",
        assigned_to_name: names[0] ?? "",
        assigned_to_ids: ids,
        assigned_to_names: names,
        photos: input.photos || [],
        comments: [],
        history: [
          {
            id: `h_${Date.now()}`,
            action: "created",
            userId,
            userName: currentUser.name,
            timestamp: new Date().toISOString(),
            details: "התקלה דווחה",
          },
        ],
      });
      if (error || !data) return null;
      await refetch();

      const notifyIds = ids.filter((id) => id !== userId);
      if (notifyIds.length > 0) {
        sendNotification({
          recipientUserIds: notifyIds,
          type: "fault_assigned",
          title: "תקלה חדשה הוקצתה לך",
          body: `${currentUser.name}: ${input.title}`,
          url: `/dashboard/faults`,
          referenceId: data.id,
          referenceType: "fault",
          sendEmail: input.notifyEmail,
          sendSms: input.notifySms,
        });
      }

      return dbToFault(data, faultTypes, faultStatuses);
    },
    [companyId, userId, currentUser.name, faultStatuses, faultTypes, refetch],
  );

  const updateFaultStatus = useCallback(
    async (faultId: string, statusId: string): Promise<boolean> => {
      const fault = faults.find((f) => f.id === faultId);
      if (!fault) return false;
      const status = faultStatuses.find((s) => s.id === statusId);
      const ok = await updateFault(faultId, {
        status_id: statusId,
        history: [
          ...fault.history,
          {
            id: `h_${Date.now()}`,
            action: "status",
            userId,
            userName: currentUser.name,
            timestamp: new Date().toISOString(),
            details: `סטטוס: ${status?.name ?? ""}`,
          },
        ],
      });
      if (ok) {
        await refetch();

        const notifyIds = Array.from(
          new Set(
            [fault.reportedBy, ...fault.assignedToIds].filter(
              (id): id is string => !!id && id !== userId,
            ),
          ),
        );
        if (notifyIds.length > 0) {
          sendNotification({
            recipientUserIds: notifyIds,
            type: "fault_status",
            title: "עדכון סטטוס תקלה",
            body: `${currentUser.name} שינה סטטוס ל-${status?.name ?? ""}: ${fault.title}`,
            url: `/dashboard/faults`,
            referenceId: faultId,
            referenceType: "fault",
          });
        }
      }
      return ok;
    },
    [faults, faultStatuses, userId, currentUser.name, refetch],
  );

  const addComment = useCallback(
    async (faultId: string, text: string): Promise<boolean> => {
      const fault = faults.find((f) => f.id === faultId);
      if (!fault) return false;
      const comment = {
        id: `c_${Date.now()}`,
        userId,
        userName: currentUser.name,
        text,
        createdAt: new Date().toISOString(),
      };
      const ok = await updateFault(faultId, {
        comments: [...fault.comments, comment],
        history: [
          ...fault.history,
          {
            id: `h_${Date.now()}`,
            action: "comment",
            userId,
            userName: currentUser.name,
            timestamp: new Date().toISOString(),
            details: "הוספת הערה",
          },
        ],
      });
      if (ok) await refetch();
      return ok;
    },
    [faults, userId, currentUser.name, refetch],
  );

  const canComment = useCallback(
    (fault: Fault): boolean => {
      const isAdmin = currentUser.role === "admin";
      return (
        fault.assignedToIds.includes(userId) ||
        fault.reportedBy === userId ||
        isAdmin
      );
    },
    [userId, currentUser.role],
  );

  const getVisibleFaults = useCallback((): Fault[] => {
    const isAdmin = currentUser.role === "admin";
    if (isAdmin) return faults;
    return faults.filter(
      (f) =>
        f.reportedBy === userId || f.assignedToIds.includes(userId),
    );
  }, [faults, userId, currentUser.role]);

  /**
   * Auto-transition: if the current user is an assignee and the fault is
   * still in the first status (חדש / order=1), silently move it to the
   * second status (נצפה / order=2) to indicate it was seen.
   */
  const markFaultViewed = useCallback(
    async (faultId: string): Promise<void> => {
      const fault = faults.find((f) => f.id === faultId);
      if (!fault) return;
      const isAssignee = fault.assignedToIds.includes(userId);
      if (!isAssignee) return;
      const firstStatus = faultStatuses
        .filter((s) => s.is_active)
        .sort((a, b) => a.order - b.order)[0];
      const secondStatus = faultStatuses
        .filter((s) => s.is_active)
        .sort((a, b) => a.order - b.order)[1];
      if (!firstStatus || !secondStatus) return;
      if (fault.statusId !== firstStatus.id) return;
      await updateFault(faultId, {
        status_id: secondStatus.id,
        history: [
          ...fault.history,
          {
            id: `h_${Date.now()}`,
            action: "status",
            userId,
            userName: currentUser.name,
            timestamp: new Date().toISOString(),
            details: `סטטוס: ${secondStatus.name}`,
          },
        ],
      });
      await refetch();
    },
    [faults, faultStatuses, userId, currentUser.name, refetch],
  );

  const value: FaultsContextValue = {
    faultTypes,
    faultStatuses,
    faults,
    isLoading,
    refetch,
    addFaultType,
    updateFaultType,
    deleteFaultType,
    addFaultStatus,
    updateFaultStatusSetting,
    deleteFaultStatus,
    createFault,
    updateFaultStatus,
    markFaultViewed,
    addComment,
    getVisibleFaults,
    canComment,
  };

  return (
    <FaultsContext.Provider value={value}>{children}</FaultsContext.Provider>
  );
}

export function useFaults(): FaultsContextValue {
  const ctx = useContext(FaultsContext);
  if (!ctx) throw new Error("useFaults must be used within FaultsProvider");
  return ctx;
}
