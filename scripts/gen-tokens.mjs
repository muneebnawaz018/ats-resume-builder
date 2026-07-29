#!/usr/bin/env node
/**
 * Writes src/app/tokens.generated.css from src/ui/theme/tokens.ts.
 *
 * Tokens stay defined once in TypeScript (where the MUI theme reads them) but
 * reach plain CSS as a real stylesheet rather than an injected <style> tag.
 * That keeps them out of the hydration path entirely — a browser extension
 * that rewrites <head> cannot cause a mismatch in something React never
 * renders.
 *
 * Runs before dev and build. Do not edit the generated file.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const src = join(root, "src/ui/theme/tokens.ts");
const out = join(root, "src/app/tokens.generated.css");

const source = readFileSync(src, "utf8");

/** Pulls `name: "value",` pairs out of a top-level `export const X = {...}`. */
function readGroup(name) {
  const start = source.indexOf(`export const ${name} = {`);
  if (start === -1) throw new Error(`gen-tokens: group "${name}" not found`);
  const body = source.slice(start, source.indexOf("} as const", start));
  const entries = {};
  for (const [, key, value] of body.matchAll(/^\s*(\w+):\s*"([^"]+)"/gm)) {
    entries[key] = value;
  }
  return entries;
}

const kebab = (s) => s.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase();

const tone = readGroup("tone");
const blue = readGroup("blue");
const severity = readGroup("severity");

const lines = [
  ...Object.entries(tone).map(([k, v]) => `  --${kebab(k)}: ${v};`),
  ...Object.entries(blue).map(([k, v]) => `  --${kebab(k)}: ${v};`),
  ...Object.entries(severity).map(([k, v]) => `  --${kebab(k)}: ${v};`),
  "  --radius-sm: 3px;",
  "  --radius-md: 5px;",
  "  color-scheme: light;",
];

writeFileSync(
  out,
  `/* Generated from src/ui/theme/tokens.ts by scripts/gen-tokens.mjs.\n   Do not edit — run \`npm run gen:tokens\`. */\n\n:root {\n${lines.join("\n")}\n}\n`,
);

console.log(`Wrote ${lines.length - 3} tokens to src/app/tokens.generated.css`);
