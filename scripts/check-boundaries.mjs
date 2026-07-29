#!/usr/bin/env node
/**
 * Enforces the styling boundary from docs/03-architecture.md.
 *
 * The DOCX serialiser reads the document's resolved styles and maps them onto
 * OOXML, so those styles must stay declared and stable. Emotion's hashed class
 * names and runtime injection would make them opaque. The boundary is easy to
 * cross by accident, and the failure surfaces later — in export — rather than
 * at the point of the mistake.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

const RULES = [
  {
    dir: "src/render",
    forbid: /from\s+["']@mui\//,
    message: "must not import from @mui/* — the document uses plain CSS",
  },
  {
    dir: "src/render",
    forbid: /from\s+["']@emotion\//,
    message: "must not import from @emotion/* — styles must stay declared",
  },
  {
    dir: "src/schema",
    forbid: /from\s+["'](@mui|react|next)\//,
    message: "must stay framework-free so it can run in tests and workers",
  },
];

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

let failures = 0;

for (const rule of RULES) {
  for (const file of walk(join(root, rule.dir))) {
    const source = readFileSync(file, "utf8");
    source.split("\n").forEach((line, i) => {
      if (rule.forbid.test(line)) {
        failures++;
        console.error(
          `${relative(root, file)}:${i + 1}  ${rule.dir} ${rule.message}\n    ${line.trim()}`,
        );
      }
    });
  }
}

if (failures > 0) {
  console.error(`\n${failures} boundary violation(s).`);
  process.exit(1);
}

console.log("Boundaries OK.");
