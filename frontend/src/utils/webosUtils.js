/**
 * WebOS-specific utilities and API integrations
 * For LG Smart TV (WebOS) platform
 */

/**
 * Initialize WebOS-specific features
 */
export function initWebOS() {
    if (typeof window === 'undefined' || (!window.webOS && !window.PalmSystem)) {
        console.warn('WebOS API not available');
        return false;
    }

    try {
        // Get WebOS system info
        if (window.PalmSystem) {
            const systemInfo = {
                identifier: window.PalmSystem.identifier || null,
                version: window.PalmSystem.version || null,
            };
            console.log('WebOS System Info:', systemInfo);
        }

        // Set app to fullscreen
        if (window.webOS && window.webOS.platform) {
            console.log('WebOS platform:', window.webOS.platform);
        }

        console.log('WebOS initialized successfully');
        return true;
    } catch (error) {
        console.error('WebOS initialization error:', error);
        return false;
    }
}

/**
 * Handle WebOS back button
 */
export function setupWebOSBackButton(callback) {
    if (typeof window === 'undefined' || !window.PalmSystem) {
        return null;
    }

    try {
        const backHandler = (event) => {
            // Prevent default back behavior in player mode
            if (callback) {
                callback(event);
            }
            // Don't allow back navigation in kiosk mode
            return false;
        };

        // Listen for back gesture
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' || event.keyCode === 27) {
                backHandler(event);
            }
        });

        return () => {
            document.removeEventListener('keydown', backHandler);
        };
    } catch (error) {
        console.error('Failed to setup WebOS back button:', error);
        return null;
    }
}

/**
 * Get WebOS system information
 */
export function getWebOSSystemInfo() {
    if (typeof window === 'undefined' || !window.PalmSystem) {
        return null;
    }

    try {
        const systemInfo = {
            identifier: window.PalmSystem.identifier || null,
            version: window.PalmSystem.version || null,
            screenWidth: window.screen?.width || null,
            screenHeight: window.screen?.height || null,
        };

        // Get additional info if available
        if (window.webOS) {
            systemInfo.platform = window.webOS.platform || null;
            systemInfo.deviceInfo = window.webOS.deviceInfo || null;
        }

        return systemInfo;
    } catch (error) {
        console.error('Failed to get WebOS system info:', error);
        return null;
    }
}

/**
 * Handle WebOS app lifecycle events
 */
export function setupWebOSLifecycle(callbacks = {}) {
    if (typeof window === 'undefined' || !window.PalmSystem) {
        return;
    }

    try {
        // Handle app visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (callbacks.onHide) {
                    callbacks.onHide();
                }
            } else {
                if (callbacks.onShow) {
                    callbacks.onShow();
                }
            }
        });

        // Handle app launch
        if (window.PalmSystem && window.PalmSystem.stageReady) {
            window.PalmSystem.stageReady();
        }

        // Prevent back navigation in kiosk mode
        setupWebOSBackButton(() => {
            if (callbacks.onBack) {
                callbacks.onBack();
            }
            // Return false to prevent default back behavior
            return false;
        });

        console.log('WebOS lifecycle handlers setup');
    } catch (error) {
        console.error('Failed to setup WebOS lifecycle:', error);
    }
}

/**
 * Request fullscreen on WebOS
 */
export function requestWebOSFullscreen() {
    if (typeof window === 'undefined' || !document.documentElement) {
        return;
    }

    try {
        // Request fullscreen (requires user gesture, so wrap in promise)
        const requestFullscreen = () => {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(err => {
                    // Fullscreen requires user gesture - this is expected in test mode
                    console.log('[WebOS] Fullscreen request requires user gesture (normal in browser testing)');
                });
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen().catch(err => {
                    console.log('[WebOS] Fullscreen request requires user gesture (normal in browser testing)');
                });
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen().catch(err => {
                    console.log('[WebOS] Fullscreen request requires user gesture (normal in browser testing)');
                });
            } else if (document.documentElement.msRequestFullscreen) {
                document.documentElement.msRequestFullscreen().catch(err => {
                    console.log('[WebOS] Fullscreen request requires user gesture (normal in browser testing)');
                });
            }
        };
        
        // Try immediately, but don't fail if it requires user gesture
        requestFullscreen();
    } catch (error) {
        // Silently handle - fullscreen requires user gesture in browsers
        console.log('[WebOS] Fullscreen not available without user gesture (normal in browser testing)');
    }
}

/**
 * Handle WebOS remote control events
 */
export function setupWebOSRemoteControl(callbacks = {}) {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const keyDownHandler = (event) => {
            const keyCode = event.keyCode;
            const key = event.key;

            // Handle specific keys
            switch (key) {
                case 'MediaPlayPause':
                case 'PlayPause':
                    if (callbacks.onPlayPause) {
                        callbacks.onPlayPause();
                    }
                    break;
                case 'MediaStop':
                case 'Stop':
                    if (callbacks.onStop) {
                        callbacks.onStop();
                    }
                    break;
                case 'ArrowLeft':
                    if (callbacks.onLeft) {
                        callbacks.onLeft();
                    }
                    break;
                case 'ArrowRight':
                    if (callbacks.onRight) {
                        callbacks.onRight();
                    }
                    break;
                case 'Escape':
                    // Prevent exit in kiosk mode
                    event.preventDefault();
                    if (callbacks.onBack) {
                        callbacks.onBack();
                    }
                    break;
                default:
                    // Ignore other keys
                    break;
            }
        };

        window.addEventListener('keydown', keyDownHandler);

        return () => {
            window.removeEventListener('keydown', keyDownHandler);
        };
    } catch (error) {
        console.error('Failed to setup WebOS remote control:', error);
        return null;
    }
}
