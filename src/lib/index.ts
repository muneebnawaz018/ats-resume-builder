/**
 * Small, dependency-free helpers. Nothing here knows about React.
 *
 * The barrel exports what other folders consume, not everything the folder
 * contains, a re-export nobody imports is surface to maintain for no reader.
 */
export { formatDate, formatDateRange } from "./date";
export { downloadJson, readJsonFile, slugify } from "./file";
export {
  ACCEPT_ATTR,
  classify,
  depthNote,
  extname,
  formatBytes,
  type ResumeFormat,
} from "./formats";
export { stageHandoff, takeHandoff } from "./handoff";
export { newId } from "./id";
export { applyScheme, SCHEME_KEY, SCHEME_SCRIPT } from "./scheme";
export { site, url } from "./site";
