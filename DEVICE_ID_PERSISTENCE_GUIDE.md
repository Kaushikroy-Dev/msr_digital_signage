# 🔄 Device ID Persistence - Implementation & Testing Guide

## Overview

This document describes the **device ID persistence** feature that allows devices to "remember" their registration across sessions, eliminating the need to re-pair every time.

---

## 🎯 Feature Requirements

### Browser Behavior
1. **First Visit** to `/player` → Show pairing screen
2. **After Pairing** → Save deviceId to localStorage
3. **Next Visit** to `/player` → Auto-redirect to `/player/{deviceId}`
4. **Direct Access** to `/player/{deviceId}` → Load player immediately

### WebView (Android/iOS) Behavior
1. **First Visit** to `/player` → Show pairing screen
2. **After Pairing** → Save deviceId to native app via JavaScript interface
3. **Next Visit** to `/player` → Auto-redirect to `/player/{deviceId}` using saved ID
4. **App Restart** → Device ID persists in native storage

---

## 🏗️ Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Opens App/Browser                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Access /player or   │
              │  /start endpoint     │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Check for saved      │
              │ deviceId             │
              │ (localStorage or     │
              │  native app)         │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
   ┌─────────┐                    ┌──────────┐
   │ Found   │                    │ Not Found│
   └────┬────┘                    └─────┬────┘
        │                               │
        ▼                               ▼
┌───────────────┐              ┌─────────────────┐
│ Redirect to   │              │ Show Pairing    │
│ /player/{id}  │              │ Screen          │
└───────────────┘              └────────┬────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │ User Pairs      │
                               │ Device          │
                               └────────┬────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │ Save deviceId:  │
                               │ - localStorage  │
                               │ - Native App    │
                               │ - Update URL    │
                               └─────────────────┘
```

---

## 📝 Implementation Details

### 1. **WebView Utilities** (`utils/webViewUtils.js`)

#### Save Device ID
```javascript
export function saveDeviceIdToNative(deviceId) {
    // Android WebView
    if (isAndroidWebView() && window.Android) {
        window.Android.saveDeviceId(deviceId);
    }
    
    // iOS WebView
    if (isIOSWebView() && window.webkit?.messageHandlers?.saveDeviceId) {
        window.webkit.messageHandlers.saveDeviceId.postMessage(deviceId);
    }
}
```

#### Get Device ID
```javascript
export function getDeviceId() {
    // 1. Try native app first (WebView)
    const nativeDeviceId = getDeviceIdFromNative();
    if (nativeDeviceId) return nativeDeviceId;
    
    // 2. Fallback to localStorage (browser)
    return localStorage.getItem('ds_device_id');
}
```

### 2. **Device Player** (`pages/DevicePlayer.jsx`)

#### Auto-Redirect on Load
```javascript
useEffect(() => {
    // Only check if no deviceId in URL and not in Android TV flow
    if (!urlDeviceId && !playerIdFromQuery && !pairingCode) {
        const savedDeviceId = getDeviceIdFromStorage();
        if (savedDeviceId) {
            console.log('[Player] Found saved deviceId, redirecting to:', savedDeviceId);
            navigate(`/player/${savedDeviceId}`, { replace: true });
        }
    }
}, [urlDeviceId, playerIdFromQuery, pairingCode, navigate]);
```

#### Save After Pairing
```javascript
useEffect(() => {
    if (deviceId) {
        // Save to localStorage (browser)
        localStorage.setItem('ds_device_id', deviceId);
        
        // Save to native app (WebView)
        saveDeviceIdToNative(deviceId);
        
        console.log('[Player] DeviceId saved:', deviceId);
    }
}, [deviceId]);
```

### 3. **Media Redirect** (`pages/MediaRedirect.jsx`)

Entry point for apps that want explicit redirect logic:

```javascript
export default function MediaRedirect() {
    const navigate = useNavigate();
    
    useEffect(() => {
        const deviceId = getDeviceId();
        
        if (deviceId) {
            navigate(`/player/${deviceId}`, { replace: true });
        } else {
            navigate('/player', { replace: true });
        }
    }, [navigate]);
}
```

---

## 🧪 Testing Checklist

### Browser Testing

#### Test 1: First-Time Registration
1. **Clear localStorage:**
   ```javascript
   localStorage.clear();
   ```
2. **Navigate to:** `http://localhost:5173/player`
3. **Expected:** Pairing screen with 8-digit code
4. **Pair device** via admin portal
5. **Expected:** 
   - URL changes to `/player/{deviceId}`
   - Player loads content
   - Console shows: `[Player] DeviceId saved: {deviceId}`
6. **Verify localStorage:**
   ```javascript
   localStorage.getItem('ds_device_id'); // Should return deviceId
   ```

#### Test 2: Auto-Redirect on Return Visit
1. **Close browser tab**
2. **Navigate to:** `http://localhost:5173/player`
3. **Expected:**
   - Console shows: `[Player] Found saved deviceId, redirecting to: {deviceId}`
   - Immediately redirects to `/player/{deviceId}`
   - Player loads without pairing screen

#### Test 3: Direct URL Access
1. **Navigate to:** `http://localhost:5173/player/{deviceId}`
2. **Expected:** Player loads immediately without redirect

#### Test 4: Clear and Re-Register
1. **Clear localStorage:**
   ```javascript
   localStorage.clear();
   ```
2. **Navigate to:** `http://localhost:5173/player`
3. **Expected:** Pairing screen appears again

---

### WebView Testing (Android)

#### Native App Setup

**Android (Kotlin/Java):**
```kotlin
// In your WebView setup
webView.addJavascriptInterface(object : Any() {
    private var savedDeviceId: String? = null
    
    @JavascriptInterface
    fun saveDeviceId(deviceId: String) {
        savedDeviceId = deviceId
        // Save to SharedPreferences for persistence
        val prefs = getSharedPreferences("device_prefs", MODE_PRIVATE)
        prefs.edit().putString("device_id", deviceId).apply()
        Log.d("WebView", "DeviceId saved: $deviceId")
    }
    
    @JavascriptInterface
    fun getDeviceId(): String? {
        // Load from SharedPreferences
        val prefs = getSharedPreferences("device_prefs", MODE_PRIVATE)
        val deviceId = prefs.getString("device_id", null)
        Log.d("WebView", "DeviceId retrieved: $deviceId")
        return deviceId
    }
}, "Android")
```

#### Test 1: First-Time Registration (WebView)
1. **Clear app data** (Settings → Apps → Your App → Clear Data)
2. **Open app** (loads `/player`)
3. **Expected:** Pairing screen appears
4. **Pair device** via admin portal
5. **Expected:**
   - Console shows: `[WebView] DeviceId saved to Android app: {deviceId}`
   - Player loads content
6. **Verify native storage:**
   ```kotlin
   val prefs = getSharedPreferences("device_prefs", MODE_PRIVATE)
   val deviceId = prefs.getString("device_id", null)
   Log.d("Test", "Saved deviceId: $deviceId")
   ```

#### Test 2: Auto-Redirect After App Restart (WebView)
1. **Close app completely** (swipe away from recent apps)
2. **Reopen app** (loads `/player`)
3. **Expected:**
   - Console shows: `[WebView] DeviceId retrieved from Android app: {deviceId}`
   - Console shows: `[Player] Found saved deviceId, redirecting to: {deviceId}`
   - Player loads immediately without pairing

#### Test 3: App Update Persistence
1. **Update app** (install new APK)
2. **Open app**
3. **Expected:** DeviceId persists, player loads immediately

---

### WebView Testing (iOS)

#### Native App Setup

**iOS (Swift):**
```swift
// In your WKWebView configuration
let contentController = WKUserContentController()

// Save deviceId handler
contentController.add(self, name: "saveDeviceId")

// Get deviceId handler
contentController.add(self, name: "getDeviceId")

// Implement WKScriptMessageHandler
func userContentController(_ userContentController: WKUserContentController, 
                          didReceive message: WKScriptMessage) {
    if message.name == "saveDeviceId" {
        if let deviceId = message.body as? String {
            UserDefaults.standard.set(deviceId, forKey: "device_id")
            print("DeviceId saved: \(deviceId)")
        }
    } else if message.name == "getDeviceId" {
        let deviceId = UserDefaults.standard.string(forKey: "device_id")
        // Inject deviceId into WebView
        let script = "window.__nativeDeviceId = '\(deviceId ?? "")';"
        webView.evaluateJavaScript(script, completionHandler: nil)
    }
}
```

#### Test Process
Same as Android, but verify iOS-specific storage (UserDefaults).

---

## 🐛 Troubleshooting

### Issue 1: Auto-Redirect Not Working (Browser)

**Symptoms:** Pairing screen shows every time, even after pairing

**Diagnosis:**
```javascript
// Open browser console
localStorage.getItem('ds_device_id'); // Should return deviceId
```

**Possible Causes:**
1. **localStorage cleared** by browser (incognito mode, privacy settings)
2. **Different domain/port** (localhost:5173 vs localhost:3000)
3. **Cookie/storage blocked** by browser settings

**Fix:**
- Check browser console for errors
- Verify localStorage is enabled
- Use same domain/port consistently

---

### Issue 2: Auto-Redirect Not Working (WebView)

**Symptoms:** Pairing screen shows after app restart

**Diagnosis:**
```javascript
// Check console logs
// Should see: [WebView] DeviceId retrieved from Android/iOS app: {deviceId}
```

**Possible Causes:**
1. **JavaScript interface not registered** correctly
2. **Native storage not persisting** (SharedPreferences/UserDefaults)
3. **WebView not calling** `getDeviceId()` on load

**Fix (Android):**
```kotlin
// Verify interface is added
webView.addJavascriptInterface(AndroidInterface(), "Android")

// Verify SharedPreferences
val prefs = getSharedPreferences("device_prefs", MODE_PRIVATE)
Log.d("Debug", "DeviceId: ${prefs.getString("device_id", "NOT_FOUND")}")
```

**Fix (iOS):**
```swift
// Verify message handler is added
contentController.add(self, name: "saveDeviceId")
contentController.add(self, name: "getDeviceId")

// Verify UserDefaults
let deviceId = UserDefaults.standard.string(forKey: "device_id")
print("DeviceId: \(deviceId ?? "NOT_FOUND")")
```

---

### Issue 3: Infinite Redirect Loop

**Symptoms:** Page keeps redirecting between `/player` and `/player/{deviceId}`

**Diagnosis:**
Check console for repeated redirect messages

**Possible Causes:**
1. **Invalid deviceId** in storage
2. **Backend returns 404** for deviceId
3. **React Router issue** with `replace: true`

**Fix:**
```javascript
// Clear invalid deviceId
localStorage.removeItem('ds_device_id');
// Refresh page
window.location.reload();
```

---

### Issue 4: DeviceId Not Saving After Pairing

**Symptoms:** Pairing succeeds but deviceId not saved

**Diagnosis:**
```javascript
// Check console for save confirmation
// Should see: [Player] DeviceId saved: {deviceId}
// And: [WebView] DeviceId saved to Android/iOS app: {deviceId}
```

**Possible Causes:**
1. **useEffect not triggering** (dependency issue)
2. **Native interface error** (WebView)
3. **localStorage disabled** (browser)

**Fix:**
Check `DevicePlayer.jsx` line 139-147:
```javascript
useEffect(() => {
    if (deviceId) {
        localStorage.setItem('ds_device_id', deviceId);
        saveDeviceIdToNative(deviceId);
    }
}, [deviceId]); // Ensure deviceId is in dependency array
```

---

## 📊 Verification Commands

### Browser Console
```javascript
// Check saved deviceId
localStorage.getItem('ds_device_id');

// Manually save deviceId (for testing)
localStorage.setItem('ds_device_id', 'test-device-id-123');

// Clear deviceId
localStorage.removeItem('ds_device_id');

// Check if WebView
console.log('Android:', window.Android !== undefined);
console.log('iOS:', window.webkit?.messageHandlers !== undefined);
```

### Network Tab
```
1. Open DevTools → Network
2. Navigate to /player
3. Look for redirect (302/307) to /player/{deviceId}
4. Verify no pairing API calls if deviceId exists
```

---

## ✅ Success Criteria

- [ ] **Browser:** First visit shows pairing screen
- [ ] **Browser:** After pairing, deviceId saved to localStorage
- [ ] **Browser:** Next visit auto-redirects to `/player/{deviceId}`
- [ ] **Browser:** Direct access to `/player/{deviceId}` works
- [ ] **WebView (Android):** DeviceId saved to native app
- [ ] **WebView (Android):** DeviceId persists after app restart
- [ ] **WebView (iOS):** DeviceId saved to native app
- [ ] **WebView (iOS):** DeviceId persists after app restart
- [ ] **Console Logs:** Clear messages for save/retrieve operations
- [ ] **No Errors:** No JavaScript errors in console
- [ ] **Performance:** Redirect happens within 100ms

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `frontend/src/pages/DevicePlayer.jsx` | Main player component with auto-redirect logic |
| `frontend/src/pages/MediaRedirect.jsx` | Entry point for explicit redirect |
| `frontend/src/utils/webViewUtils.js` | WebView detection and native communication |
| `frontend/src/App.jsx` | Route configuration |

---

## 📝 Notes for Native App Developers

### Android Requirements
- Add JavaScript interface named `Android`
- Implement `saveDeviceId(String deviceId)` method
- Implement `getDeviceId()` method returning String
- Use SharedPreferences for persistence
- Enable JavaScript: `webView.settings.javaScriptEnabled = true`

### iOS Requirements
- Add WKScriptMessageHandler for `saveDeviceId`
- Add WKScriptMessageHandler for `getDeviceId`
- Use UserDefaults for persistence
- Inject deviceId via `window.__nativeDeviceId`
- Enable JavaScript in WKWebViewConfiguration

---

**Status:** ✅ **Implemented and Ready for Testing**  
**Last Updated:** 2026-02-06  
**Version:** 1.0
