// IndexedDB cache for playlist content (for Android TV app offline support)

const DB_NAME = 'DigitalSignagePlayer';
const DB_VERSION = 1;
const STORE_NAME = 'playlists';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

let db = null;

// Initialize IndexedDB
async function initDB() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('[OfflineCache] Failed to open IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('[OfflineCache] IndexedDB opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Create object store if it doesn't exist
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'playerId' });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('[OfflineCache] Created object store:', STORE_NAME);
            }
        };
    });
}

// Cache playlist data for a player
export async function cachePlaylist(playerId, playlistData) {
    try {
        const database = await initDB();
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const cacheEntry = {
            playerId,
            playlistData,
            timestamp: Date.now()
        };

        await store.put(cacheEntry);
        console.log('[OfflineCache] Cached playlist for player:', playerId);
        return true;
    } catch (error) {
        console.error('[OfflineCache] Failed to cache playlist:', error);
        return false;
    }
}

// Get cached playlist data
export async function getCachedPlaylist(playerId) {
    try {
        const database = await initDB();
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(playerId);

            request.onsuccess = () => {
                const result = request.result;
                
                if (!result) {
                    console.log('[OfflineCache] No cached playlist found for player:', playerId);
                    resolve(null);
                    return;
                }

                // Check if cache is expired
                const age = Date.now() - result.timestamp;
                if (age > CACHE_EXPIRY_MS) {
                    console.log('[OfflineCache] Cached playlist expired for player:', playerId);
                    // Delete expired entry
                    store.delete(playerId);
                    resolve(null);
                    return;
                }

                console.log('[OfflineCache] Retrieved cached playlist for player:', playerId);
                resolve(result.playlistData);
            };

            request.onerror = () => {
                console.error('[OfflineCache] Failed to get cached playlist:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('[OfflineCache] Failed to get cached playlist:', error);
        return null;
    }
}

// Clear cache for a specific player
export async function clearPlayerCache(playerId) {
    try {
        const database = await initDB();
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        await store.delete(playerId);
        console.log('[OfflineCache] Cleared cache for player:', playerId);
        return true;
    } catch (error) {
        console.error('[OfflineCache] Failed to clear cache:', error);
        return false;
    }
}

// Clear all expired cache entries
export async function clearExpiredCache() {
    try {
        const database = await initDB();
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');

        return new Promise((resolve, reject) => {
            const request = index.openCursor();
            let deletedCount = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (!cursor) {
                    console.log('[OfflineCache] Cleared', deletedCount, 'expired cache entries');
                    resolve(deletedCount);
                    return;
                }

                const age = Date.now() - cursor.value.timestamp;
                if (age > CACHE_EXPIRY_MS) {
                    cursor.delete();
                    deletedCount++;
                }

                cursor.continue();
            };

            request.onerror = () => {
                console.error('[OfflineCache] Failed to clear expired cache:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('[OfflineCache] Failed to clear expired cache:', error);
        return 0;
    }
}

// Clear all cache
export async function clearCache() {
    try {
        const database = await initDB();
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        await store.clear();
        console.log('[OfflineCache] Cleared all cache');
        return true;
    } catch (error) {
        console.error('[OfflineCache] Failed to clear cache:', error);
        return false;
    }
}

// Get cache size (approximate)
export async function getCacheSize() {
    try {
        const database = await initDB();
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.count();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('[OfflineCache] Failed to get cache size:', error);
        return 0;
    }
}
