#!/usr/bin/env node
/**
 * יוצר אייקוני PWA (192x192, 512x512) + favicon.ico
 * הרצה: node scripts/generate-pwa-icons.js
 * דרוש: npm install sharp --save-dev
 */
const fs = require('fs');
const path = require('path');

function buildIco(pngBuffer) {
  const dir = Buffer.alloc(16);
  dir.writeUInt8(0, 0);   // width  (0 = 256, but we use 32 so write 32)
  dir.writeUInt8(0, 1);   // height
  dir.writeUInt8(0, 2);   // color palette
  dir.writeUInt8(0, 3);   // reserved
  dir.writeUInt16LE(1, 4);  // color planes
  dir.writeUInt16LE(32, 6); // bits per pixel
  dir.writeUInt32LE(pngBuffer.length, 8);  // image data size
  dir.writeUInt32LE(6 + 16, 12);           // offset to image data

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = ICO
  header.writeUInt16LE(1, 4); // 1 image

  return Buffer.concat([header, dir, pngBuffer]);
}

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

  const publicDir = path.join(__dirname, '..', 'public');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6"/>
          <stop offset="100%" style="stop-color:#2563eb"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="url(#bg)"/>
      <text x="256" y="310" text-anchor="middle" font-size="240" font-weight="bold"
            font-family="Arial,sans-serif" fill="white">B</text>
    </svg>
  `;

  // Generate PWA icons
  for (const size of [192, 512]) {
    const outPath = path.join(publicDir, `icon-${size}.png`);
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
    console.log(`נוצר: icon-${size}.png`);
  }

  // Generate favicon.ico (32x32 PNG wrapped in ICO format)
  const png32 = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
  const icoBuffer = buildIco(png32);
  const faviconPath = path.join(publicDir, 'favicon.ico');
  fs.writeFileSync(faviconPath, icoBuffer);
  console.log('נוצר: favicon.ico');

  console.log('כל האייקונים נוצרו בהצלחה.');
}

main().catch((err) => {
  console.error('שגיאה:', err.message);
  process.exit(1);
});
