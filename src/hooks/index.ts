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

// Visits Page hook
export { useVisitsPage, DEMO_VISITS, type Visit } from "./useVisitsPage";

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

// Products Page hook
export {
  useProductsPage,
  type ProductsViewMode,
  type ProductsFilters,
  type ProductsTotals,
} from "./useProductsPage";

// Work Plan hook
export {
  useWorkPlan,
  DAYS,
  PRIORITY_COLORS,
  type PlannedVisit,
} from "./useWorkPlan";

// Profitability hook
export {
  useProfitability,
  PROFITABILITY_COLORS,
  type CityProfitability,
  type CategoryProfitability,
  type StoreProfitability,
} from "./useProfitability";

// Store Detail hook
export {
  useStoreDetail,
  MONTHS as STORE_DETAIL_MONTHS,
  DONUT_COLORS,
  type StoreMonthlyData,
  type StoreTotals,
  type StoreChartData,
  type TopProduct,
} from "./useStoreDetail";

// Dashboard hook
export {
  useDashboard,
  DASHBOARD_CHART_COLORS,
  MONTHS,
  type MonthlyDataPoint,
  type TotalsData as DashboardTotalsData,
  type HalfYearData,
  type CitySalesData,
  type StatusDistributionItem,
  type ChartDataPoint,
} from "./useDashboard";

// Comparison hooks
export {
  useComparison,
  CHART_COLORS,
  type CityStats,
  type ComparisonDataPoint,
} from "./useComparison";

// Stores Page hook
export {
  useStoresPage,
  type ViewMode,
  type SortDirection,
  type SortKey,
  type StoresFilters,
  type TotalsData,
} from "./useStoresPage";

// Store hooks
export {
  useStores,
  useFilteredStores,
  useStore,
  useTopStores,
  useBottomStores,
  useAlertStores,
  useStoresByCity,
  useStoresByAgent,
  useOverviewStats,
  useStoreRankInCity,
  usePrefetchStores,
  usePrefetchStore,
  useStoreStatusCounts,
  useStoreSearch,
  storeKeys,
} from "./useStores";

// Product hooks
export {
  useProducts,
  useFilteredProducts,
  useProduct,
  useCategories,
  useProductsByCategory,
  useTopProducts,
  useBottomProducts,
  useProductsCount,
  useProductStatusCounts,
  useProductsByStatus,
  usePrefetchProducts,
  usePrefetchProduct,
  useProductSearch,
  useCategoryDistribution,
  productKeys,
  type ProductFilterOptions,
} from "./useProducts";

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

// Dashboard Supabase hook
export { useDashboardSupabase } from "./useDashboardSupabase";
