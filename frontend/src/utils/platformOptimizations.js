/**
 * Platform-Specific Optimizations
 * Provides performance optimizations tailored to each platform
 */

import { detectPlatform } from './platformDetection';

/**
 * Apply platform-specific optimizations
 */
export function applyPlatformOptimizations() {
    const platform = detectPlatform();
    
    switch (platform) {
        case 'tizen':
            applyTizenOptimizations();
            break;
        case 'webos':
            applyWebOSOptimizations();
            break;
        case 'brightsign':
            applyBrightSignOptimizations();
            break;
        case 'android':
            applyAndroidOptimizations();
            break;
        case 'windows':
        case 'linux':
            applyDesktopOptimizations();
            break;
        default:
            applyDefaultOptimizations();
    }
}

/**
 * Tizen-specific optimizations
 */
function applyTizenOptimizations() {
    if (typeof window === 'undefined') return;

    // Disable image lazy loading for better performance
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.loading = 'eager';
    });

    // Optimize video playback
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.preload = 'auto';
        video.playsInline = true;
    });

    // Reduce animation complexity for TV
    document.documentElement.style.setProperty('--animation-duration', '0.3s');
}

/**
 * WebOS-specific optimizations
 */
function applyWebOSOptimizations() {
    if (typeof window === 'undefined') return;

    // Similar to Tizen
    applyTizenOptimizations();

    // WebOS-specific: Enable hardware acceleration
    const style = document.createElement('style');
    style.textContent = `
        * {
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
        }
    `;
    document.head.appendChild(style);
}

/**
 * BrightSign-specific optimizations
 */
function applyBrightSignOptimizations() {
    if (typeof window === 'undefined') return;

    // BrightSign devices benefit from aggressive caching
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Service worker registration failed, continue without it
        });
    }

    // Preload critical resources (only if we have a URL to preload)
    // Note: Preload links require an href, so we skip this for now
    // If needed, add specific resource URLs here

    // Optimize for low memory
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.loading = 'lazy';
        // Reduce image quality if needed
    });
}

/**
 * Android-specific optimizations
 */
function applyAndroidOptimizations() {
    if (typeof window === 'undefined') return;

    // Battery optimization
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').catch(() => {
            // Wake lock not supported or denied
        });
    }

    // Network optimization
    if ('connection' in navigator) {
        const connection = navigator.connection;
        if (connection && connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            // Reduce quality for slow connections
            document.documentElement.style.setProperty('--image-quality', '0.7');
        }
    }

    // Memory optimization
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.preload = 'metadata'; // Less aggressive preloading
    });
}

/**
 * Desktop (Windows/Linux) optimizations
 */
function applyDesktopOptimizations() {
    if (typeof window === 'undefined') return;

    // Desktop can handle more resources
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.preload = 'auto';
    });

    // Enable hardware acceleration
    const style = document.createElement('style');
    style.textContent = `
        * {
            will-change: transform;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Default optimizations
 */
function applyDefaultOptimizations() {
    if (typeof window === 'undefined') return;

    // Basic optimizations for unknown platforms
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.loading = 'lazy';
    });
}

/**
 * Memory management utilities
 */
export class MemoryManager {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 50 * 1024 * 1024; // 50MB
        this.currentCacheSize = 0;
    }

    /**
     * Cache an item
     */
    cacheItem(key, data, size) {
        // Remove old items if cache is full
        while (this.currentCacheSize + size > this.maxCacheSize && this.cache.size > 0) {
            const firstKey = this.cache.keys().next().value;
            this.removeItem(firstKey);
        }

        this.cache.set(key, { data, size });
        this.currentCacheSize += size;
    }

    /**
     * Get cached item
     */
    getItem(key) {
        const item = this.cache.get(key);
        if (item) {
            // Move to end (LRU)
            this.cache.delete(key);
            this.cache.set(key, item);
            return item.data;
        }
        return null;
    }

    /**
     * Remove item from cache
     */
    removeItem(key) {
        const item = this.cache.get(key);
        if (item) {
            this.currentCacheSize -= item.size;
            this.cache.delete(key);
        }
    }

    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
        this.currentCacheSize = 0;
    }
}

/**
 * Network optimization
 */
export function optimizeNetwork() {
    if (typeof window === 'undefined' || !('connection' in navigator)) return;

    const connection = navigator.connection;
    if (!connection) return;

    // Adjust based on connection speed
    const effectiveType = connection.effectiveType;
    
    switch (effectiveType) {
        case 'slow-2g':
        case '2g':
            // Reduce quality significantly
            document.documentElement.style.setProperty('--image-quality', '0.5');
            document.documentElement.style.setProperty('--video-quality', 'low');
            break;
        case '3g':
            // Moderate quality
            document.documentElement.style.setProperty('--image-quality', '0.7');
            document.documentElement.style.setProperty('--video-quality', 'medium');
            break;
        case '4g':
        default:
            // Full quality
            document.documentElement.style.setProperty('--image-quality', '1.0');
            document.documentElement.style.setProperty('--video-quality', 'high');
            break;
    }
}

/**
 * Initialize optimizations
 */
export function initOptimizations() {
    applyPlatformOptimizations();
    optimizeNetwork();
    
    // Monitor memory usage (if available)
    if ('memory' in performance) {
        setInterval(() => {
            const memory = performance.memory;
            if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
                console.warn('High memory usage detected, clearing caches...');
                // Trigger garbage collection if possible
                if (global.gc) {
                    global.gc();
                }
            }
        }, 60000); // Check every minute
    }
}
