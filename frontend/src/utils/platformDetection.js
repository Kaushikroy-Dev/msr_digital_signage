/**
 * Platform Detection Utility
 * Detects the platform the application is running on and returns normalized platform strings
 * that match the database schema values: 'windows', 'android', 'tizen', 'webos', 'brightsign', 'linux'
 */

/**
 * Detect the current platform
 * @returns {string} Normalized platform string matching database values
 */
export function detectPlatform() {
    // Check for test override first (for browser testing)
    if (typeof window !== 'undefined') {
        // Check localStorage for test platform override
        const testPlatform = localStorage.getItem('ds_test_platform');
        if (testPlatform && isValidPlatform(testPlatform)) {
            console.log('[Platform Detection] Using test override from localStorage:', testPlatform);
            return testPlatform;
        }
        
        // Check for global test platform override
        if (window.__DS_TEST_PLATFORM__ && isValidPlatform(window.__DS_TEST_PLATFORM__)) {
            console.log('[Platform Detection] Using test override from window:', window.__DS_TEST_PLATFORM__);
            return window.__DS_TEST_PLATFORM__;
        }
    }
    
    // Check for Tizen (Samsung Smart TV)
    if (typeof window !== 'undefined' && window.tizen) {
        return 'tizen';
    }

    // Check for WebOS (LG Smart TV)
    if (typeof window !== 'undefined' && (window.webOS || window.PalmSystem)) {
        return 'webos';
    }

    // Check for BrightSign
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('brightsign')) {
            return 'brightsign';
        }
    }

    // Check for Android
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('android')) {
            return 'android';
        }
    }

    // Check for Windows
    if (typeof navigator !== 'undefined' && navigator.platform) {
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('win')) {
            return 'windows';
        }
    }

    // Check for Linux (but not Android)
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
        const ua = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('linux') && !ua.includes('android')) {
            return 'linux';
        }
    }

    // Fallback: try to detect from user agent
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
        const ua = navigator.userAgent.toLowerCase();
        
        // Additional WebOS detection (some devices)
        if (ua.includes('webos') || ua.includes('web0s')) {
            return 'webos';
        }
        
        // Additional Tizen detection
        if (ua.includes('tizen')) {
            return 'tizen';
        }
    }

    // Default fallback - assume web player (will be normalized to android by backend)
    return 'android';
}

/**
 * Get platform version if available
 * @returns {string|null} Platform version or null if not available
 */
export function getPlatformVersion() {
    if (typeof window !== 'undefined' && window.tizen) {
        try {
            return window.tizen.systeminfo.getPropertyValue('platformVersion') || null;
        } catch (e) {
            return null;
        }
    }

    if (typeof window !== 'undefined' && window.webOS) {
        try {
            return window.webOS.version || null;
        } catch (e) {
            return null;
        }
    }

    if (typeof navigator !== 'undefined' && navigator.userAgent) {
        const ua = navigator.userAgent;
        
        // Extract Android version
        const androidMatch = ua.match(/android\s([\d.]+)/i);
        if (androidMatch) {
            return androidMatch[1];
        }
        
        // Extract Windows version
        const windowsMatch = ua.match(/windows\s(nt\s)?([\d.]+)/i);
        if (windowsMatch) {
            return windowsMatch[2];
        }
    }

    return null;
}

/**
 * Get device capabilities
 * @returns {Object} Device capabilities object
 */
export function getDeviceCapabilities() {
    const platform = detectPlatform();
    const capabilities = {
        platform,
        platformVersion: getPlatformVersion(),
        screenWidth: typeof window !== 'undefined' ? window.innerWidth : null,
        screenHeight: typeof window !== 'undefined' ? window.innerHeight : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        hasTizenAPI: typeof window !== 'undefined' && !!window.tizen,
        hasWebOSAPI: typeof window !== 'undefined' && (!!window.webOS || !!window.PalmSystem),
        isTV: platform === 'tizen' || platform === 'webos',
        isMobile: platform === 'android',
        isDesktop: platform === 'windows' || platform === 'linux',
        isKiosk: false, // Will be set by kiosk utilities
    };

    return capabilities;
}

/**
 * Get device info object for pairing/generate endpoint
 * @returns {Object} Device info object
 */
export function getDeviceInfo() {
    const capabilities = getDeviceCapabilities();
    return {
        platform: capabilities.platform,
        platformVersion: capabilities.platformVersion,
        userAgent: capabilities.userAgent,
        resolution: capabilities.screenWidth && capabilities.screenHeight 
            ? `${capabilities.screenWidth}x${capabilities.screenHeight}` 
            : null,
        screenWidth: capabilities.screenWidth,
        screenHeight: capabilities.screenHeight,
        hasTizenAPI: capabilities.hasTizenAPI,
        hasWebOSAPI: capabilities.hasWebOSAPI,
        isTV: capabilities.isTV,
    };
}

/**
 * Check if platform is valid according to database schema
 * @param {string} platform - Platform string to validate
 * @returns {boolean} True if platform is valid
 */
export function isValidPlatform(platform) {
    const validPlatforms = ['windows', 'android', 'tizen', 'webos', 'brightsign', 'linux'];
    return validPlatforms.includes(platform?.toLowerCase());
}

/**
 * Normalize platform string to match database values
 * @param {string} platform - Platform string to normalize
 * @returns {string} Normalized platform string
 */
export function normalizePlatform(platform) {
    if (!platform) {
        return 'android'; // Default fallback
    }

    const normalized = platform.toLowerCase();
    
    // Map common variations to standard values
    const platformMap = {
        'web_player': 'android',
        'web-player': 'android',
        'webplayer': 'android',
        'webos': 'webos',
        'web0s': 'webos',
        'lg webos': 'webos',
        'samsung tizen': 'tizen',
        'tizen': 'tizen',
        'brightsign': 'brightsign',
        'brightsign player': 'brightsign',
        'windows': 'windows',
        'win': 'windows',
        'android': 'android',
        'linux': 'linux',
    };

    if (platformMap[normalized]) {
        return platformMap[normalized];
    }

    // If it's already a valid platform, return it
    if (isValidPlatform(normalized)) {
        return normalized;
    }

    // Default fallback
    return 'android';
}
