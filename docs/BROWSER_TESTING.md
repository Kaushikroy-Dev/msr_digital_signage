# Browser Testing Guide

This guide shows how to test all platforms in your browser without physical devices.

## Quick Start

### Step 1: Open Player Page

Open: `http://localhost:5173/player`

### Step 2: Open Browser Console

Press `F12` (or `Cmd+Option+I` on Mac) → **Console** tab

### Step 3: Load Platform Tester

Copy and paste this into the console:

```javascript
// Load Platform Tester
const script = document.createElement('script');
script.src = '/test-platforms.js';
script.onload = () => console.log('✅ Platform Tester loaded!');
document.head.appendChild(script);
```

### Step 4: Test Platforms

Now you can test any platform:

```javascript
// Test Tizen (Samsung TV)
DSPlatformTester.testTizen()

// Test WebOS (LG TV)
DSPlatformTester.testWebOS()

// Test BrightSign
DSPlatformTester.testBrightSign()

// Test Android
DSPlatformTester.testAndroid()

// Test Windows
DSPlatformTester.testWindows()

// Test Linux
DSPlatformTester.testLinux()

// Clear test override
DSPlatformTester.clear()

// Check current status
DSPlatformTester.check()
```

## Testing Tizen (Samsung TV)

### Quick Test

```javascript
DSPlatformTester.testTizen()
```

This will:
1. Set up Tizen API simulation
2. Set platform override to 'tizen'
3. Reload the page
4. Platform should be detected as 'tizen'

### Verify Tizen Detection

After reload, check:

1. **Console Messages:**
   - Should see `[Tizen]` messages
   - Should see `[Platform Detection] Using test override from localStorage: tizen`
   - Should see `[tizen] Platform initialized`

2. **Network Tab:**
   - Open Network tab
   - Find `pairing/generate` request
   - Check Request Payload → should show `"platform": "tizen"`

3. **Pairing Code:**
   - Pairing code should appear on screen
   - Code should be generated with platform='tizen'

## Testing Other Platforms

### WebOS (LG TV)

```javascript
DSPlatformTester.testWebOS()
```

### BrightSign

```javascript
DSPlatformTester.testBrightSign()
```

### Android

```javascript
DSPlatformTester.testAndroid()
```

### Windows

```javascript
DSPlatformTester.testWindows()
```

### Linux

```javascript
DSPlatformTester.testLinux()
```

## Manual Testing (Without Script)

If you prefer to test manually, you can set the platform override directly:

```javascript
// Set platform override
localStorage.setItem('ds_test_platform', 'tizen');
window.__DS_TEST_PLATFORM__ = 'tizen';

// Set up Tizen API
window.tizen = {
    systeminfo: {
        getPropertyValue: (prop) => Promise.resolve('6.0')
    },
    application: {
        getCurrentApplication: () => ({
            exit: () => {},
            getRequestedAppControl: () => ({
                requestAppControl: () => {}
            })
        })
    },
    tvinputdevice: {
        registerKey: (key) => console.log('[Tizen] Key:', key)
    }
};

// Reload
location.reload();
```

## What to Check After Testing

### Console Output

Look for:
- `[Platform Detection] Using test override...` - Confirms override is working
- `[Tizen]` or `[WebOS]` messages - Platform-specific features initialized
- `[tizen] Platform initialized` or `[webos] Platform initialized` - Platform detected correctly

### Network Requests

1. Open **Network** tab
2. Find `POST /api/devices/pairing/generate`
3. Click on it
4. Go to **Payload** or **Request** tab
5. Check `platform` field - should match the platform you're testing

### Platform-Specific Features

**Tizen:**
- Should see `[Tizen] Registered key` messages
- Should see `[Tizen] App control requested`
- Screen saver prevention should be active

**WebOS:**
- Should see `[WebOS]` messages
- Fullscreen should be requested
- Back button handling should be active

**BrightSign:**
- Platform should be detected as 'brightsign'
- User agent should show 'BrightSign Player'

## Troubleshooting

### Platform Still Shows as "android"

1. **Check localStorage:**
   ```javascript
   console.log('Test platform:', localStorage.getItem('ds_test_platform'));
   ```

2. **Check window override:**
   ```javascript
   console.log('Window override:', window.__DS_TEST_PLATFORM__);
   ```

3. **Clear and retry:**
   ```javascript
   DSPlatformTester.clear()
   // Then test again
   DSPlatformTester.testTizen()
   ```

### Tizen API Not Working

1. **Check if window.tizen exists:**
   ```javascript
   console.log('window.tizen:', window.tizen);
   ```

2. **Re-run test:**
   ```javascript
   DSPlatformTester.testTizen()
   ```

### Page Not Reloading

If the page doesn't reload automatically:
```javascript
location.reload();
```

## Testing Checklist

For each platform, verify:

- [ ] Platform is detected correctly (check console)
- [ ] Pairing code is generated with correct platform
- [ ] Network request shows correct platform
- [ ] Platform-specific features initialize (check console messages)
- [ ] No errors in console
- [ ] Pairing code appears on screen

## Quick Reference

```javascript
// Load tester
const s = document.createElement('script');
s.src = '/test-platforms.js';
document.head.appendChild(s);

// Test platforms
DSPlatformTester.testTizen()      // Tizen
DSPlatformTester.testWebOS()     // WebOS
DSPlatformTester.testBrightSign() // BrightSign
DSPlatformTester.testAndroid()    // Android
DSPlatformTester.testWindows()  // Windows
DSPlatformTester.testLinux()    // Linux
DSPlatformTester.clear()         // Clear override
DSPlatformTester.check()         // Check status
```

## Notes

- The platform override persists in localStorage until cleared
- Each test reloads the page automatically
- Platform-specific APIs are simulated (not real APIs)
- This is for testing only - real devices will use actual APIs
