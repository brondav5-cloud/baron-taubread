const XLSX = require("xlsx");
const wb = XLSX.readFile("docs/Sapakim Data.xlsx");
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

// Look at the summary block rows that come AFTER "סה"כ"
console.log("=== SUMMARY BLOCK EXAMPLES ===\n");
let found = 0;
for (let i = 0; i < data.length; i++) {
  const first = String(data[i][0] || "").trim();
  if (first.includes('סה"כ') || first.includes("סה״כ")) {
    console.log("Row " + i + ": " + JSON.stringify(data[i]));
    // Show next 3 rows - these are the continuation summary rows
    for (let j = i + 1; j <= Math.min(i + 3, data.length - 1); j++) {
      const col14 = data[j][14];
      const col15 = data[j][15];
      const col16 = data[j][16];
      console.log("Row " + j + ": col14=" + JSON.stringify(col14) + " col15=" + JSON.stringify(col15) + " col16=" + JSON.stringify(col16));
      console.log("  col14 type=" + typeof col14 + " col15 type=" + typeof col15);
    }
    console.log("");
    found++;
    if (found >= 3) break;
  }
}

// Count how many "continuation" summary rows exist (rows after סה"כ that have text in debit/credit cols)
let continuationRows = 0;
let inSummary = false;
let summaryCountdown = 0;
for (let i = 0; i < data.length; i++) {
  const first = String(data[i][0] || "").trim();
  if (first.includes('סה"כ') || first.includes("סה״כ")) {
    inSummary = true;
    summaryCountdown = 2;
    continue;
  }
  if (inSummary && summaryCountdown > 0) {
    continuationRows++;
    summaryCountdown--;
    if (summaryCountdown === 0) inSummary = false;
  }
}
console.log("Total continuation summary rows (after סהכ):", continuationRows);

// Check: rows without date that have value
let noDateWithValue = 0;
for (let i = 4; i < data.length; i++) {
  const dateVal = data[i][8];
  const hasDate = typeof dateVal === "number" && dateVal > 30000 && dateVal < 60000;
  const col15 = data[i][15];
  const col14 = data[i][14];
  if (!hasDate && (typeof col15 === "number" || typeof col14 === "number")) {
    noDateWithValue++;
  }
}
console.log("Rows with no date but numeric credit/debit:", noDateWithValue);
