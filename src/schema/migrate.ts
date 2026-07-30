import { RESUME_SCHEMA_VERSION, zResume, type Resume } from "./resume";
import { THEME_SCHEMA_VERSION, zTheme, type Theme } from "./theme";

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

/**
 * Keyed by the version being migrated *from*. Never change an existing
 * version's shape, add a version and a migration.
 */
const resumeMigrations: Record<number, Migration> = {};
const themeMigrations: Record<number, Migration> = {};

function run(
  raw: unknown,
  migrations: Record<number, Migration>,
  target: number,
  label: string,
): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${label}: expected an object`);
  }
  let doc = raw as Record<string, unknown>;
  let version = typeof doc.schemaVersion === "number" ? doc.schemaVersion : 0;

  if (version > target) {
    throw new Error(
      `${label}: document is version ${version}, this build understands ${target}. ` +
        `It was probably written by a newer version of the app.`,
    );
  }

  while (version < target) {
    const migrate = migrations[version];
    if (!migrate) {
      throw new Error(`${label}: no migration from version ${version}`);
    }
    doc = migrate(doc);
    version = typeof doc.schemaVersion === "number" ? doc.schemaVersion : version + 1;
  }
  return doc;
}

/** Migrate then validate. Every read path goes through this. */
export function loadResume(raw: unknown): Resume {
  return zResume.parse(
    run(raw, resumeMigrations, RESUME_SCHEMA_VERSION, "resume"),
  );
}

export function loadTheme(raw: unknown): Theme {
  return zTheme.parse(run(raw, themeMigrations, THEME_SCHEMA_VERSION, "theme"));
}

/** Non-throwing variant for recovering from a corrupt store. */
export function tryLoadResume(
  raw: unknown,
): { ok: true; resume: Resume } | { ok: false; error: string } {
  try {
    return { ok: true, resume: loadResume(raw) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function tryLoadTheme(
  raw: unknown,
): { ok: true; theme: Theme } | { ok: false; error: string } {
  try {
    return { ok: true, theme: loadTheme(raw) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
