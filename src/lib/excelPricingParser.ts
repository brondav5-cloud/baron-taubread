// ============================================
// EXCEL PRICING PARSER
// ============================================

import type {
  StorePricing,
  ProductPrice,
  ExcelParseResult,
} from "@/types/pricing";

// Default column mapping (A=0, B=1, ...)
const DEFAULT_COL = {
  PRODUCT_ID: 0,
  STORE_ID: 1,
  STORE_NAME: 2,
  AGENT: 3,
  DRIVER: 4,
  VAT: 5,
  PRICE: 6,
  DISCOUNT: 7,
  FINAL_PRICE: 8,
};

// Header keywords for auto-detection – ספציפיים כדי שלא יזוהו עמודות שגויות
// (למשל "שם לקוח" לא צריך להתאים ל-STORE_ID)
const HEADERS: Record<keyof typeof DEFAULT_COL, string[]> = {
  PRODUCT_ID: ["מזהה מוצר", 'מק"ט מוצר', "product"],
  STORE_ID: ["מזהה לקוח", "מזהה חנות", 'מק"ט לקוח', "store id"],
  STORE_NAME: ["שם לקוח", "שם חנות", "שם store", "name"],
  AGENT: ["קו חלוקה", "סוכן", "רשת", "agent"],
  DRIVER: ["נהג", "driver"],
  VAT: ['מע"מ', "מעמ", "vat"],
  PRICE: ["מחיר ליחידה", "מחיר", "מחיר בסיס", "price"],
  DISCOUNT: ["הנחה", "discount"],
  FINAL_PRICE: ["לאחר הנחה", "מחיר סופי", "final"],
};

function detectColumns(headerRow: unknown[]): typeof DEFAULT_COL {
  const col: Record<string, number> = {};
  const normalized = (s: string) =>
    String(s ?? "")
      .trim()
      .toLowerCase();

  for (let i = 0; i < headerRow.length; i++) {
    const cell = normalized(String(headerRow[i] ?? ""));
    for (const [key, keywords] of Object.entries(HEADERS)) {
      if (keywords.some((k) => cell.includes(normalized(k)))) {
        col[key] = i;
        break;
      }
    }
  }

  return {
    PRODUCT_ID: col.PRODUCT_ID ?? DEFAULT_COL.PRODUCT_ID,
    STORE_ID: col.STORE_ID ?? DEFAULT_COL.STORE_ID,
    STORE_NAME: col.STORE_NAME ?? DEFAULT_COL.STORE_NAME,
    AGENT: col.AGENT ?? DEFAULT_COL.AGENT,
    DRIVER: col.DRIVER ?? DEFAULT_COL.DRIVER,
    VAT: col.VAT ?? DEFAULT_COL.VAT,
    PRICE: col.PRICE ?? DEFAULT_COL.PRICE,
    DISCOUNT: col.DISCOUNT ?? DEFAULT_COL.DISCOUNT,
    FINAL_PRICE: col.FINAL_PRICE ?? DEFAULT_COL.FINAL_PRICE,
  };
}

function isHeaderRow(row: unknown[]): boolean {
  if (!row?.length) return false;
  const first = toNumber(row[0]);
  const second = toNumber(row[1]);
  return (
    (first === null || first === undefined) &&
    (second === null || second === undefined)
  );
}

export async function parseExcelPricing(file: File): Promise<ExcelParseResult> {
  try {
    const { loadXlsx } = await import("./loadXlsx");
    const XLSX = await loadXlsx();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return errorResult("הקובץ ריק");
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return errorResult("לא ניתן לקרוא את הגיליון");
    }
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    });

    if (rows.length < 2) {
      return errorResult("אין שורות נתונים");
    }

    const headerRow = rows[0] ?? [];
    const hasHeader = isHeaderRow(headerRow);
    const COL = hasHeader ? detectColumns(headerRow) : DEFAULT_COL;
    const dataStart = hasHeader ? 1 : 0;

    const errors: ExcelParseResult["errors"] = [];
    const storeNameByKey = new Map<string, StorePricing>();

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const productId = toNumber(row[COL.PRODUCT_ID]);
      const storeId = toNumber(row[COL.STORE_ID]);
      const storeName = toString(row[COL.STORE_NAME]);

      if (!productId) continue;
      if (!storeId && !storeName) continue;

      const storeKey =
        storeId !== null && storeId !== 0
          ? `id:${storeId}`
          : storeName
            ? `name:${storeName}`
            : `row:${i}`;

      const basePrice = toNumber(row[COL.PRICE]);
      if (basePrice === null) {
        errors.push({ row: i + 1, message: "מחיר חסר" });
        continue;
      }

      let store = storeNameByKey.get(storeKey);
      if (!store) {
        store = {
          storeId: storeId ?? (storeName ? hashCode(storeName) : 0),
          storeName: storeName || `חנות ${storeId ?? ""}`,
          agent: toString(row[COL.AGENT]),
          driver: toString(row[COL.DRIVER]),
          storeDiscount: 0,
          excludedProductIds: [],
          products: [],
          lastUpdated: new Date().toISOString(),
        };
        storeNameByKey.set(storeKey, store);
      }

      const discount = toNumber(row[COL.DISCOUNT]) || 0;
      const product: ProductPrice = {
        productId,
        basePrice,
        productDiscount: discount,
        priceAfterProductDiscount:
          toNumber(row[COL.FINAL_PRICE]) ?? basePrice * (1 - discount / 100),
        isExcludedFromStoreDiscount: false,
      };
      const existingIdx = store.products.findIndex(
        (p) => p.productId === productId,
      );
      if (existingIdx >= 0) {
        store.products[existingIdx] = product;
      } else {
        store.products.push(product);
      }
    }

    const storePricings = Array.from(storeNameByKey.values());

    if (storePricings.length === 0) {
      return errorResult(
        "לא נמצאו נתונים תקפים. וודא שבעמודות A,B יש מספרים (מזהה מוצר, מזהה חנות) ובעמודה G מחיר.",
      );
    }

    const allProducts = new Set<number>();
    storePricings.forEach((s) =>
      s.products.forEach((p) => allProducts.add(p.productId)),
    );

    return {
      success: true,
      storePricings,
      summary: {
        totalRows: rows.length - dataStart,
        totalStores: storePricings.length,
        totalProducts: allProducts.size,
      },
      errors,
      warnings: [],
    };
  } catch (err) {
    return errorResult(
      err instanceof Error ? err.message : "שגיאה בקריאת הקובץ",
    );
  }
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  if (!isNaN(n)) return n;
  const s = String(val).trim();
  const match = s.match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

function toString(val: unknown): string {
  return val === null || val === undefined ? "" : String(val).trim();
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 1000000;
}

function errorResult(message: string): ExcelParseResult {
  return {
    success: false,
    storePricings: [],
    summary: { totalRows: 0, totalStores: 0, totalProducts: 0 },
    errors: [{ row: 0, message }],
    warnings: [],
  };
}
