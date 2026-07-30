/**
 * Renders every icon the app ships from the single master at /icon.svg.
 *
 * Generated rather than hand-exported, for the same reason FORMULA.md is: a
 * mark that lives in six files drifts the first time somebody nudges it and
 * misses one. Change icon.svg, run this, done.
 *
 * Outputs are committed. They are brand assets, not build artefacts, and
 * regenerating them on every install would put binary churn in review diffs
 * for nothing.
 *
 * Run: npm run icons
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(ROOT, "icon.svg"));

/** The tile colour, also the theme-color in layout.tsx. */
const TILE = "#0F6FB8";

/*
 * Rasterised at high density and then resized, rather than rendered straight
 * to the target size. librsvg rounds geometry to the pixel grid as it draws,
 * so rendering a 32 unit grid at 16px loses the half-unit bar positions
 * outright. Drawing large and downsampling keeps them.
 */
const png = (size) => sharp(svg, { density: 512 }).resize(size, size).png();

/**
 * Builds a .ico holding several sizes.
 *
 * Hand-assembled because sharp cannot emit ICO. The format is a 6 byte
 * header, a 16 byte directory entry per image, then the payloads. PNG
 * payloads are legal inside ICO and every browser still in use reads them,
 * which avoids encoding BMP with its upside-down rows and its doubled height
 * for the AND mask.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon, 2 would be cursor
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    // The field is one byte, so 256 is stored as 0.
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette entries, 0 for truecolour
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const log = [];
const write = (rel, buf) => {
  writeFileSync(join(ROOT, rel), buf);
  log.push(`  ${rel.padEnd(28)} ${(buf.length / 1024).toFixed(1)} KB`);
};

/*
 * Modern browsers scale the SVG themselves, so it is copied rather than
 * rasterised. Next generates the <link> tag for anything named icon.* in the
 * app directory.
 */
write("src/app/icon.svg", svg);

/*
 * iOS composites any transparency onto black and applies its own corner
 * rounding, so this one is flattened onto the tile colour first.
 */
write(
  "src/app/apple-icon.png",
  await sharp(svg, { density: 512 })
    .resize(180, 180)
    .flatten({ background: TILE })
    .png()
    .toBuffer(),
);

/*
 * Legacy, and still the first thing several crawlers and feed readers ask
 * for. 48 is included because Windows taskbar pins use it.
 */
write(
  "src/app/favicon.ico",
  ico(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({
        size,
        data: await png(size).toBuffer(),
      })),
    ),
  ),
);

// Android install prompt, referenced from the manifest.
for (const size of [192, 512]) {
  write(`public/icon-${size}.png`, await png(size).toBuffer());
}

console.log(`icons, from icon.svg\n${log.join("\n")}`);
