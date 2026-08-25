/**
 * Persistent storage layer menggunakan IndexedDB sebagai primary store,
 * dengan localStorage sebagai fallback.
 *
 * IndexedDB jauh lebih tahan eviction oleh browser/OS dibanding localStorage,
 * terutama di mobile. Browser hanya akan hapus IndexedDB kalau user secara
 * eksplisit clear site data, atau storage device benar-benar penuh.
 *
 * API sengaja dibuat sync-like untuk kompatibilitas dengan kode yang ada,
 * dengan IndexedDB di-sync secara async di background.
 */

const DB_NAME = 'jurnal_guru_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

// ── In-memory cache (sumber kebenaran untuk reads sync) ──────────────────────
const memCache = new Map<string, string>();
let dbReady = false;
let db: IDBDatabase | null = null;

// ── Buka IndexedDB ────────────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = (e.target as IDBOpenDBRequest).result;
      if (!d.objectStoreNames.contains(STORE_NAME)) {
        d.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

// ── Inisialisasi: load semua data dari IDB ke memCache ────────────────────────
let initPromise: Promise<void> | null = null;

export function initStorage(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      db = await openDB();
      // Load semua key dari IDB ke memCache
      await new Promise<void>((resolve, reject) => {
        const tx = db!.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            memCache.set(cursor.key as string, cursor.value as string);
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => reject(req.error);
      });
      dbReady = true;

      // Migrasi: kalau ada data di localStorage tapi belum di IDB, pindahkan
      const JG_KEYS = [
        'jg_namaGuru', 'jg_lastBackup', 'jg_activeTab', 'jg_activeKelas',
        'jg_kelasList', 'jg_deletedKelasIds', 'jg_absenRecords', 'jg_kasusRecords', 'jg_catatanRecords',
        'jg_liburDates', 'jg_semester',
      ];
      for (const key of JG_KEYS) {
        if (!memCache.has(key)) {
          const lsVal = localStorage.getItem(key);
          if (lsVal !== null) {
            memCache.set(key, lsVal);
            idbSet(key, lsVal); // async, fire-and-forget
          }
        }
      }
    } catch (err) {
      // IDB tidak tersedia (private browsing di beberapa browser) — fallback ke localStorage
      console.warn('[storage] IndexedDB tidak tersedia, fallback ke localStorage', err);
      dbReady = false;
    }
  })();
  return initPromise;
}

// ── IDB write (async, fire-and-forget) ───────────────────────────────────────
function idbSet(key: string, value: string): void {
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
  } catch {
    // silent
  }
}

function idbDelete(key: string): void {
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  } catch {
    // silent
  }
}

// ── Public API (sync reads via memCache, async writes ke IDB + localStorage) ──

export function storageGet<T>(key: string, fallback: T): T {
  try {
    // Coba dari memCache dulu (sudah di-load dari IDB saat init)
    const cached = memCache.get(key);
    if (cached !== undefined) return JSON.parse(cached) as T;

    // Fallback ke localStorage kalau IDB belum ready
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function storageSet(key: string, value: unknown): void {
  try {
    const serialized = JSON.stringify(value);
    memCache.set(key, serialized);

    // Tulis ke IDB (primary, tahan eviction)
    if (dbReady) {
      idbSet(key, serialized);
    }

    // Tulis ke localStorage juga sebagai secondary backup
    try {
      localStorage.setItem(key, serialized);
    } catch {
      // quota exceeded — IDB masih aman
    }
  } catch {
    // silent
  }
}

export function storageRemove(key: string): void {
  memCache.delete(key);
  if (dbReady) idbDelete(key);
  try { localStorage.removeItem(key); } catch { /* silent */ }
}
