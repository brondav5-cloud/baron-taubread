// Global Search hook
export { useGlobalSearch, type SearchResult } from "./useGlobalSearch";

// New Visit hook
export {
  useNewVisit,
  type ChecklistItem,
  type Photo,
  type SelectedCompetitor,
} from "./useNewVisit";

// Visit Settings hooks
export {
  useChecklistSettings,
  useCompetitorsSettings,
  DEFAULT_CHECKLIST,
  DEFAULT_COMPETITORS,
  type ChecklistItem as SettingsChecklistItem,
  type CompetitorItem,
} from "./useVisitSettings";

// Treatment hook
export {
  useTreatment,
  ALERT_CONFIG,
  TREATMENT_STATUS_CONFIG,
  type TreatmentStatus,
  type AlertType,
  type TreatmentStore,
} from "./useTreatment";

// Settings hook
export { useSettings } from "./useSettings";

// Product Detail hook
export {
  useProductDetail,
  PRODUCT_MONTHS,
  PRODUCT_DONUT_COLORS,
  type ProductMonthlyData,
  type ProductTotals,
  type ProductChartData,
  type TopStore,
} from "./useProductDetail";

// Work Plan hook
export {
  useWorkPlan,
  DAYS,
  PRIORITY_COLORS,
  type PlannedVisit,
} from "./useWorkPlan";

// Dashboard Supabase hook
export { useDashboardSupabase } from "./useDashboardSupabase";

// Pricing hooks
export { usePricing, useStorePricing } from "./usePricing";
export { usePricingUpload, type UploadStatus } from "./usePricingUpload";
export { useStoreDiscount } from "./useStoreDiscount";

// Network hooks
export {
  useNetworks,
  useNetworkPricing,
  useNetworkDetail,
} from "./useNetworks";

// Costs hooks
export {
  useCosts,
  COST_LABELS,
  type ProductCostRow,
  type CostsFilters,
  type DragFillState,
} from "./useCosts";

// Driver Groups hooks
export {
  useDriverGroups,
  type DriverGroupWithInfo,
  type IndividualDriverWithInfo,
  type EditModalState,
} from "./useDriverGroups";

// Store Profitability hook
export {
  useStoreProfitability,
  type StoreProfitData,
} from "./useStoreProfitability";

// Profitability Page hook
export {
  useProfitabilityPage,
  PROFIT_TYPE_LABELS,
  type ProfitType,
  type SortField as ProfitSortField,
  type ProfitFilters,
  type StoreProfitRow,
} from "./useProfitabilityPage";

// Period Selector hook
export {
  usePeriodSelector,
  type PeriodType,
  type PeriodSelection,
  type ComparePeriodSelection,
  type PeriodSelectorState,
  type DefaultPeriodType,
  type UsePeriodSelectorReturn,
} from "./usePeriodSelector";

// Supabase Data hook
export { useSupabaseData } from "./useSupabaseData";
