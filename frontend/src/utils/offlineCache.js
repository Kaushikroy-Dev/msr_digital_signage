// IndexedDB cache for playlist content (for Android TV app offline support)

const DB_NAME = 'DigitalSignagePlayer';
const DB_VERSION = 2; // Increment version for new store
const STORE_NAME = 'playlists';
const MEDIA_URLS_STORE = 'mediaUrls';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MEDIA_URL_CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for media URLs

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
            
            // Create playlists object store if it doesn't exist
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'playerId' });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('[OfflineCache] Created object store:', STORE_NAME);
            }
            
            // Create media URLs object store if it doesn't exist
            if (!database.objectStoreNames.contains(MEDIA_URLS_STORE)) {
                const mediaStore = database.createObjectStore(MEDIA_URLS_STORE, { keyPath: 'mediaId' });
                mediaStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('[OfflineCache] Created object store:', MEDIA_URLS_STORE);
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

// Cache media URL for faster access
export async function cacheMediaUrl(mediaId, url, apiUrl) {
    try {
        const database = await initDB();
        const transaction = database.transaction([MEDIA_URLS_STORE], 'readwrite');
        const store = transaction.objectStore(MEDIA_URLS_STORE);

        const cacheEntry = {
            mediaId,
            url,
            apiUrl,
            fullUrl: `${apiUrl}${url}`,
            timestamp: Date.now()
        };

        await store.put(cacheEntry);
        console.log('[OfflineCache] Cached media URL for:', mediaId);
        return true;
    } catch (error) {
        console.error('[OfflineCache] Failed to cache media URL:', error);
        return false;
    }
}

// Get cached media URL
export async function getCachedMediaUrl(mediaId) {
    try {
        const database = await initDB();
        const transaction = database.transaction([MEDIA_URLS_STORE], 'readonly');
        const store = transaction.objectStore(MEDIA_URLS_STORE);

        return new Promise((resolve, reject) => {
            const request = store.get(mediaId);

            request.onsuccess = () => {
                const result = request.result;
                
                if (!result) {
                    console.log('[OfflineCache] No cached media URL found for:', mediaId);
                    resolve(null);
                    return;
                }

                // Check if cache is expired
                const age = Date.now() - result.timestamp;
                if (age > MEDIA_URL_CACHE_EXPIRY_MS) {
                    console.log('[OfflineCache] Cached media URL expired for:', mediaId);
                    // Delete expired entry
                    store.delete(mediaId);
                    resolve(null);
                    return;
                }

                console.log('[OfflineCache] Retrieved cached media URL for:', mediaId);
                resolve(result.fullUrl || `${result.apiUrl}${result.url}`);
            };

            request.onerror = () => {
                console.error('[OfflineCache] Failed to get cached media URL:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('[OfflineCache] Failed to get cached media URL:', error);
        return null;
    }
}

// Cache multiple media URLs at once (batch operation)
export async function cacheMediaUrls(mediaItems, apiUrl) {
    try {
        const database = await initDB();
        const transaction = database.transaction([MEDIA_URLS_STORE], 'readwrite');
        const store = transaction.objectStore(MEDIA_URLS_STORE);

        const timestamp = Date.now();
        const promises = mediaItems
            .filter(item => item.id && item.url)
            .map(item => {
                const cacheEntry = {
                    mediaId: item.id,
                    url: item.url,
                    apiUrl,
                    fullUrl: `${apiUrl}${item.url}`,
                    timestamp
                };
                return store.put(cacheEntry);
            });

        await Promise.all(promises);
        console.log('[OfflineCache] Cached', promises.length, 'media URLs');
        return true;
    } catch (error) {
        console.error('[OfflineCache] Failed to cache media URLs:', error);
        return false;
    }
}

// Clear expired media URL cache entries
export async function clearExpiredMediaUrls() {
    try {
        const database = await initDB();
        const transaction = database.transaction([MEDIA_URLS_STORE], 'readwrite');
        const store = transaction.objectStore(MEDIA_URLS_STORE);
        const index = store.index('timestamp');

        return new Promise((resolve, reject) => {
            const request = index.openCursor();
            let deletedCount = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (!cursor) {
                    console.log('[OfflineCache] Cleared', deletedCount, 'expired media URL cache entries');
                    resolve(deletedCount);
                    return;
                }

                const age = Date.now() - cursor.value.timestamp;
                if (age > MEDIA_URL_CACHE_EXPIRY_MS) {
                    cursor.delete();
                    deletedCount++;
                }

                cursor.continue();
            };

            request.onerror = () => {
                console.error('[OfflineCache] Failed to clear expired media URLs:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('[OfflineCache] Failed to clear expired media URLs:', error);
        return 0;
    }
}
