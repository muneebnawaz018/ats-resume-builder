/**
 * The data model. Zod schemas, their inferred types, and the migration chain.
 *
 * Framework-free by design, see scripts/tasks.ts (boundaries task). Everything the
 * rest of the app knows about a resume comes from here.
 */
export * from "./common";
export * from "./links";
export * from "./resume";
export * from "./theme";
export { BUILTIN_THEMES, DEFAULT_THEME_ID } from "./builtinThemes";
export { ADDABLE_SECTIONS, SECTION_HELP, createItem } from "./factory";
export { tryLoadResume, tryLoadTheme } from "./migrate";
export { createSampleResume } from "./sample";
