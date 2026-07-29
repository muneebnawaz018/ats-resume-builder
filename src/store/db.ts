import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Resume } from "@/schema/resume";
import type { Theme } from "@/schema/theme";

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
