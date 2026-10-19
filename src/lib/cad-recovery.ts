"use client";

export type CadRecoveryWorkspace = {
  designSnapshot?: import('./cad-project-state').CadWorkspaceSnapshot;
  settings: unknown;
  marginPoints: unknown[];
  measurements: unknown[];
  workflowStage: string;
  projectStatus: string;
};

export type CadRecoveryDraft = {
  key: string;
  projectId: string;
  sourceKey: string;
  savedAt: number;
  retained?: boolean;
  geometry: Float32Array;
  workspace: CadRecoveryWorkspace;
};

const DB_NAME = "dentaya-cad-recovery";
const DB_VERSION = 1;
const STORE = "drafts";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function openRecoveryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB kullanılamıyor."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("CAD recovery veritabanı açılamadı."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("savedAt", "savedAt");
        store.createIndex("projectId", "projectId");
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  return openRecoveryDb().then((db) => new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let settled = false;

    let result: T;
    let ready = false;
    const finish = (value: T) => { result = value; ready = true; };

    const fail = (reason?: unknown) => {
      if (settled) return;
      settled = true;
      reject(reason);
      db.close();
    };

    transaction.onerror = () => fail(transaction.error ?? new Error("CAD recovery işlemi başarısız."));
    transaction.onabort = () => fail(transaction.error ?? new Error("CAD recovery işlemi iptal edildi."));
    transaction.oncomplete = () => {
      if (!settled) { settled = true; if (ready) resolve(result); else reject(new Error('CAD recovery işlemi başarısız.')); }
      db.close();
    };

    action(store, finish, fail);
  }));
}

export async function saveCadRecoveryDraft(draft: CadRecoveryDraft) {
  const safeDraft: CadRecoveryDraft = {
    ...draft,
    geometry: new Float32Array(draft.geometry),
    savedAt: draft.savedAt || Date.now(),
  };

  await runTransaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(safeDraft);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function loadCadRecoveryDraft(key: string): Promise<CadRecoveryDraft | null> {
  return runTransaction<CadRecoveryDraft | null>("readonly", (store, resolve, reject) => {
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const raw = request.result as CadRecoveryDraft | undefined;
      if (!raw) {
        resolve(null);
        return;
      }

      const geometry = raw.geometry instanceof Float32Array
        ? new Float32Array(raw.geometry)
        : new Float32Array(raw.geometry as unknown as ArrayLike<number>);

      resolve({ ...raw, geometry });
    };
  });
}

export async function deleteCadRecoveryDraft(key: string) {
  await runTransaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/** Remove only the checkpoint acknowledged by the server, preserving later edits. */
export async function acknowledgeCadRecoveryDraft(key: string, savedAt: number) {
  await runTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const draft = request.result as CadRecoveryDraft | undefined;
      if (!draft || draft.savedAt > savedAt) { resolve(); return; }
      const removal = store.delete(key);
      removal.onerror = () => reject(removal.error);
      removal.onsuccess = () => resolve();
    };
  });
}

export async function pruneCadRecoveryDrafts(now = Date.now()) {
  const threshold = now - MAX_AGE_MS;
  await runTransaction<void>("readwrite", (store, resolve, reject) => {
    const index = store.index("savedAt");
    const request = index.openCursor(IDBKeyRange.upperBound(threshold));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      if (!(cursor.value as CadRecoveryDraft).retained) cursor.delete();
      cursor.continue();
    };
  });
}

export function makeCadRecoveryKey(projectId: string, sourceKey: string) {
  return `${projectId}::${sourceKey}`;
}
