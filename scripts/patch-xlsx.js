#!/usr/bin/env node
/**
 * Patches xlsx library to suppress "Unknown Namespace" errors caused by
 * SWC minifier mangling internal namespace constants.
 *
 * The namespace checks in parse_ct() and parse_wb_xml() are validation-only —
 * all data is already parsed before they run. Converting throws to warnings
 * lets parsing continue normally.
 *
 * Runs automatically via npm postinstall.
 */
const fs = require('fs');
const path = require('path');

const targets = ['xlsx.mjs', 'xlsx.js'];
const xlsxDir = path.join(__dirname, '..', 'node_modules', 'xlsx');

const replacements = [
  {
    from: 'if(ct.xmlns !== XMLNS.CT) throw new Error("Unknown Namespace: " + ct.xmlns)',
    to:   'if(ct.xmlns !== XMLNS.CT) { if(typeof console !== "undefined") console.warn("xlsx: unexpected CT namespace: " + ct.xmlns); }',
  },
  {
    from: 'if(XMLNS_main.indexOf(wb.xmlns) === -1) throw new Error("Unknown Namespace: " + wb.xmlns)',
    to:   'if(XMLNS_main.indexOf(wb.xmlns) === -1) { if(typeof console !== "undefined") console.warn("xlsx: unexpected WB namespace: " + wb.xmlns); }',
  },
];

let patched = 0;

for (const file of targets) {
  const filePath = path.join(xlsxDir, file);
  if (!fs.existsSync(filePath)) continue;

  let src = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { from, to } of replacements) {
    if (src.includes(from)) {
      src = src.replace(from, to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, src, 'utf8');
    patched++;
    console.log(`[patch-xlsx] Patched ${file}`);
  }
}

if (patched === 0) {
  console.log('[patch-xlsx] Nothing to patch (already patched or targets not found)');
} else {
  console.log(`[patch-xlsx] Done — ${patched} file(s) patched`);
}
