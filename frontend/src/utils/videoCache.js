/**
 * Video Download and Cache Manager
 * 
 * This utility downloads videos in advance and stores them in IndexedDB
 * for smooth, buffer-free playback in digital signage players.
 * 
 * Features:
 * - Downloads videos as Blobs
 * - Stores in IndexedDB (supports large files)
 * - Creates blob URLs for playback
 * - Automatic cache management
 * - Progress tracking
 */

const DB_NAME = 'DigitalSignageCache';
const DB_VERSION = 1;
const STORE_NAME = 'videos';
const MAX_CACHE_SIZE_MB = 500; // Maximum cache size in MB

/**
 * Initialize IndexedDB
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                objectStore.createIndex('url', 'url', { unique: true });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                objectStore.createIndex('size', 'size', { unique: false });
            }
        };
    });
}

/**
 * Download a video file and return as Blob
 */
async function downloadVideo(url, onProgress = null) {
    console.log('[VideoCache] Downloading:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);
    let loaded = 0;

    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;

        if (onProgress && total) {
            const progress = (loaded / total) * 100;
            onProgress(progress, loaded, total);
        }
    }

    // Combine chunks into single Blob
    const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'video/mp4' });
    console.log('[VideoCache] Downloaded:', url, `(${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
    
    return blob;
}

/**
 * Store video blob in IndexedDB
 */
async function storeVideo(id, url, blob) {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const data = {
            id,
            url,
            blob,
            size: blob.size,
            timestamp: Date.now(),
            mimeType: blob.type
        };

        const request = store.put(data);

        request.onsuccess = () => {
            console.log('[VideoCache] Stored:', id);
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get video blob from IndexedDB
 */
async function getVideo(id) {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            const result = request.result;
            if (result) {
                console.log('[VideoCache] Retrieved from cache:', id);
                resolve(result.blob);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Check if video exists in cache
 */
async function hasVideo(id) {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get total cache size in bytes
 */
async function getCacheSize() {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const total = request.result.reduce((sum, item) => sum + (item.size || 0), 0);
            resolve(total);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Clear old videos if cache is too large (LRU eviction)
 */
async function evictOldVideos() {
    const db = await openDB();
    const maxSize = MAX_CACHE_SIZE_MB * 1024 * 1024; // Convert to bytes
    
    return new Promise(async (resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor();

        const items = [];
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                items.push({ id: cursor.value.id, size: cursor.value.size, timestamp: cursor.value.timestamp });
                cursor.continue();
            } else {
                // Sort by timestamp (oldest first)
                items.sort((a, b) => a.timestamp - b.timestamp);
                
                let totalSize = items.reduce((sum, item) => sum + item.size, 0);
                const toDelete = [];

                // Delete oldest items until we're under the limit
                for (const item of items) {
                    if (totalSize <= maxSize) break;
                    toDelete.push(item.id);
                    totalSize -= item.size;
                }

                if (toDelete.length > 0) {
                    console.log('[VideoCache] Evicting old videos:', toDelete.length);
                    const deleteTransaction = db.transaction([STORE_NAME], 'readwrite');
                    const deleteStore = deleteTransaction.objectStore(STORE_NAME);
                    
                    toDelete.forEach(id => deleteStore.delete(id));
                    
                    deleteTransaction.oncomplete = () => resolve(toDelete.length);
                    deleteTransaction.onerror = () => reject(deleteTransaction.error);
                } else {
                    resolve(0);
                }
            }
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Download and cache a video
 */
export async function cacheVideo(id, url, onProgress = null) {
    try {
        // Check if already cached
        const exists = await hasVideo(id);
        if (exists) {
            console.log('[VideoCache] Already cached:', id);
            return true;
        }

        // Download video
        const blob = await downloadVideo(url, onProgress);

        // Check cache size and evict if needed
        const currentSize = await getCacheSize();
        const maxSize = MAX_CACHE_SIZE_MB * 1024 * 1024;
        
        if (currentSize + blob.size > maxSize) {
            console.log('[VideoCache] Cache full, evicting old videos...');
            await evictOldVideos();
        }

        // Store in IndexedDB
        await storeVideo(id, url, blob);

        return true;
    } catch (error) {
        console.error('[VideoCache] Failed to cache video:', id, error);
        return false;
    }
}

/**
 * Get cached video as blob URL for playback
 */
export async function getCachedVideoUrl(id) {
    try {
        const blob = await getVideo(id);
        if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            console.log('[VideoCache] Created blob URL for:', id);
            return blobUrl;
        }
        return null;
    } catch (error) {
        console.error('[VideoCache] Failed to get cached video:', id, error);
        return null;
    }
}

/**
 * Pre-download all videos in a playlist
 */
export async function predownloadPlaylist(items, baseUrl, onItemProgress = null, onOverallProgress = null) {
    const videos = items.filter(item => item.file_type === 'video' && item.url);
    
    if (videos.length === 0) {
        console.log('[VideoCache] No videos to download');
        return;
    }

    console.log(`[VideoCache] Pre-downloading ${videos.length} videos...`);

    let completed = 0;
    const results = [];

    for (const video of videos) {
        const id = video.content_id || video.id;
        const url = `${baseUrl}${video.url}`;

        try {
            const success = await cacheVideo(id, url, (progress) => {
                if (onItemProgress) {
                    onItemProgress(id, progress);
                }
            });

            results.push({ id, success });
            completed++;

            if (onOverallProgress) {
                onOverallProgress(completed, videos.length);
            }
        } catch (error) {
            console.error('[VideoCache] Failed to download:', id, error);
            results.push({ id, success: false, error });
            completed++;

            if (onOverallProgress) {
                onOverallProgress(completed, videos.length);
            }
        }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[VideoCache] Pre-download complete: ${successCount}/${videos.length} successful`);

    return results;
}

/**
 * Clear all cached videos
 */
export async function clearVideoCache() {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
            console.log('[VideoCache] Cache cleared');
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const items = request.result;
            const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
            const stats = {
                count: items.length,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                maxSizeMB: MAX_CACHE_SIZE_MB,
                usagePercent: ((totalSize / (MAX_CACHE_SIZE_MB * 1024 * 1024)) * 100).toFixed(1),
                items: items.map(item => ({
                    id: item.id,
                    url: item.url,
                    sizeMB: (item.size / 1024 / 1024).toFixed(2),
                    timestamp: new Date(item.timestamp).toLocaleString()
                }))
            };
            resolve(stats);
        };
        request.onerror = () => reject(request.error);
    });
}
