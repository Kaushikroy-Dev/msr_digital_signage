/**
 * WebView Utilities
 * Functions for detecting WebView environment and communicating with native apps
 */

/**
 * Detect if running in Android WebView
 * @returns {boolean} True if Android WebView detected
 */
export function isAndroidWebView() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return false;
    }
    
    const ua = navigator.userAgent;
    // Check for WebView user agent or Android JavaScript interface
    return /wv|WebView/i.test(ua) || window.Android !== undefined;
}

/**
 * Detect if running in iOS WebView
 * @returns {boolean} True if iOS WebView detected
 */
export function isIOSWebView() {
    if (typeof window === 'undefined') {
        return false;
    }
    
    // Check for iOS WebKit message handlers
    return window.webkit && window.webkit.messageHandlers;
}

/**
 * Detect if running in any WebView (Android or iOS)
 * @returns {boolean} True if WebView detected
 */
export function isWebView() {
    return isAndroidWebView() || isIOSWebView();
}

/**
 * Save deviceId to native app via JavaScript interface
 * @param {string} deviceId - The device ID to save
 * @returns {boolean} True if successfully saved to native app
 */
export function saveDeviceIdToNative(deviceId) {
    if (!deviceId) {
        console.warn('[WebView] No deviceId provided to saveDeviceIdToNative');
        return false;
    }

    if (isAndroidWebView() && window.Android) {
        try {
            if (typeof window.Android.saveDeviceId === 'function') {
                window.Android.saveDeviceId(deviceId);
                console.log('[WebView] DeviceId saved to Android app:', deviceId);
                return true;
            } else {
                console.warn('[WebView] Android.saveDeviceId is not a function');
            }
        } catch (err) {
            console.error('[WebView] Failed to save deviceId to Android:', err);
        }
    } else if (isIOSWebView() && window.webkit?.messageHandlers?.saveDeviceId) {
        try {
            window.webkit.messageHandlers.saveDeviceId.postMessage(deviceId);
            console.log('[WebView] DeviceId saved to iOS app:', deviceId);
            return true;
        } catch (err) {
            console.error('[WebView] Failed to save deviceId to iOS:', err);
        }
    } else {
        console.log('[WebView] No native interface available for saving deviceId');
    }

    return false;
}

/**
 * Get deviceId from native app via JavaScript interface
 * @returns {string|null} Device ID if available, null otherwise
 */
export function getDeviceIdFromNative() {
    if (isAndroidWebView() && window.Android) {
        try {
            if (typeof window.Android.getDeviceId === 'function') {
                const deviceId = window.Android.getDeviceId();
                if (deviceId && deviceId.trim() !== '') {
                    console.log('[WebView] DeviceId retrieved from Android app:', deviceId);
                    return deviceId;
                }
            } else {
                console.warn('[WebView] Android.getDeviceId is not a function');
            }
        } catch (err) {
            console.error('[WebView] Failed to get deviceId from Android:', err);
        }
    } else if (isIOSWebView()) {
        // iOS uses callback mechanism - check for injected deviceId
        // Native app should inject deviceId into window.__nativeDeviceId
        if (window.__nativeDeviceId && typeof window.__nativeDeviceId === 'string') {
            const deviceId = window.__nativeDeviceId;
            console.log('[WebView] DeviceId retrieved from iOS app (injected):', deviceId);
            return deviceId;
        }
        
        // Request deviceId from iOS (native app will inject it)
        if (window.webkit?.messageHandlers?.getDeviceId) {
            try {
                window.webkit.messageHandlers.getDeviceId.postMessage({});
                console.log('[WebView] Requested deviceId from iOS app');
            } catch (err) {
                console.error('[WebView] Failed to request deviceId from iOS:', err);
            }
        }
    }

    return null;
}

/**
 * Get deviceId from native app or localStorage
 * Checks native app first, then falls back to localStorage
 * @returns {string|null} Device ID if available, null otherwise
 */
export function getDeviceId() {
    // Try native app first (for WebView)
    const nativeDeviceId = getDeviceIdFromNative();
    if (nativeDeviceId) {
        return nativeDeviceId;
    }

    // Fallback to localStorage (for browser or if native fails)
    if (typeof window !== 'undefined' && window.localStorage) {
        const storedDeviceId = localStorage.getItem('ds_device_id');
        if (storedDeviceId) {
            console.log('[WebView] DeviceId retrieved from localStorage:', storedDeviceId);
            return storedDeviceId;
        }
    }

    return null;
}

/**
 * Clear deviceId from native app and localStorage
 * This is called when a device is deleted from the backend
 * @returns {boolean} True if successfully cleared
 */
export function clearDeviceId() {
    let cleared = false;

    // Clear from native app (Android/iOS)
    if (isAndroidWebView() && window.Android) {
        try {
            if (typeof window.Android.clearDeviceId === 'function') {
                window.Android.clearDeviceId();
                console.log('[WebView] DeviceId cleared from Android app');
                cleared = true;
            } else if (typeof window.Android.saveDeviceId === 'function') {
                // Fallback: save empty string to clear
                window.Android.saveDeviceId('');
                console.log('[WebView] DeviceId cleared from Android app (via saveDeviceId)');
                cleared = true;
            }
        } catch (err) {
            console.error('[WebView] Failed to clear deviceId from Android:', err);
        }
    } else if (isIOSWebView() && window.webkit?.messageHandlers?.clearDeviceId) {
        try {
            window.webkit.messageHandlers.clearDeviceId.postMessage({});
            console.log('[WebView] DeviceId cleared from iOS app');
            cleared = true;
        } catch (err) {
            console.error('[WebView] Failed to clear deviceId from iOS:', err);
        }
    }

    // Clear from localStorage (browser/fallback)
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            localStorage.removeItem('ds_device_id');
            console.log('[WebView] DeviceId cleared from localStorage');
            cleared = true;
        } catch (err) {
            console.error('[WebView] Failed to clear deviceId from localStorage:', err);
        }
    }

    return cleared;
}
