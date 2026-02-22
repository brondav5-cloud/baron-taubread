#!/usr/bin/env node
/**
 * יוצר אייקוני PWA (192x192, 512x512)
 * הרצה: node scripts/generate-pwa-icons.js
 * דרוש: npm install sharp --save-dev
 */
const fs = require('fs');
const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('מתקין sharp...');
    require('child_process').execSync('npm install sharp --save-dev', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    sharp = require('sharp');
  }

  const sizes = [192, 512];
  const publicDir = path.join(__dirname, '..', 'public');

  // SVG פשוט - עיגול כחול עם אייקון לחם
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6"/>
          <stop offset="100%" style="stop-color:#2563eb"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="url(#bg)"/>
      <circle cx="256" cy="256" r="80" fill="rgba(255,255,255,0.3)"/>
    </svg>
  `;

  for (const size of sizes) {
    const outPath = path.join(publicDir, `icon-${size}.png`);
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`נוצר: ${outPath}`);
  }

  console.log('האייקונים נוצרו בהצלחה.');
}

main().catch((err) => {
  console.error('שגיאה:', err.message);
  process.exit(1);
});
