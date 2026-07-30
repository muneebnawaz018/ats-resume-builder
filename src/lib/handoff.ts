/**
 * Carries a parsed resume from the checker to the editor.
 *
 * The two are separate routes, and the checker deliberately does not mount the
 * store, pulling the editor's state, IndexedDB layer and validation onto a
 * page whose whole job is reading one file would undo the reason the routes
 * are split. So the document is written once, the browser navigates, and the
 * store picks it up while hydrating.
 *
 * sessionStorage rather than localStorage: this is a single handoff between
 * two page loads in one tab, not a preference. If the navigation never
 * happens, it disappears with the tab.
 */
const KEY = "ats-resume-builder:handoff";

/** Read once and cleared, so a refresh does not re-import the same file. */
export function takeHandoff(): unknown | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as unknown;
  } catch {
    // Private browsing, a full quota, or a half-written value. The editor
    // opens on whatever was already there, which is the right fallback.
    return null;
  }
}

export function stageHandoff(document: unknown): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(document));
    return true;
  } catch {
    return false;
  }
}
