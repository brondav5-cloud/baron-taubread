/**
 * Preview Leumi Bankin.dat: IBM CP862 in the description field, visual (LTR-stored) Hebrew.
 * Node's TextDecoder does not support ibm862 here — batch-decode via PowerShell once per run.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const bankinPath = "c:/Users/דוד ברון/Downloads/Bankin.dat";
const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const b64Path = path.join(scriptDir, "bankin-desc-b64-lines.txt");
const utfPath = path.join(scriptDir, "bankin-desc-utf8-lines.txt");

const raw = fs.readFileSync(bankinPath);
const lines = raw.toString("binary").split(/\r?\n/).filter(Boolean);

function splitCsvLine(line) {
  const parts = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === "," && !inQ) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  return parts;
}

/** First index of a Hebrew letter (Unicode), or full length if none. */
function firstHebrewIndex(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0x0590 && c <= 0x05ff) return i;
  }
  return s.length;
}

/** Visual-stored Hebrew line → logical reading order. */
function visualToLogical(s) {
  const t = s.trimEnd();
  const i = firstHebrewIndex(t);
  return t.slice(0, i) + [...t.slice(i)].reverse().join("");
}

const descB64Lines = [];
for (const line of lines) {
  const p = splitCsvLine(line);
  const desc = p[2] ?? "";
  const inner = desc.startsWith('"') && desc.endsWith('"') ? desc.slice(1, -1) : desc;
  descB64Lines.push(Buffer.from(inner, "binary").toString("base64"));
}

fs.writeFileSync(b64Path, descB64Lines.join("\n"), "utf8");

const psPath = b64Path.replace(/'/g, "''");
const psOut = utfPath.replace(/'/g, "''");
const ps = `
$enc = [System.Text.Encoding]::GetEncoding(862)
$out = New-Object System.Collections.Generic.List[string]
Get-Content -LiteralPath '${psPath}' | ForEach-Object {
  $out.Add($enc.GetString([Convert]::FromBase64String($_)))
}
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('${psOut}', ($out -join [char]10), $utf8)
`;
execFileSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8" });

const decodedLines = fs.readFileSync(utfPath, "utf8").split("\n");

try {
  fs.unlinkSync(b64Path);
  fs.unlinkSync(utfPath);
} catch {
  /* ignore */
}

const dec = lines.filter((ln) => /,\d{2}12\d{2},/.test(ln));
console.log("Total lines:", lines.length, "| December 2025 (MM=12 in date field):", dec.length);
console.log("First 12 rows (logical Hebrew):\n");

for (let i = 0; i < Math.min(12, lines.length); i++) {
  const parts = splitCsvLine(lines[i]);
  const [ref, dmy, , amt, bal] = parts;
  const day = dmy?.slice(0, 2);
  const mon = dmy?.slice(2, 4);
  const yr = dmy?.slice(4, 6);
  const logical = visualToLogical(decodedLines[i] ?? "");
  console.log(
    `${i + 1}. ${day}/${mon}/20${yr} | ref ${ref} | ${logical} | amt ${amt} | bal ${bal}`,
  );
}
