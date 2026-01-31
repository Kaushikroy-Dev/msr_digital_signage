/**
 * Tizen-specific utilities and API integrations
 * For Samsung Smart TV (Tizen) platform
 */

/**
 * Initialize Tizen-specific features
 */
export function initTizen() {
    if (typeof window === 'undefined' || !window.tizen) {
        console.warn('Tizen API not available');
        return false;
    }

    try {
        // Prevent screen saver
        if (window.tizen.tvinputdevice) {
            window.tizen.tvinputdevice.registerKey('MediaPlay');
        }

        // Set app to fullscreen
        if (window.tizen.application) {
            const app = window.tizen.application.getCurrentApplication();
            if (app) {
                app.getRequestedAppControl().requestAppControl(
                    window.tizen.ApplicationControlReplyResult.SUCCEEDED
                );
            }
        }

        console.log('Tizen initialized successfully');
        return true;
    } catch (error) {
        console.error('Tizen initialization error:', error);
        return false;
    }
}

/**
 * Prevent screen saver on Tizen TV
 */
export function preventScreenSaver() {
    if (typeof window === 'undefined' || !window.tizen) {
        return;
    }

    try {
        // Keep screen on by simulating activity
        const keepAlive = () => {
            if (window.tizen.tvinputdevice) {
                window.tizen.tvinputdevice.registerKey('MediaPlay');
            }
        };

        // Call every 5 minutes
        setInterval(keepAlive, 5 * 60 * 1000);
    } catch (error) {
        console.error('Failed to prevent screen saver:', error);
    }
}

/**
 * Handle Tizen remote control events
 */
export function setupTizenRemoteControl(callbacks = {}) {
    if (typeof window === 'undefined' || !window.tizen) {
        return;
    }

    try {
        const keyDownHandler = (event) => {
            const keyCode = event.keyCode;
            const keyName = event.keyName;

            // Handle specific keys
            switch (keyName) {
                case 'MediaPlay':
                case 'MediaPause':
                    if (callbacks.onPlayPause) {
                        callbacks.onPlayPause();
                    }
                    break;
                case 'MediaStop':
                    if (callbacks.onStop) {
                        callbacks.onStop();
                    }
                    break;
                case 'MediaRewind':
                    if (callbacks.onRewind) {
                        callbacks.onRewind();
                    }
                    break;
                case 'MediaFastForward':
                    if (callbacks.onFastForward) {
                        callbacks.onFastForward();
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
        console.error('Failed to setup Tizen remote control:', error);
        return null;
    }
}

/**
 * Get Tizen system information
 */
export async function getTizenSystemInfo() {
    if (typeof window === 'undefined' || !window.tizen || !window.tizen.systeminfo) {
        return null;
    }

    try {
        const systemInfo = {
            platformVersion: null,
            modelName: null,
            firmwareVersion: null,
            screenWidth: null,
            screenHeight: null,
        };

        // Get platform version
        try {
            systemInfo.platformVersion = await window.tizen.systeminfo.getPropertyValue('platformVersion');
        } catch (e) {
            console.warn('Could not get platform version');
        }

        // Get model name
        try {
            systemInfo.modelName = await window.tizen.systeminfo.getPropertyValue('modelName');
        } catch (e) {
            console.warn('Could not get model name');
        }

        // Get firmware version
        try {
            systemInfo.firmwareVersion = await window.tizen.systeminfo.getPropertyValue('firmwareVersion');
        } catch (e) {
            console.warn('Could not get firmware version');
        }

        // Get screen resolution
        try {
            const display = await window.tizen.systeminfo.getPropertyValue('DISPLAY');
            if (display) {
                systemInfo.screenWidth = display.resolutionWidth;
                systemInfo.screenHeight = display.resolutionHeight;
            }
        } catch (e) {
            console.warn('Could not get screen resolution');
        }

        return systemInfo;
    } catch (error) {
        console.error('Failed to get Tizen system info:', error);
        return null;
    }
}

/**
 * Handle Tizen app lifecycle events
 */
export function setupTizenLifecycle(callbacks = {}) {
    if (typeof window === 'undefined' || !window.tizen) {
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

        // Handle app termination
        window.addEventListener('tizenhwkey', (event) => {
            if (event.keyName === 'back') {
                event.preventDefault();
                if (callbacks.onBack) {
                    callbacks.onBack();
                }
            }
        });

        console.log('Tizen lifecycle handlers setup');
    } catch (error) {
        console.error('Failed to setup Tizen lifecycle:', error);
    }
}
