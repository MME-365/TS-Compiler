/**
 * IndexedDB Persistence for TypeScript Studio Virtual Filesystem
 */

import { ProjectFile, CompilerConfig } from '../types';

const DB_NAME = 'TS_STUDIO_VFS';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORE_CONFIG = 'config';
const STORE_META = 'metadata';

interface StoredMetadata {
  key: string;
  activeFileId: string;
  currentPresetId: string;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves workspace files, active file id, and compiler config to IndexedDB
 */
export async function saveWorkspaceToIDB(
  files: ProjectFile[],
  activeFileId: string,
  presetId: string,
  config: CompilerConfig
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_FILES, STORE_CONFIG, STORE_META], 'readwrite');

    // Clear and re-populate files
    const fileStore = tx.objectStore(STORE_FILES);
    fileStore.clear();
    for (const file of files) {
      fileStore.put(file);
    }

    // Save config
    const configStore = tx.objectStore(STORE_CONFIG);
    configStore.put({ key: 'current_config', ...config });

    // Save metadata
    const metaStore = tx.objectStore(STORE_META);
    const meta: StoredMetadata = {
      key: 'workspace_meta',
      activeFileId,
      currentPresetId: presetId,
      updatedAt: Date.now(),
    };
    metaStore.put(meta);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[VFS IDB] Failed to save workspace to IndexedDB:', err);
  }
}

/**
 * Restores saved workspace from IndexedDB
 */
export async function loadWorkspaceFromIDB(): Promise<{
  files: ProjectFile[];
  activeFileId: string;
  presetId: string;
  config: CompilerConfig | null;
} | null> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_FILES, STORE_CONFIG, STORE_META], 'readonly');

    const fileStore = tx.objectStore(STORE_FILES);
    const configStore = tx.objectStore(STORE_CONFIG);
    const metaStore = tx.objectStore(STORE_META);

    const filesReq = fileStore.getAll();
    const configReq = configStore.get('current_config');
    const metaReq = metaStore.get('workspace_meta');

    return new Promise((resolve) => {
      tx.oncomplete = () => {
        const files: ProjectFile[] = filesReq.result || [];
        const meta: StoredMetadata | undefined = metaReq.result;
        const configRecord = configReq.result;

        if (files.length === 0) {
          resolve(null);
          return;
        }

        let config: CompilerConfig | null = null;
        if (configRecord) {
          const { key, ...rest } = configRecord;
          config = rest as CompilerConfig;
        }

        resolve({
          files,
          activeFileId: meta?.activeFileId || files[0].id,
          presetId: meta?.currentPresetId || 'custom',
          config,
        });
      };

      tx.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('[VFS IDB] Failed to load workspace from IndexedDB:', err);
    return null;
  }
}

/**
 * Clears all saved workspace state from IndexedDB
 */
export async function clearWorkspaceIDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_FILES, STORE_CONFIG, STORE_META], 'readwrite');
    tx.objectStore(STORE_FILES).clear();
    tx.objectStore(STORE_CONFIG).clear();
    tx.objectStore(STORE_META).clear();
  } catch (err) {
    console.warn('[VFS IDB] Failed to clear IndexedDB:', err);
  }
}
