import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSampleResume } from "@/schema";
import { toDocx } from "./docx";
import { toOdt } from "./odt";

/**
 * The other half of the evidence: does a reader nobody here wrote agree?
 *
 * Conformance tests check the file against the specification. This checks it
 * against an implementation, which is a different question. Word has opinions
 * the specification does not, and a file can be technically valid and still
 * open wrong.
 *
 * Optional by design. It uses whichever office reader the machine happens to
 * have, and skips when there is none, so it adds coverage on a developer
 * laptop without turning a clean CI container into a false failure. The suite
 * that has to pass everywhere is conformance.test.ts.
 */
function which(bin: string): string | null {
  try {
    // `command -v` rather than `which`: it is a shell builtin and present on
    // every POSIX system, including the minimal images CI tends to use.
    return execFileSync("/bin/sh", ["-c", `command -v ${bin}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

type Reader = { name: string; read: (file: string) => string };

/** LibreOffice: Linux, Windows and macOS. The portable option. */
function libreOffice(): Reader | null {
  const bin = which("soffice") ?? which("libreoffice");
  if (!bin) return null;
  return {
    name: "LibreOffice",
    read(file) {
      const out = mkdtempSync(join(tmpdir(), "ats-lo-"));
      execFileSync(
        bin,
        ["--headless", "--convert-to", "txt:Text", "--outdir", out, file],
        { stdio: "ignore", timeout: 120_000 },
      );
      const produced = readdirSync(out).find((f) => f.endsWith(".txt"));
      if (!produced) throw new Error("LibreOffice produced no output");
      return readFileSync(join(out, produced), "utf8");
    },
  };
}

/** macOS ships a Word and ODF reader in the OS. Nothing to install. */
function textutil(): Reader | null {
  const bin = which("textutil");
  if (!bin) return null;
  return {
    name: "textutil",
    read: (file) =>
      execFileSync(bin, ["-convert", "txt", "-stdout", file], {
        encoding: "utf8",
        timeout: 60_000,
      }),
  };
}

const reader = libreOffice() ?? textutil();

const RESUME = createSampleResume("r_test", "2026-01-01T00:00:00.000Z");

describe.skipIf(!reader)(`native reader (${reader?.name ?? "none found"})`, () => {
  const dir = mkdtempSync(join(tmpdir(), "ats-export-"));

  const roundTrip = (ext: string, bytes: Uint8Array) => {
    const file = join(dir, `resume${ext}`);
    writeFileSync(file, bytes);
    // Reading a document is not a security boundary here: the file was
    // written by this test two lines up.
    return reader!.read(file);
  };

  it("reads a .docx with the content in document order", () => {
    const text = roundTrip(".docx", toDocx(RESUME));

    expect(text).toContain("Alex Mercer");
    expect(text).toContain("alex.mercer@example.com");
    expect(text).toContain("Northwind Payments");
    expect(text).toContain("Rebuilt the settlement pipeline");

    // Order is the whole point: a name below the employment history means the
    // file opens, and opens wrong.
    expect(text.indexOf("Alex Mercer")).toBeLessThan(text.indexOf("EXPERIENCE"));
    expect(text.indexOf("EXPERIENCE")).toBeLessThan(text.indexOf("EDUCATION"));
  });

  it("reads a .odt with the same content", () => {
    const text = roundTrip(".odt", toOdt(RESUME));
    expect(text).toContain("Alex Mercer");
    expect(text).toContain("Northwind Payments");
    expect(text.indexOf("Alex Mercer")).toBeLessThan(text.indexOf("EXPERIENCE"));
  });

  it("renders bullets as bullets, not as a literal dash", () => {
    const text = roundTrip(".docx", toDocx(RESUME));
    expect(text).not.toContain("- Rebuilt");
    expect(/[•\t*]\s*Rebuilt|^\s*Rebuilt/m.test(text)).toBe(true);
  });
});
