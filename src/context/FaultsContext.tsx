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
  typeId: string;
  statusId: string;
  title: string;
  description: string;
  reportedBy: string;
  reportedByName: string;
  assignedTo: string;
  assignedToName: string;
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
  photos?: string[];
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
  return {
    id: db.id,
    typeId: db.type_id,
    statusId: db.status_id,
    title: db.title,
    description: db.description || "",
    reportedBy: db.reported_by,
    reportedByName: db.reported_by_name,
    assignedTo: db.assigned_to,
    assignedToName: db.assigned_to_name,
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

const DEMO_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

const FaultsContext = createContext<FaultsContextValue | null>(null);

export function FaultsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { currentUser } = useUsers();
  const companyId =
    auth.status === "authed"
      ? auth.user.company_id
      : auth.status === "anon"
        ? DEMO_COMPANY_ID
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

    if (statuses.length === 0) {
      for (const s of DEFAULT_STATUSES) {
        const inserted = await insertFaultStatus({
          company_id: companyId,
          name: s.name,
          color: s.color,
          order: s.order,
          is_final: s.is_final,
          is_active: true,
        });
        if (inserted) statuses.push(inserted);
      }
    }

    const rawFaults = await fetchFaults(companyId);
    setFaultTypes(types);
    setFaultStatuses(statuses);
    setFaults(rawFaults.map((f) => dbToFault(f, types, statuses)));
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

  useRealtimeTable("faults", companyId, refetch);

  const createFault = useCallback(
    async (input: CreateFaultInput): Promise<Fault | null> => {
      if (!companyId) return null;
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
        assigned_to: input.assignedTo,
        assigned_to_name: input.assignedToName,
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

      if (input.assignedTo && input.assignedTo !== userId) {
        sendNotification({
          recipientUserIds: [input.assignedTo],
          type: "fault_assigned",
          title: "תקלה חדשה הוקצתה לך",
          body: `${currentUser.name}: ${input.title}`,
          url: `/dashboard/faults`,
          referenceId: data.id,
          referenceType: "fault",
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
            [fault.reportedBy, fault.assignedTo].filter(
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
        fault.assignedTo === userId || fault.reportedBy === userId || isAdmin
      );
    },
    [userId, currentUser.role],
  );

  const getVisibleFaults = useCallback((): Fault[] => {
    const isAdmin = currentUser.role === "admin";
    if (isAdmin) return faults;
    return faults.filter(
      (f) => f.reportedBy === userId || f.assignedTo === userId,
    );
  }, [faults, userId, currentUser.role]);

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
