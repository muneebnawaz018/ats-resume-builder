import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractDocx } from "@/extract/docx";
import { toResume } from "@/extract/toResume";
import { stageHandoff } from "@/lib/handoff";
import { createSampleResume } from "@/schema";

/**
 * The checker hands a parsed document to the editor through sessionStorage.
 *
 * The bug these cover: the store is module level, so it outlives client-side
 * navigation. Somebody who opened the editor once, walked over to the checker
 * and pressed "Fix it in the editor" arrived back at an already-hydrated
 * store, `hydrate()` returned early, and their file was dropped without a
 * word. They saw the sample resume and had no way to tell why.
 */

/** Minimal sessionStorage, since these run in plain Node. */
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}

vi.stubGlobal("sessionStorage", new MemoryStorage());
vi.stubGlobal("localStorage", new MemoryStorage());
vi.stubGlobal("indexedDB", undefined);

const parsed = () => {
  const bytes = new Uint8Array(
    readFileSync(join(process.cwd(), "testing", "docx", "clean-styled.docx")),
  );
  return toResume(extractDocx(bytes), "clean-styled.docx");
};

/** Fresh module registry per test, so `hydrated` does not leak between them. */
async function freshStore() {
  vi.resetModules();
  const { useAppStore } = await import("./useAppStore");
  return useAppStore;
}

describe("checker to editor handoff", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("opens the handed-over document on a first visit", async () => {
    const doc = parsed();
    stageHandoff(doc);

    const store = await freshStore();
    await store.getState().hydrate();

    expect(store.getState().activeResume()?.id).toBe(doc.id);
  });

  it("does not seed a sample alongside a handed-over document", async () => {
    stageHandoff(parsed());

    const store = await freshStore();
    await store.getState().hydrate();

    expect(Object.keys(store.getState().resumes)).toHaveLength(1);
  });

  it("picks up a document when the editor is revisited", async () => {
    const store = await freshStore();

    // First visit: no handoff, so the sample is seeded.
    await store.getState().hydrate();
    const sampleId = store.getState().activeResumeId;
    expect(store.getState().hydrated).toBe(true);

    // Now the checker stages a file and navigates back. The store survived,
    // so hydrate() short-circuits, and this is where the document went
    // missing before.
    const doc = parsed();
    stageHandoff(doc);
    await store.getState().hydrate();

    expect(store.getState().activeResume()?.id).toBe(doc.id);
    expect(store.getState().activeResumeId).not.toBe(sampleId);
  });

  it("clears the handoff so a refresh does not re-import it", async () => {
    stageHandoff(parsed());
    const store = await freshStore();
    await store.getState().hydrate();

    const afterImport = store.getState().activeResumeId;
    store.getState().editResume((r) => {
      r.basics.fullName = "Edited By Hand";
    });
    // A second hydrate stands in for a re-mount of the editor.
    await store.getState().hydrate();

    expect(store.getState().activeResumeId).toBe(afterImport);
    expect(store.getState().activeResume()?.basics.fullName).toBe(
      "Edited By Hand",
    );
  });

  it("leaves the open document alone when the handoff is unreadable", async () => {
    const store = await freshStore();
    await store.getState().hydrate();
    const before = store.getState().activeResumeId;

    stageHandoff({ not: "a resume" });
    expect(store.getState().importHandoff()).toBe(false);
    expect(store.getState().activeResumeId).toBe(before);
  });

});

/*
 * The editor mounts its effect twice in development, so hydrate() is called
 * again before the first call has finished awaiting IndexedDB. Both passes
 * used to run: the first took the handoff, the second found none, fell back
 * to the previously open document, and whichever finished last won. Choosing
 * a file in the checker landed on the resume before it.
 *
 * A store is needed with a database that actually defers, since the suite
 * above runs with IndexedDB switched off, and without an await there is no
 * window for a second caller to get into.
 */
describe("two hydrations at once", () => {
  /** A resume already in the database, standing in for the previous session. */
  const EXISTING = createSampleResume(
    "r_previously_open",
    "2026-01-01T00:00:00.000Z",
  );

  async function storeWithSlowDb() {
    vi.resetModules();
    vi.doMock("./db", () => ({
      isDbAvailable: () => true,
      requestPersistentStorage: async () => "unsupported" as const,
      db: {
        // Resolves a tick later, which is the gap the second caller used to
        // slip into.
        allResumes: () =>
          new Promise((r) => setTimeout(() => r([EXISTING]), 0)),
        allThemes: () => new Promise((r) => setTimeout(() => r([]), 0)),
        putResume: async () => {},
        putTheme: async () => {},
        deleteResume: async () => {},
        putSnapshot: async () => {},
      },
    }));
    const { useAppStore } = await import("./useAppStore");
    return useAppStore;
  }

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.doUnmock("./db");
  });

  it("opens the handed-over document, not the one open before it", async () => {
    const store = await storeWithSlowDb();
    const doc = parsed();
    stageHandoff(doc);

    await Promise.all([
      store.getState().hydrate(),
      store.getState().hydrate(),
    ]);

    expect(store.getState().activeResume()?.id).toBe(doc.id);
    expect(store.getState().activeResumeId).not.toBe(EXISTING.id);
  });

  it("runs one pass however many callers ask for it", async () => {
    const store = await storeWithSlowDb();
    stageHandoff(parsed());

    await Promise.all([
      store.getState().hydrate(),
      store.getState().hydrate(),
      store.getState().hydrate(),
    ]);

    // The database holds one document and the handoff adds a second. A repeat
    // pass would have imported or seeded a third.
    expect(Object.keys(store.getState().resumes)).toHaveLength(2);
  });
});
