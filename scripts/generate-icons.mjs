#!/usr/bin/env node

/**
 * Generate PWA icon PNGs from an SVG using sharp or sips (macOS).
 * Run once: node scripts/generate-icons.mjs
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="76" fill="#7c3aed"/>
  <text x="256" y="280" text-anchor="middle" fill="white"
    font-family="system-ui,-apple-system,sans-serif" font-weight="bold" font-size="320">S</text>
</svg>`;

const svgPath = path.join(publicDir, "_icon.svg");
fs.writeFileSync(svgPath, svg);

for (const size of [192, 512]) {
  const out = path.join(publicDir, `icon-${size}.png`);
  try {
    // Try sharp first (if installed)
    execSync(
      `node -e "require('sharp')('${svgPath}').resize(${size},${size}).png().toFile('${out}')"`,
      { stdio: "pipe" }
    );
  } catch {
    // macOS fallback: sips can convert SVG to PNG
    try {
      // Use rsvg-convert if available (brew install librsvg)
      execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${out}"`, {
        stdio: "pipe",
      });
    } catch {
      // Last resort: use qlmanage (macOS Quick Look)
      execSync(
        `qlmanage -t -s ${size} -o "${publicDir}" "${svgPath}" 2>/dev/null && mv "${publicDir}/_icon.svg.png" "${out}"`,
        { stdio: "pipe" }
      );
    }
  }
  console.log(`  Generated icon-${size}.png`);
}

// Clean up temp SVG
fs.unlinkSync(svgPath);
console.log("  Done.");
