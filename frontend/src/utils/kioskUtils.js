/**
 * Kiosk mode utilities for Windows/Linux/Android
 * Provides functions to enforce kiosk mode behavior
 */

/**
 * Prevent window closing
 */
export function preventWindowClose() {
    if (typeof window === 'undefined') return;

    // Prevent beforeunload
    window.addEventListener('beforeunload', (e) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
    });

    // Prevent common exit shortcuts
    document.addEventListener('keydown', (e) => {
        // Prevent Alt+F4, Ctrl+W, Ctrl+Q, etc.
        if (
            (e.altKey && e.key === 'F4') ||
            (e.ctrlKey && (e.key === 'w' || e.key === 'q')) ||
            (e.key === 'Escape' && e.ctrlKey)
        ) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);
}

/**
 * Enforce fullscreen mode
 */
export function enforceFullscreen() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Request fullscreen on load
    const requestFullscreen = () => {
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(() => {
                console.log('Fullscreen request denied');
            });
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    };

    // Request fullscreen immediately
    requestFullscreen();

    // Re-request if fullscreen is exited
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            setTimeout(requestFullscreen, 100);
        }
    });

    document.addEventListener('webkitfullscreenchange', () => {
        if (!document.webkitFullscreenElement) {
            setTimeout(requestFullscreen, 100);
        }
    });

    document.addEventListener('mozfullscreenchange', () => {
        if (!document.mozFullScreenElement) {
            setTimeout(requestFullscreen, 100);
        }
    });

    document.addEventListener('MSFullscreenChange', () => {
        if (!document.msFullscreenElement) {
            setTimeout(requestFullscreen, 100);
        }
    });
}

/**
 * Auto-restart on crash or error
 */
export function setupAutoRestart() {
    if (typeof window === 'undefined') return;

    // Handle unhandled errors
    window.addEventListener('error', (event) => {
        console.error('Unhandled error:', event.error);
        // Restart after delay
        setTimeout(() => {
            window.location.reload();
        }, 5000);
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        // Restart after delay
        setTimeout(() => {
            window.location.reload();
        }, 5000);
    });

    // Heartbeat to detect if app is frozen
    let lastHeartbeat = Date.now();
    setInterval(() => {
        const now = Date.now();
        if (now - lastHeartbeat > 60000) {
            // App appears frozen, restart
            console.warn('App appears frozen, restarting...');
            window.location.reload();
        }
        lastHeartbeat = now;
    }, 10000);

    // Update heartbeat on activity
    ['mousedown', 'keydown', 'touchstart'].forEach(event => {
        document.addEventListener(event, () => {
            lastHeartbeat = Date.now();
        });
    });
}

/**
 * Disable right-click context menu
 */
export function disableContextMenu() {
    if (typeof document === 'undefined') return;

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
}

/**
 * Disable text selection
 */
export function disableTextSelection() {
    if (typeof document === 'undefined') return;

    document.addEventListener('selectstart', (e) => {
        e.preventDefault();
        return false;
    });

    // Add CSS to prevent selection
    const style = document.createElement('style');
    style.textContent = `
        * {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Initialize kiosk mode
 */
export function initKioskMode() {
    preventWindowClose();
    enforceFullscreen();
    setupAutoRestart();
    disableContextMenu();
    disableTextSelection();

    console.log('Kiosk mode initialized');
}

/**
 * Check if running in Electron
 */
export function isElectron() {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
}

/**
 * Get platform info
 */
export function getPlatformInfo() {
    if (isElectron()) {
        return {
            platform: window.electronAPI?.platform || 'unknown',
            versions: window.electronAPI?.versions || {},
            isElectron: true,
        };
    }
    return {
        isElectron: false,
    };
}
