// IndexedDB Offline Cache & Sync Queue Architecture

const DB_NAME = 'LivestockHealthOfflineDB';
const DB_VERSION = 1;
const OBS_STORE = 'pending_observations';
const ANIMALS_STORE = 'cached_animals';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OBS_STORE)) {
        db.createObjectStore(OBS_STORE, { keyPath: 'local_id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(ANIMALS_STORE)) {
        db.createObjectStore(ANIMALS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingObservation(obsData: any): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OBS_STORE, 'readwrite');
    const store = tx.objectStore(OBS_STORE);
    const req = store.add({ ...obsData, queued_at: new Date().toISOString() });
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingObservations(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OBS_STORE, 'readonly');
    const store = tx.objectStore(OBS_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheAnimalsLocally(animals: any[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(ANIMALS_STORE, 'readwrite');
  const store = tx.objectStore(ANIMALS_STORE);
  store.clear();
  animals.forEach(a => store.put(a));
}

export async function getCachedAnimals(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ANIMALS_STORE, 'readonly');
    const store = tx.objectStore(ANIMALS_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
