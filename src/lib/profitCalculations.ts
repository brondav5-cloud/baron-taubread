// ============================================
// PROFITABILITY CALCULATIONS
// ============================================

import type {
  ProductProfit,
  StoreProfitSummary,
  ProductCostWithTotal,
} from "@/types/costs";
import type { StoreWithStatus, ProductWithStatus } from "@/types/data";

export interface ProfitCalculatorContext {
  getProductCost: (productId: number) => ProductCostWithTotal | null;
  getDeliveryCost: (driverName: string, productId: number) => number;
  getDriverGroup: (driverName: string) => { id: string; name: string } | null;
}

// ============================================
// SINGLE PRODUCT PROFIT
// ============================================

interface ProductSaleData {
  productId: number;
  productName: string;
  category: string;
  netQty: number; // כמות נטו
  grossQty: number; // כמות ברוטו
  unitPrice: number; // מחיר ליחידה
}

/**
 * חישוב רווחיות למוצר בודד בחנות
 */
export function calculateProductProfit(
  saleData: ProductSaleData,
  driverName: string,
  ctx: ProfitCalculatorContext,
): ProductProfit {
  const { productId, productName, category, netQty, grossQty, unitPrice } =
    saleData;

  const productCost = ctx.getProductCost(productId);
  const deliveryCost = ctx.getDeliveryCost(driverName, productId);

  // הכנסה
  const revenue = netQty * unitPrice;

  // עלויות
  const rawMaterialCost = grossQty * (productCost?.rawMaterial ?? 0);
  const laborCost = grossQty * (productCost?.labor ?? 0);
  const operationalCost = netQty * (productCost?.operational ?? 0);
  const packagingCost = netQty * (productCost?.packaging ?? 0);
  const storageCost = netQty * (productCost?.storage ?? 0);
  const miscCost = netQty * (productCost?.misc ?? 0);
  const totalDeliveryCost = netQty * deliveryCost;

  // סה"כ עלויות
  const productionCost =
    rawMaterialCost + laborCost + packagingCost + storageCost;
  const totalCost =
    productionCost + operationalCost + miscCost + totalDeliveryCost;

  // רווחים
  const grossProfit = revenue - (rawMaterialCost + laborCost);
  const operatingProfit =
    grossProfit - (operationalCost + packagingCost + storageCost);
  const netProfit = operatingProfit - (totalDeliveryCost + miscCost);

  // אחוז רווח
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    productId,
    productName,
    category,
    qty: netQty,
    grossQty,
    revenue,
    productionCost,
    deliveryCost: totalDeliveryCost,
    totalCost,
    grossProfit,
    operatingProfit,
    netProfit,
    profitMargin,
  };
}

// ============================================
// STORE PROFIT SUMMARY
// ============================================

interface StoreSaleData {
  storeId: number;
  storeName: string;
  driverName: string;
  products: ProductSaleData[];
}

/**
 * חישוב סיכום רווחיות לחנות
 */
export function calculateStoreProfitSummary(
  storeData: StoreSaleData,
  ctx: ProfitCalculatorContext,
): StoreProfitSummary {
  const { storeId, storeName, driverName, products } = storeData;

  const driverGroup = ctx.getDriverGroup(driverName);

  const productProfits = products.map((product) =>
    calculateProductProfit(product, driverName, ctx),
  );

  // סיכומים
  const totalRevenue = productProfits.reduce((sum, p) => sum + p.revenue, 0);
  const totalProductionCost = productProfits.reduce(
    (sum, p) => sum + p.productionCost,
    0,
  );
  const totalDeliveryCost = productProfits.reduce(
    (sum, p) => sum + p.deliveryCost,
    0,
  );
  const totalCost = productProfits.reduce((sum, p) => sum + p.totalCost, 0);

  const grossProfit = productProfits.reduce((sum, p) => sum + p.grossProfit, 0);
  const operatingProfit = productProfits.reduce(
    (sum, p) => sum + p.operatingProfit,
    0,
  );
  const netProfit = productProfits.reduce((sum, p) => sum + p.netProfit, 0);

  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    storeId,
    storeName,
    driverGroupId: driverGroup?.id ?? null,
    driverGroupName: driverGroup?.name ?? null,
    totalRevenue,
    totalProductionCost,
    totalDeliveryCost,
    totalCost,
    grossProfit,
    operatingProfit,
    netProfit,
    profitMargin,
    products: productProfits,
  };
}

// ============================================
// QUICK CALCULATIONS (לתצוגה מהירה)
// ============================================

/**
 * חישוב מהיר של רווחיות משוערת לחנות
 * (ללא פירוט מוצרים - לתצוגה בטבלאות)
 */
export function calculateQuickStoreProfit(
  store: StoreWithStatus,
  avgMargin: number = 0.32, // ברירת מחדל 32%
): { estimatedProfit: number; margin: number } {
  const revenue = store.sales_2025 || 0;
  const estimatedProfit = revenue * avgMargin;

  return {
    estimatedProfit,
    margin: avgMargin * 100,
  };
}

/**
 * חישוב מהיר של רווחיות משוערת למוצר
 */
export function calculateQuickProductProfit(
  product: ProductWithStatus,
  avgMargin: number = 0.35, // ברירת מחדל 35%
): { estimatedProfit: number; margin: number } {
  const revenue = product.sales_2025 || 0;
  const estimatedProfit = revenue * avgMargin;

  return {
    estimatedProfit,
    margin: avgMargin * 100,
  };
}

// ============================================
// AGGREGATIONS
// ============================================

/**
 * סיכום רווחיות לפי קטגוריות
 */
export function aggregateProfitByCategory(products: ProductProfit[]): Array<{
  category: string;
  revenue: number;
  profit: number;
  margin: number;
}> {
  const categoryMap = new Map<string, { revenue: number; profit: number }>();

  products.forEach((product) => {
    const existing = categoryMap.get(product.category) ?? {
      revenue: 0,
      profit: 0,
    };
    categoryMap.set(product.category, {
      revenue: existing.revenue + product.revenue,
      profit: existing.profit + product.netProfit,
    });
  });

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    revenue: data.revenue,
    profit: data.profit,
    margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
  }));
}

/**
 * בדיקה האם ניתן לחשב רווחיות (יש עלויות מוגדרות)
 */
export function canCalculateProfitability(
  costs: ProductCostWithTotal[],
): boolean {
  return costs.some((cost) => cost.totalCost > 0);
}
