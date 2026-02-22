import { z } from "zod";
import { VALIDATION_MESSAGES } from "@/lib/constants";

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, VALIDATION_MESSAGES.REQUIRED)
    .email(VALIDATION_MESSAGES.INVALID_EMAIL),
  password: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordSchema = z
  .string()
  .min(8, VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH)
  .regex(/[A-Z]/, VALIDATION_MESSAGES.PASSWORD_UPPERCASE)
  .regex(/[a-z]/, VALIDATION_MESSAGES.PASSWORD_LOWERCASE)
  .regex(/[0-9]/, VALIDATION_MESSAGES.PASSWORD_NUMBER);

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, VALIDATION_MESSAGES.REQUIRED)
      .email(VALIDATION_MESSAGES.INVALID_EMAIL),
    password: passwordSchema,
    confirmPassword: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
    name: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH,
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, VALIDATION_MESSAGES.REQUIRED)
    .email(VALIDATION_MESSAGES.INVALID_EMAIL),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================
// USER SCHEMAS
// ============================================

export const userRoleSchema = z.enum(["superadmin", "admin", "agent"]);

export const userSchema = z.object({
  email: z.string().email(VALIDATION_MESSAGES.INVALID_EMAIL),
  name: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  role: userRoleSchema,
  phone: z.string().optional(),
  companies: z.array(z.string()),
  isActive: z.boolean(),
});

export const createUserSchema = userSchema.extend({
  password: passwordSchema,
});

export const updateUserSchema = userSchema.partial().omit({ email: true });

export type UserInput = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ============================================
// STORE SCHEMAS
// ============================================

export const storeSchema = z.object({
  externalId: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  name: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  network: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  city: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  address: z.string().optional(),
  driver: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  agentId: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  agentName: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateStoreSchema = storeSchema.partial();

export type StoreInput = z.infer<typeof storeSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const productSchema = z.object({
  externalId: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  name: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  category: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  sku: z.string().optional(),
  defaultPrice: z.number().min(0, VALIDATION_MESSAGES.MIN_VALUE(0)),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = productSchema.partial();

export type ProductInput = z.infer<typeof productSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ============================================
// VISIT SCHEMAS
// ============================================

export const checklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  checked: z.boolean(),
  notes: z.string().optional(),
});

export const competitorInfoSchema = z.object({
  name: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  product: z.string().optional(),
  price: z.number().optional(),
  notes: z.string().optional(),
});

export const visitPhotoSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url(),
  caption: z.string().optional(),
  uploadedAt: z.string(),
});

export const visitSchema = z.object({
  storeId: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  storeName: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  date: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  checklist: z.array(checklistItemSchema),
  notes: z.string().optional(),
  competitors: z.array(competitorInfoSchema).optional(),
  photos: z.array(visitPhotoSchema).max(3, "ניתן להעלות עד 3 תמונות"),
  status: z.enum(["draft", "completed"]).default("completed"),
});

export const updateVisitSchema = visitSchema.partial();

export type VisitInput = z.infer<typeof visitSchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;
export type CompetitorInfoInput = z.infer<typeof competitorInfoSchema>;

// ============================================
// PRICING SCHEMAS
// ============================================

export const productPriceSchema = z.object({
  productId: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  storeId: z.string().optional(),
  basePrice: z.number().min(0, VALIDATION_MESSAGES.MIN_VALUE(0)),
  discountPct: z.number().min(0).max(100),
  finalPrice: z.number().min(0),
  validFrom: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  validTo: z.string().optional(),
});

export type ProductPriceInput = z.infer<typeof productPriceSchema>;

// ============================================
// COST SCHEMAS
// ============================================

export const productCostSchema = z.object({
  productId: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  rawMaterials: z.number().min(0, VALIDATION_MESSAGES.MIN_VALUE(0)),
  returnsCost: z.number().min(0, VALIDATION_MESSAGES.MIN_VALUE(0)),
  labor: z.number().min(0, VALIDATION_MESSAGES.MIN_VALUE(0)),
  operations: z.number().min(0, VALIDATION_MESSAGES.MIN_VALUE(0)),
  delivery: z.number().min(0, VALIDATION_MESSAGES.MIN_VALUE(0)),
  other: z.number().min(0, VALIDATION_MESSAGES.MIN_VALUE(0)),
  validFrom: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  validTo: z.string().optional(),
});

export type ProductCostInput = z.infer<typeof productCostSchema>;

// ============================================
// SALES DATA SCHEMAS
// ============================================

export const monthlySalesDataSchema = z.object({
  storeId: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  productId: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  period: z.string().length(6, "פורמט לא תקין (YYYYMM)"),
  year: z.number().min(2000).max(2100),
  month: z.number().min(1).max(12),
  gross: z.number().min(0),
  returns: z.number().min(0),
  returnsPct: z.number().min(0).max(100),
  net: z.number(),
  sales: z.number(),
  driver: z.string(),
  agent: z.string(),
});

export type MonthlySalesDataInput = z.infer<typeof monthlySalesDataSchema>;

// ============================================
// DEBT SCHEMAS
// ============================================

export const debtSchema = z.object({
  storeId: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  storeName: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  period: z.string().length(6),
  amount: z.number(),
  dueDate: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
});

export type DebtInput = z.infer<typeof debtSchema>;

// ============================================
// FILTER SCHEMAS
// ============================================

export const storeFiltersSchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  network: z.string().optional(),
  agent: z.string().optional(),
  driver: z.string().optional(),
  status: z
    .enum(["rising", "growth", "stable", "decline", "crash", "new", "inactive"])
    .optional(),
  isActive: z.boolean().optional(),
});

export const productFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const visitFiltersSchema = z.object({
  search: z.string().optional(),
  storeId: z.string().optional(),
  agentId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(["draft", "completed"]).optional(),
});

export type StoreFiltersInput = z.infer<typeof storeFiltersSchema>;
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
export type VisitFiltersInput = z.infer<typeof visitFiltersSchema>;
