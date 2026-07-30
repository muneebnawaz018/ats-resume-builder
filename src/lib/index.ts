/**
 * Small, dependency-free helpers. Nothing here knows about React.
 *
 * The barrel exports what other folders consume, not everything the folder
 * contains — a re-export nobody imports is surface to maintain for no reader.
 */
export { formatDate, formatDateRange } from "./date";
export { downloadJson, readJsonFile, slugify } from "./file";
export { newId } from "./id";
export { site, url } from "./site";
