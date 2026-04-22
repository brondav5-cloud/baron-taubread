import type { MatchField } from "./match";

interface ReviewTx {
  description: string;
  supplier_name: string | null;
}

interface ReviewRule {
  match_field: MatchField;
  match_value: string;
}

function isGenericDescription(text: string): boolean {
  const v = text.trim().toLowerCase();
  if (!v) return true;
  const generic = [
    "העברה",
    "העברה דיגיטל",
    "העברה בנקאית",
    "תשלום",
    "חיוב",
    "זיכוי",
    "הפקדה",
    "פקודת חיוב",
    "פקודת זיכוי",
  ];
  return generic.some((g) => v === g || v.startsWith(`${g} `));
}

export function getReviewReason(tx: ReviewTx, rule: ReviewRule, normalizedRuleValue: string): string | null {
  if (rule.match_field === "description" && isGenericDescription(tx.description ?? "")) {
    return "תיאור תנועה כללי — מומלץ לבדוק שהסיווג מדויק";
  }
  if (rule.match_field === "description" && normalizedRuleValue.length <= 4) {
    return "כלל תיאור קצר במיוחד — ייתכנו התאמות רחבות";
  }
  if (rule.match_field === "description" && !(tx.supplier_name ?? "").trim()) {
    return "סיווג לפי תיאור בלי שם ספק — דורש בדיקה ידנית";
  }
  if (rule.match_field === "supplier_name" && !(tx.supplier_name ?? "").trim()) {
    return "כלל ספק הופעל ללא שם ספק — דורש בדיקה";
  }
  return null;
}
