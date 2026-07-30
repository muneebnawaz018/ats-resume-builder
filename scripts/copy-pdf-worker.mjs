/**
 * Copies the pdf.js worker into public/.
 *
 * This app is a static export, so there is no server to hand out a hashed
 * chunk on demand and a bare "pdfjs-dist/..." specifier would not resolve in
 * the browser. The worker has to be a real file at a known URL, and the
 * version has to match the library it was installed with, copying it at
 * build time is what keeps the two from drifting after an upgrade.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const source = join(
  dirname(require.resolve("pdfjs-dist/package.json")),
  "build",
  "pdf.worker.min.mjs",
);
const target = join(ROOT, "public", "pdf.worker.min.mjs");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("public/pdf.worker.min.mjs");
