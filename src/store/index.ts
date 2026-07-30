/**
 * Application state. Persistence and session restore are internal: they are
 * driven by the store, and no component should reach past it to IndexedDB.
 */
export { useAppStore, type PanelTab, type ViewMode } from "./useAppStore";
