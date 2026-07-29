#!/usr/bin/env node
/**
 * Writes src/app/tokens.generated.css from src/ui/theme/tokens.ts.
 *
 * Tokens stay defined once in TypeScript (where the MUI theme reads them) but
 * reach plain CSS as a real stylesheet rather than an injected <style> tag.
 * That keeps them out of the hydration path entirely.
 *
 * The token objects are evaluated rather than pattern-matched out of the
 * source, so values derived through `alpha()` land in CSS as the same strings
 * the MUI theme uses. A regex-based reader would silently emit the literal
 * "alpha(palette.blue600, 0.08)".
 *
 * Runs before dev and build. Do not edit the generated file.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const srcPath = join(root, "src/ui/theme/tokens.ts");
const outPath = join(root, "src/app/tokens.generated.css");

/**
 * tokens.ts is plain TypeScript with no imports and only type annotations that
 * strip cleanly, so it can be evaluated directly after removing them. This
 * avoids pulling a bundler into the build for one file.
 */
const source = readFileSync(srcPath, "utf8")
  .replace(/^export type .*$/gm, "")
  .replace(/ as const/g, "")
  .replace(/: \[number, number, number\]/g, "")
  .replace(/\(hex: string, amount: number\)/g, "(hex, amount)")
  .replace(/\(fg: string, bg: string, amount: number\)/g, "(fg, bg, amount)")
  .replace(/\(hex: string\)/g, "(hex)")
  .replace(/\(a: number, b: number\)/g, "(a, b)")
  .replace(/: string(?=[,)\s;])/g, "");

const dir = mkdtempSync(join(tmpdir(), "tokens-"));
const modPath = join(dir, "tokens.mjs");
writeFileSync(modPath, source);

let mod;
try {
  mod = await import(pathToFileURL(modPath).href);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const kebab = (s) => s.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase();

const lines = [];
const push = (name, value) => lines.push(`  --${name}: ${value};`);

/** Raw ramp, exposed so one-off CSS can reach a shade without inventing one. */
for (const [k, v] of Object.entries(mod.palette)) push(`c-${kebab(k)}`, v);

for (const group of [mod.tone, mod.blue, mod.severity]) {
  for (const [k, v] of Object.entries(group)) push(kebab(k), v);
}

for (const [k, v] of Object.entries(mod.radius)) push(`radius-${k}`, `${v}px`);
for (const [k, v] of Object.entries(mod.shadow)) push(`shadow-${k}`, v);

push("dur-fast", mod.motion.fast);
push("dur-base", mod.motion.base);
push("dur-slow", mod.motion.slow);
push("ease", mod.motion.ease);
push("spring", mod.motion.spring);

writeFileSync(
  outPath,
  "/* Generated from src/ui/theme/tokens.ts by scripts/gen-tokens.mjs.\n" +
    "   Do not edit — run `npm run gen:tokens`. */\n\n" +
    `:root {\n${lines.join("\n")}\n  color-scheme: light;\n}\n`,
);

console.log(`Wrote ${lines.length} tokens to src/app/tokens.generated.css`);
