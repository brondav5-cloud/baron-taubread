import { z } from "zod";

// ============================================
// MONTHLY DATA SCHEMA
// ============================================

export const monthlyDataSchema = z.record(z.string(), z.number());

// ============================================
// STORE DATA SCHEMA (matches stores.json)
// ============================================

export const storeDataSchema = z.object({
  id: z.number(),
  name: z.string(),
  city: z.string(),
  network: z.string(),
  driver: z.string(),
  agent: z.string(),

  // Yearly totals
  qty_2024: z.number(),
  qty_2025: z.number(),
  qty_total: z.number(),
  sales_2024: z.number(),
  sales_2025: z.number(),

  // Period quantities
  qty_prev6: z.number(),
  qty_last6: z.number(),
  qty_prev3: z.number(),
  qty_last3: z.number(),
  qty_prev2: z.number(),
  qty_last2: z.number(),

  // Metrics
  metric_12v12: z.number(),
  metric_6v6: z.number(),
  metric_3v3: z.number(),
  metric_2v2: z.number(),
  metric_peak_distance: z.number(),
  peak_value: z.number(),
  current_value: z.number(),

  // Returns
  returns_pct_prev6: z.number(),
  returns_pct_last6: z.number(),
  returns_change: z.number(),

  // Monthly data
  monthly_qty: monthlyDataSchema,
  monthly_sales: monthlyDataSchema,
  monthly_gross: monthlyDataSchema,
  monthly_returns: monthlyDataSchema.optional(),
  monthly_deliveries: monthlyDataSchema.optional(),

  // Status
  is_inactive: z.boolean().optional(),
});

export const storesArraySchema = z.array(storeDataSchema);

export type StoreDataInput = z.infer<typeof storeDataSchema>;

// ============================================
// PRODUCT DATA SCHEMA (matches products.json)
// ============================================

export const productDataSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(),

  // Yearly totals
  qty_2024: z.number(),
  qty_2025: z.number(),
  qty_total: z.number(),
  sales_2024: z.number(),
  sales_2025: z.number(),

  // Period quantities
  qty_prev6: z.number(),
  qty_last6: z.number(),
  qty_prev3: z.number(),
  qty_last3: z.number(),
  qty_prev2: z.number(),
  qty_last2: z.number(),

  // Metrics
  metric_12v12: z.number(),
  metric_6v6: z.number(),
  metric_3v3: z.number(),
  metric_2v2: z.number(),
  metric_peak_distance: z.number(),
  peak_value: z.number(),
  current_value: z.number(),

  // Returns
  returns_pct_prev6: z.number(),
  returns_pct_last6: z.number(),
  returns_change: z.number(),

  // Monthly data
  monthly_qty: monthlyDataSchema,
  monthly_sales: monthlyDataSchema,
});

export const productsArraySchema = z.array(productDataSchema);

export type ProductDataInput = z.infer<typeof productDataSchema>;

// ============================================
// FILTERS DATA SCHEMA (matches filters.json)
// ============================================

export const filtersDataSchema = z.object({
  cities: z.array(z.string()),
  networks: z.array(z.string()),
  drivers: z.array(z.string()),
  agents: z.array(z.string()),
});

export type FiltersDataInput = z.infer<typeof filtersDataSchema>;

// ============================================
// HOLIDAYS DATA SCHEMA (matches holidays.json)
// ============================================

export const holidayTypeSchema = z.enum([
  "closed",
  "pre_holiday",
  "partial",
  "active",
]);

export const holidayWeekSchema = z.object({
  name: z.string(),
  type: holidayTypeSchema,
  dates: z.string(),
});

export const holidayTypeInfoSchema = z.object({
  label: z.string(),
  emoji: z.string(),
});

export const holidaysDataSchema = z.object({
  weeks: z.record(z.string(), holidayWeekSchema),
  types: z.record(holidayTypeSchema, holidayTypeInfoSchema),
});

export type HolidaysDataInput = z.infer<typeof holidaysDataSchema>;

// ============================================
// VALIDATION HELPER FUNCTIONS
// ============================================

export function validateStores(data: unknown): StoreDataInput[] {
  const result = storesArraySchema.safeParse(data);
  if (!result.success) {
    console.error("Store data validation failed:", result.error.issues);
    throw new Error(
      `Invalid store data: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  return result.data;
}

export function validateProducts(data: unknown): ProductDataInput[] {
  const result = productsArraySchema.safeParse(data);
  if (!result.success) {
    console.error("Product data validation failed:", result.error.issues);
    throw new Error(
      `Invalid product data: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  return result.data;
}

export function validateFilters(data: unknown): FiltersDataInput {
  const result = filtersDataSchema.safeParse(data);
  if (!result.success) {
    console.error("Filters data validation failed:", result.error.issues);
    throw new Error(
      `Invalid filters data: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  return result.data;
}

export function validateHolidays(data: unknown): HolidaysDataInput {
  const result = holidaysDataSchema.safeParse(data);
  if (!result.success) {
    console.error("Holidays data validation failed:", result.error.issues);
    throw new Error(
      `Invalid holidays data: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  return result.data;
}
