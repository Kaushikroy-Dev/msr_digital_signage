/**
 * TV Remote Control Support
 * Handles TV remote key events for Tizen, WebOS, and other TV platforms
 */

/**
 * Initialize TV remote control handling
 */
export function initTVRemote() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Handle keydown events
    document.addEventListener('keydown', handleRemoteKey, true);
    
    // Handle keyup events (for long press detection)
    document.addEventListener('keyup', handleRemoteKeyUp, true);

    console.log('TV remote control initialized');
}

/**
 * Handle remote key events
 */
function handleRemoteKey(event) {
    const keyCode = event.keyCode || event.which;
    const key = event.key;

    // Map common TV remote keys
    const keyMap = {
        // Arrow keys
        'ArrowUp': 'UP',
        'ArrowDown': 'DOWN',
        'ArrowLeft': 'LEFT',
        'ArrowRight': 'RIGHT',
        
        // Enter/OK
        'Enter': 'OK',
        ' ': 'OK', // Space bar
        
        // Back
        'Backspace': 'BACK',
        'Escape': 'BACK',
        
        // Color keys (Tizen/WebOS)
        'ColorF0Red': 'RED',
        'ColorF1Green': 'GREEN',
        'ColorF2Yellow': 'YELLOW',
        'ColorF3Blue': 'BLUE',
        
        // Number keys
        '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
        '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    };

    const mappedKey = keyMap[key] || keyMap[keyCode] || key;

    // Prevent default for TV remote keys
    if (['UP', 'DOWN', 'LEFT', 'RIGHT', 'OK', 'BACK', 'RED', 'GREEN', 'YELLOW', 'BLUE'].includes(mappedKey)) {
        event.preventDefault();
        event.stopPropagation();
    }

    // Handle specific keys
    switch (mappedKey) {
        case 'BACK':
            handleBackKey(event);
            break;
        case 'OK':
            handleOKKey(event);
            break;
        case 'UP':
        case 'DOWN':
        case 'LEFT':
        case 'RIGHT':
            handleNavigationKey(mappedKey, event);
            break;
        default:
            // Other keys can be handled by app
            break;
    }
}

/**
 * Handle remote key up events
 */
function handleRemoteKeyUp(event) {
    // Can be used for long press detection
    // Currently not implemented
}

/**
 * Handle back key
 * In kiosk mode, prevent navigation away
 */
function handleBackKey(event) {
    // In kiosk mode, prevent back navigation
    // Just log the event - app should handle it
    console.log('[TV Remote] Back key pressed');
    
    // Optionally, you can dispatch a custom event
    const customEvent = new CustomEvent('tvremote:back', {
        bubbles: true,
        cancelable: true,
    });
    document.dispatchEvent(customEvent);
}

/**
 * Handle OK/Enter key
 */
function handleOKKey(event) {
    console.log('[TV Remote] OK key pressed');
    
    const customEvent = new CustomEvent('tvremote:ok', {
        bubbles: true,
        cancelable: true,
    });
    document.dispatchEvent(customEvent);
}

/**
 * Handle navigation keys
 */
function handleNavigationKey(direction, event) {
    console.log(`[TV Remote] ${direction} key pressed`);
    
    const customEvent = new CustomEvent('tvremote:navigate', {
        bubbles: true,
        cancelable: true,
        detail: { direction },
    });
    document.dispatchEvent(customEvent);
}

/**
 * Tizen-specific remote handling
 */
export function initTizenRemote() {
    if (typeof window === 'undefined' || !window.tizen) return;

    try {
        // Tizen TV key handling
        window.addEventListener('tizenhwkey', (event) => {
            const keyName = event.keyName;
            
            if (keyName === 'back') {
                handleBackKey(event);
            }
        });
        
        console.log('Tizen remote control initialized');
    } catch (error) {
        console.warn('Tizen remote initialization failed:', error);
    }
}

/**
 * WebOS-specific remote handling
 */
export function initWebOSRemote() {
    if (typeof window === 'undefined' || !window.webOS) return;

    try {
        // WebOS TV key handling
        document.addEventListener('keydown', (event) => {
            // WebOS uses standard key events
            // Additional handling can be added here
        });
        
        console.log('WebOS remote control initialized');
    } catch (error) {
        console.warn('WebOS remote initialization failed:', error);
    }
}

/**
 * Get remote key name from event
 */
export function getRemoteKeyName(event) {
    const keyCode = event.keyCode || event.which;
    const key = event.key;

    const keyMap = {
        38: 'UP',
        40: 'DOWN',
        37: 'LEFT',
        39: 'RIGHT',
        13: 'OK',
        8: 'BACK',
        27: 'BACK',
    };

    return keyMap[keyCode] || key;
}

/**
 * Check if key is a TV remote key
 */
export function isTVRemoteKey(event) {
    const keyName = getRemoteKeyName(event);
    return ['UP', 'DOWN', 'LEFT', 'RIGHT', 'OK', 'BACK'].includes(keyName);
}
