import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  type QueryConstraint,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db, getCollectionPath } from "./config";
import type {
  Store,
  StoreWithMetrics,
  StoreMetrics,
  StoreFilters,
  PaginatedResult,
  ApiResponse,
} from "@/types";
import { getStatusFromMetric } from "@/lib/utils";
import type { StoreInput, UpdateStoreInput } from "@/validations/schemas";

// ============================================
// COLLECTION HELPERS
// ============================================

function getStoresCollection(companyId: string) {
  return collection(db, getCollectionPath(companyId, "stores"));
}

function getStoreDoc(companyId: string, storeId: string) {
  return doc(db, getCollectionPath(companyId, "stores"), storeId);
}

// ============================================
// TRANSFORM HELPERS
// ============================================

function transformStore(doc: DocumentSnapshot): Store {
  const data = doc.data()!;
  return {
    id: doc.id,
    companyId: data.companyId,
    externalId: data.externalId,
    name: data.name,
    network: data.network,
    city: data.city,
    address: data.address,
    driver: data.driver,
    agentId: data.agentId,
    agentName: data.agentName,
    phone: data.phone,
    isActive: data.isActive ?? true,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}

// ============================================
// GET ALL STORES
// ============================================

export async function getStores(
  companyId: string,
  filters?: StoreFilters,
  pageSize = 50,
  lastDoc?: DocumentSnapshot,
): Promise<PaginatedResult<Store>> {
  try {
    const constraints: QueryConstraint[] = [];

    // Apply filters
    if (filters?.city) {
      constraints.push(where("city", "==", filters.city));
    }
    if (filters?.network) {
      constraints.push(where("network", "==", filters.network));
    }
    if (filters?.agent) {
      constraints.push(where("agentName", "==", filters.agent));
    }
    if (filters?.driver) {
      constraints.push(where("driver", "==", filters.driver));
    }
    if (filters?.isActive !== undefined) {
      constraints.push(where("isActive", "==", filters.isActive));
    }

    // Order and pagination
    constraints.push(orderBy("name"));
    constraints.push(limit(pageSize + 1)); // +1 to check if there are more

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(getStoresCollection(companyId), ...constraints);
    const snapshot = await getDocs(q);

    const stores = snapshot.docs.slice(0, pageSize).map(transformStore);
    const hasMore = snapshot.docs.length > pageSize;

    // Apply search filter (client-side for now)
    let filteredStores = stores;
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredStores = stores.filter(
        (store: StoreWithMetrics) =>
          store.name.toLowerCase().includes(searchLower) ||
          store.city.toLowerCase().includes(searchLower) ||
          store.network.toLowerCase().includes(searchLower),
      );
    }

    return {
      data: filteredStores,
      total: filteredStores.length, // Note: actual total requires separate count query
      page: 1,
      limit: pageSize,
      totalPages: 1, // Would need separate count
      hasMore,
    };
  } catch (error) {
    console.error("Error fetching stores:", error);
    return {
      data: [],
      total: 0,
      page: 1,
      limit: pageSize,
      totalPages: 0,
      hasMore: false,
    };
  }
}

// ============================================
// GET SINGLE STORE
// ============================================

export async function getStore(
  companyId: string,
  storeId: string,
): Promise<ApiResponse<Store>> {
  try {
    const docSnap = await getDoc(getStoreDoc(companyId, storeId));

    if (!docSnap.exists()) {
      return {
        success: false,
        error: "החנות לא נמצאה",
      };
    }

    return {
      success: true,
      data: transformStore(docSnap),
    };
  } catch (error) {
    console.error("Error fetching store:", error);
    return {
      success: false,
      error: "שגיאה בטעינת החנות",
    };
  }
}

// ============================================
// GET STORE WITH METRICS
// ============================================

export async function getStoreWithMetrics(
  companyId: string,
  storeId: string,
): Promise<ApiResponse<StoreWithMetrics>> {
  try {
    const storeResult = await getStore(companyId, storeId);

    if (!storeResult.success || !storeResult.data) {
      return storeResult as ApiResponse<StoreWithMetrics>;
    }

    const store = storeResult.data;

    // Fetch metrics (would be from a separate collection or calculated)
    // For now, returning null metrics
    const metrics = null as StoreMetrics | null;

    const metricValue = metrics?.metrics["12v12"] ?? null;
    const status = !store.isActive
      ? "inactive"
      : getStatusFromMetric(metricValue);

    return {
      success: true,
      data: {
        ...store,
        metrics,
        status,
      },
    };
  } catch (error) {
    console.error("Error fetching store with metrics:", error);
    return {
      success: false,
      error: "שגיאה בטעינת החנות",
    };
  }
}

// ============================================
// CREATE STORE
// ============================================

export async function createStore(
  companyId: string,
  data: StoreInput,
): Promise<ApiResponse<Store>> {
  try {
    const storeData = {
      ...data,
      companyId,
      isActive: data.isActive ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(getStoresCollection(companyId), storeData);
    const newDoc = await getDoc(docRef);

    return {
      success: true,
      data: transformStore(newDoc),
      message: "החנות נוצרה בהצלחה",
    };
  } catch (error) {
    console.error("Error creating store:", error);
    return {
      success: false,
      error: "שגיאה ביצירת החנות",
    };
  }
}

// ============================================
// UPDATE STORE
// ============================================

export async function updateStore(
  companyId: string,
  storeId: string,
  data: UpdateStoreInput,
): Promise<ApiResponse<Store>> {
  try {
    const storeRef = getStoreDoc(companyId, storeId);

    await updateDoc(storeRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    const updatedDoc = await getDoc(storeRef);

    return {
      success: true,
      data: transformStore(updatedDoc),
      message: "החנות עודכנה בהצלחה",
    };
  } catch (error) {
    console.error("Error updating store:", error);
    return {
      success: false,
      error: "שגיאה בעדכון החנות",
    };
  }
}

// ============================================
// DELETE STORE (Soft delete)
// ============================================

export async function deleteStore(
  companyId: string,
  storeId: string,
): Promise<ApiResponse<void>> {
  try {
    // Soft delete - just mark as inactive
    await updateDoc(getStoreDoc(companyId, storeId), {
      isActive: false,
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      message: "החנות נמחקה בהצלחה",
    };
  } catch (error) {
    console.error("Error deleting store:", error);
    return {
      success: false,
      error: "שגיאה במחיקת החנות",
    };
  }
}

// ============================================
// GET UNIQUE VALUES FOR FILTERS
// ============================================

export async function getStoreFilterOptions(companyId: string): Promise<{
  cities: string[];
  networks: string[];
  agents: string[];
  drivers: string[];
}> {
  try {
    const snapshot = await getDocs(getStoresCollection(companyId));

    const cities = new Set<string>();
    const networks = new Set<string>();
    const agents = new Set<string>();
    const drivers = new Set<string>();

    snapshot.docs.forEach((doc: { data: () => Record<string, unknown> }) => {
      const data = doc.data();
      if (data.city) cities.add(data.city as string);
      if (data.network) networks.add(data.network as string);
      if (data.agentName) agents.add(data.agentName as string);
      if (data.driver) drivers.add(data.driver as string);
    });

    return {
      cities: Array.from(cities).sort(),
      networks: Array.from(networks).sort(),
      agents: Array.from(agents).sort(),
      drivers: Array.from(drivers).sort(),
    };
  } catch (error) {
    console.error("Error fetching filter options:", error);
    return {
      cities: [],
      networks: [],
      agents: [],
      drivers: [],
    };
  }
}
