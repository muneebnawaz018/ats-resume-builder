#!/usr/bin/env node
/**
 * Enforces the styling boundary from docs/03-architecture.md.
 *
 * The DOCX serialiser reads the document's resolved styles and maps them onto
 * OOXML, so those styles must stay declared and stable. Emotion's hashed class
 * names and runtime injection would make them opaque. The boundary is easy to
 * cross by accident, and the failure surfaces later, in export, rather than
 * at the point of the mistake.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

const RULES = [
  {
    dir: "src/render",
    forbid: /from\s+["']@mui\//,
    message: "must not import from @mui/*, the document uses plain CSS",
  },
  {
    dir: "src/render",
    forbid: /from\s+["']@emotion\//,
    message: "must not import from @emotion/*, styles must stay declared",
  },
  {
    dir: "src/schema",
    forbid: /from\s+["'](@mui|react|next)\//,
    message: "must stay framework-free so it can run in tests and workers",
  },
  {
    /*
     * Content routes must not pull the MUI runtime. This regressed once by
     * accident: a barrel that exported both design tokens and the MUI theme
     * meant importing a colour put 33KB of Emotion on every static page.
     * Tokens live in @/ui/tokens, which imports nothing.
     */
    dir: "src/app",
    skip: /^src[\\/]app[\\/]resume-builder[\\/]/,
    forbid: /from\s+["'](@mui\/|@emotion\/|@\/ui\/theme|@\/ui\/editor|@\/ui\/design)/,
    message:
      "content routes must not import MUI or editor chrome, only /resume-builder may",
  },
  {
    dir: "src/ui/tokens",
    forbid: /^\s*import\s/m,
    message: "must import nothing, so any route can read a token cheaply",
  },
  {
    dir: "src/ui/site",
    forbid: /from\s+["'](@mui\/|@emotion\/)/,
    message: "site chrome is plain CSS. MUI belongs to the editor",
  },
  {
    /*
     * Document readers stay framework-free: they run in a Node test process
     * with no DOM, which is why the XML scanner exists instead of DOMParser.
     */
    dir: "src/extract",
    forbid: /from\s+["'](@mui\/|@emotion\/|react|next\/|@\/ui\/)/,
    message: "extractors must run without a DOM or a framework",
  },
  {
    /*
     * The readers are loaded on demand from src/extract/index.ts. A static
     * import anywhere else drags the zip inflater and pdf.js onto every page,
     * which is exactly the regression this rule exists to catch.
     */
    dir: "src",
    // Tests name a reader on purpose: they exercise one at a time, and they
    // ship nothing.
    skip: /^src[\\/]extract[\\/]|\.test\.tsx?$/,
    forbid: /from\s+["']@\/extract\/(docx|odt|pdf|rtf|html|text|zip|xml)/,
    message:
      "import a reader through @/extract so it stays lazily loaded, not directly",
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
    if (rule.skip?.test(relative(root, file))) continue;
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
