/**
 * Where you left off: which document was open, and how you were looking at it.
 *
 * localStorage, not IndexedDB. This is a handful of bytes read once during
 * hydration, and reading it synchronously means the editor opens on the right
 * document instead of opening on one and swapping to another a frame later.
 * The documents themselves stay in IndexedDB, see db.ts for why.
 *
 * Everything here is a preference, never content. A cleared store costs you
 * the view state and nothing else.
 */

const KEY = "ats-resume-builder:session";

export type SessionState = {
  activeResumeId?: string;
  panel?: string;
  view?: string;
  zoom?: number;
};

export function readSession(): SessionState {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    // Hand-edited or half-written values must not reach the store.
    if (typeof parsed !== "object" || parsed === null) return {};
    const s = parsed as Record<string, unknown>;
    return {
      activeResumeId:
        typeof s.activeResumeId === "string" ? s.activeResumeId : undefined,
      panel: typeof s.panel === "string" ? s.panel : undefined,
      view: typeof s.view === "string" ? s.view : undefined,
      zoom:
        typeof s.zoom === "number" && s.zoom >= 0.4 && s.zoom <= 2
          ? s.zoom
          : undefined,
    };
  } catch {
    return {};
  }
}

export function writeSession(patch: SessionState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readSession(), ...patch }));
  } catch {
    // Private browsing, or the quota is full. Losing view state is not worth
    // interrupting the edit that triggered the write.
  }
}
