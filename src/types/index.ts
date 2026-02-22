// ============================================
// RE-EXPORTS FROM SEPARATE FILES
// ============================================

// Auth & User
export type { UserRole, User, AuthState, Company } from "./auth";

// Store
export type {
  Store,
  StoreMetrics,
  StoreStatus,
  StoreWithMetrics,
  StoreFilters,
} from "./store";

// Product
export type {
  Product,
  ProductMetrics,
  ProductFilters,
  ProductPrice,
  ProductCost,
} from "./product";

// Sales & Debt
export type { MonthlySalesData, DeliveryData, Debt } from "./sales";

// Visit
export type {
  Visit,
  ChecklistItem,
  CompetitorInfo,
  VisitPhoto,
  VisitFilters,
} from "./visit";

// Common
export type {
  PaginationParams,
  PaginatedResult,
  ApiResponse,
  ApiError,
} from "./common";

// ============================================
// PRICING TYPES (from pricing.ts)
// ============================================

export type {
  ProductPrice as PricingProductPrice,
  StorePricing,
  PricingIndex,
  ExcelParseResult,
  ExcelParseError,
  ExcelParseWarning,
} from "./pricing";

export { calculateFinalPrice } from "./pricing";

// ============================================
// NETWORK TYPES (from network.ts)
// ============================================

export type {
  Network,
  NetworkPricing,
  NetworkProductPrice,
  NetworkWithInfo,
} from "./network";

export { generateNetworkId } from "./network";

// ============================================
// COSTS & PROFITABILITY TYPES (from costs.ts)
// ============================================

export type {
  ProductCost as ProductCostNew,
  ProductCostWithTotal,
  CostKey,
  DriverProductCost,
  DriverGroup,
  IndividualDriver,
  ProductProfit,
  StoreProfitSummary,
} from "./costs";

export {
  COST_LABELS,
  COST_KEYS,
  generateDriverGroupId,
  generateIndividualDriverId,
  createEmptyProductCost,
  calculateTotalCost,
  withTotalCost,
} from "./costs";

// ============================================
// TASK TYPES (from task.ts)
// ============================================

export type {
  TaskStatus,
  TaskPriority,
  TaskChecklistItem,
  TaskComment,
  TaskHistoryItem,
  Task,
  TaskAssignee,
  TaskCategory,
  DemoUserRole,
  DemoUser,
} from "./task";

export {
  generateTaskId,
  generateCommentId,
  generateChecklistItemId,
  generateHistoryId,
  calculateDueDate,
  isTaskOverdue,
  TASK_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  DEMO_USER_ROLE_CONFIG,
} from "./task";
