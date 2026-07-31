import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { type Resume, type Theme } from "@/schema";

/**
 * IndexedDB rather than localStorage: localStorage is synchronous (autosave
 * would jank the editor), caps around 5MB, and stores strings only. Resume
 * documents are small, but versions plus themes plus snapshots accumulate.
 *
 * Nothing here ever leaves the browser.
 */
interface AtsDB extends DBSchema {
  resumes: { key: string; value: Resume };
  themes: { key: string; value: Theme };
  snapshots: {
    key: string;
    value: { id: string; resumeId: string; at: string; resume: Resume };
    indexes: { byResume: string };
  };
}

const DB_NAME = "ats-resume-builder";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AtsDB>> | null = null;

function getDb() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB unavailable (server or private mode)");
  }
  dbPromise ??= openDB<AtsDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("resumes")) {
        db.createObjectStore("resumes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("themes")) {
        db.createObjectStore("themes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("snapshots")) {
        const s = db.createObjectStore("snapshots", { keyPath: "id" });
        s.createIndex("byResume", "resumeId");
      }
    },
  });
  return dbPromise;
}

export const db = {
  async allResumes(): Promise<unknown[]> {
    return (await getDb()).getAll("resumes");
  },
  async putResume(r: Resume): Promise<void> {
    await (await getDb()).put("resumes", r);
  },
  async deleteResume(id: string): Promise<void> {
    await (await getDb()).delete("resumes", id);
  },
  async allThemes(): Promise<unknown[]> {
    return (await getDb()).getAll("themes");
  },
  async putTheme(t: Theme): Promise<void> {
    await (await getDb()).put("themes", t);
  },
  async putSnapshot(resumeId: string, resume: Resume, id: string, at: string) {
    await (await getDb()).put("snapshots", { id, resumeId, at, resume });
  },
};

export const isDbAvailable = () => typeof indexedDB !== "undefined";

/**
 * Asks the browser not to evict this origin's data on its own.
 *
 * By default a browser may clear site storage when the disk gets tight, and it
 * picks by how recently a site was used: somebody who writes a resume, does
 * not come back for two months, and then opens the tab can find it gone. A
 * persisted origin is exempt from that.
 *
 * It is not protection against a person clearing their browsing data, and
 * nothing on the web is: storage belongs to the browser profile, and clearing
 * it means clearing it. Exporting the file is the only durable copy, which is
 * why the editor offers that on the toolbar.
 *
 * Chrome grants this silently once a site looks worth keeping; Firefox may
 * prompt. Either way the answer is advisory and the app works the same
 * without it, so the result is reported rather than acted on.
 */
export async function requestPersistentStorage(): Promise<
  "persisted" | "denied" | "unsupported"
> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return "unsupported";
  }
  try {
    if (await navigator.storage.persisted()) return "persisted";
    return (await navigator.storage.persist()) ? "persisted" : "denied";
  } catch {
    return "unsupported";
  }
}
