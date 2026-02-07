---
name: Android WebView Player Integration Plan
overview: ""
todos: []
---

# Android WebView Player Integration Plan

## Use Case Overview

- Android app registers device and receives device/player ID
- Android app stores device ID in local storage
- Android app opens WebView with URL: `https://frontend-production-73c0.up.railway.app/player/{deviceId}`
- Player fetches schedules and playlists automatically from device ID
- No authentication required
- Works in WebView environment (no redirects, no popups)

## Current State Analysis

### Device Registration Flow

- Device registration endpoint: `POST /devices` (requires auth)
- Pairing flow: Generate code → Claim code → Get device ID
- Device ID is UUID format: `6676a42e-a5b8-48f5-8756-ed45cc25e2e4`

### Player Endpoint

- ✅ `/player/:deviceId/content` is already public (no auth)
- ✅ Fetches schedule and playlist from device ID
- ❌ Frontend API client adds auth token to all requests
- ❌ Player component may redirect on auth errors

### WebView Requirements

- No authentication popups
- No redirects to login page
- No external links/popups
- Must work offline (cached content)
- Handle WebView-specific JavaScript limitations

## Required Changes

### Phase 1: Make Player Fully Public (No Auth)

**File: `frontend/src/lib/api.js`**

- Skip auth token for player-related API calls
- Identify player routes: `/schedules/player/*`, `/player/*`
- Don't add Authorization header for these routes
- Handle 401 errors gracefully (don't redirect to login for player routes)

**File: `frontend/src/pages/DevicePlayer.jsx`**

- Make all API calls work without auth
- Disable auth-dependent features (heartbeat, WebSocket) or make them optional
- Don't redirect to login on auth errors
- Handle missing auth gracefully

### Phase 2: Device Registration Returns Device ID

**File: `services/device-service/src/index.js`**

- Ensure device registration returns device ID in response
- Verify pairing/claim process returns device ID
- Document the response format for Android app

**Current Response Format (verify):**

```json
{
  "id": "6676a42e-a5b8-48f5-8756-ed45cc25e2e4",
  "deviceName": "...",
  "deviceCode": "...",
  ...
}
```

### Phase 3: WebView Optimization

**File: `frontend/src/pages/DevicePlayer.jsx`**

- Disable features that don't work in WebView:
  - Fullscreen requests (may fail in WebView)
  - External links
  - Popups/modals
- Add WebView detection
- Optimize for WebView performance

**File: `frontend/src/components/MediaPlayer.jsx`**

- Handle fullscreen gracefully (may not work in WebView)
- Ensure video plays inline (already has `playsInline`)
- Optimize video loading for WebView

### Phase 4: URL Format and Routing

**Current URL Format:**

```
https://frontend-production-73c0.up.railway.app/player/6676a42e-a5b8-48f5-8756-ed45cc25e2e4
```

**Requirements:**

- ✅ URL already supports device ID in path
- ✅ Route is already public (not wrapped in PrivateRoute)
- ⚠️ Need to ensure it works without any auth tokens

### Phase 5: Error Handling for WebView

**File: `frontend/src/pages/DevicePlayer.jsx`**

- Show user-friendly errors (no technical jargon)
- Handle network errors gracefully
- Show "No content" message if no schedule assigned
- Don't show login prompts

## Implementation Details

### 1. Frontend API Client - Skip Auth for Player

```javascript
// In frontend/src/lib/api.js
api.interceptors.request.use(
  (config) => {
    // Skip auth for player routes
    const isPlayerRoute = 
      config.url?.includes('/player/') || 
      config.url?.includes('/schedules/player/');
    
    if (!isPlayerRoute) {
      // Only add auth for non-player routes
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const { token } = JSON.parse(authStorage).state;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    // For player routes, don't add auth header at all
    return config;
  },
  (error) => Promise.reject(error)
);
```

### 2. Response Interceptor - Don't Redirect on Auth Errors for Player

```javascript
// In frontend/src/lib/api.js
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url || '';
      const isPlayerRoute = url.includes('/player/') || url.includes('/schedules/player/');
      
      // Don't redirect to login for player routes
      if ((status === 401 || status === 403) && isPlayerRoute) {
        console.warn('[Player] Auth error on player route - ignoring');
        return Promise.reject(error);
      }
      
      // Existing auth error handling for non-player routes
      // ...
    }
    return Promise.reject(error);
  }
);
```

### 3. DevicePlayer Component - Make Features Optional

```javascript
// In frontend/src/pages/DevicePlayer.jsx
// Make heartbeat optional - don't fail if auth missing
const sendHeartbeat = async () => {
  try {
    await api.post(`/devices/${deviceId}/heartbeat`, {
      cpuUsage: Math.random() * 20 + 5,
      memoryUsage: Math.random() * 30 + 40,
      networkStatus: 'online',
      isPlaying: isPlaying
    });
  } catch (err) {
    // Silently fail if auth is missing - player should still work
    if (err.response?.status === 401) {
      console.log('[Player] Heartbeat skipped - no auth (expected for public player)');
    } else {
      console.error('[Player] Heartbeat failed:', err);
    }
  }
};

// Make WebSocket optional
useEffect(() => {
  if (!deviceId) return;
  
  // Only connect WebSocket if we have auth (optional feature)
  const authStorage = localStorage.getItem('auth-storage');
  if (!authStorage) {
    console.log('[Player] WebSocket skipped - no auth (expected for public player)');
    return;
  }
  
  // Existing WebSocket connection code...
}, [deviceId]);
```

### 4. WebView Detection

```javascript
// In frontend/src/pages/DevicePlayer.jsx
const isWebView = () => {
  // Detect Android WebView
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /wv|WebView/i.test(userAgent) || 
         (window.Android !== undefined) ||
         (window.webkit?.messageHandlers !== undefined);
};

// Disable fullscreen in WebView
useEffect(() => {
  if (isWebView() && autoPlay && containerRef.current) {
    // Skip fullscreen request in WebView
    console.log('[Player] WebView detected - skipping fullscreen');
    return;
  }
  // Existing fullscreen code...
}, [autoPlay]);
```

### 5. Device Registration Response Format

**Verify current response includes device ID:**

```javascript
// In services/device-service/src/index.js
// POST /devices endpoint should return:
{
  id: device.id,  // This is the device/player ID
  deviceName: device.device_name,
  deviceCode: device.device_code,
  // ... other fields
}
```

## Android App Integration Guide

### Step 1: Device Registration

```kotlin
// Android app registers device
val response = api.post("/devices", deviceData)
val deviceId = response.body()?.id  // Save this ID
// Store in SharedPreferences or local database
prefs.edit().putString("device_id", deviceId).apply()
```

### Step 2: Open WebView with Player URL

```kotlin
// Android app opens WebView
val deviceId = prefs.getString("device_id", "")
val playerUrl = "https://frontend-production-73c0.up.railway.app/player/$deviceId"

webView.loadUrl(playerUrl)

// Configure WebView settings
webView.settings.javaScriptEnabled = true
webView.settings.domStorageEnabled = true
webView.settings.mediaPlaybackRequiresUserGesture = false
webView.settings.allowFileAccess = true
```

### Step 3: Handle WebView Events

```kotlin
webView.webViewClient = object : WebViewClient() {
    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
        // Don't allow navigation away from player
        val url = request?.url?.toString() ?: return false
        if (url.contains("/player/")) {
            return false  // Allow navigation within player
        }
        return true  // Block external navigation
    }
}
```

## Testing Checklist

- [ ] Player URL works without authentication
- [ ] Player URL works in Android WebView
- [ ] Device registration returns device ID
- [ ] Player fetches content from device ID automatically
- [ ] No login redirects in WebView
- [ ] Video plays correctly in WebView
- [ ] Images display correctly
- [ ] No console errors related to auth
- [ ] Heartbeat fails gracefully (doesn't break player)
- [ ] WebSocket fails gracefully (doesn't break player)
- [ ] Works offline (cached content)

## Security Considerations

1. **Device ID Validation**: Strict UUID validation on backend
2. **Content Isolation**: Device can only access its own scheduled content
3. **Rate Limiting**: Add rate limiting to player endpoint
4. **No Sensitive Data**: Player endpoint only returns content, not user/tenant data
5. **CORS**: Ensure CORS allows WebView requests

## Files to Modify

1. `frontend/src/lib/api.js` - Skip auth for player routes, don't redirect on auth errors
2. `frontend/src/pages/DevicePlayer.jsx` - Make heartbeat/WebSocket optional, add WebView detection
3. `frontend/src/components/MediaPlayer.jsx` - Handle WebView fullscreen gracefully
4. `services/device-service/src/index.js` - Verify device registration returns device ID
5. Documentation: Create Android integration guide

## Expected Outcome

- Android app can register device and get device ID
- Android app can open WebView with player URL containing device ID
- Player