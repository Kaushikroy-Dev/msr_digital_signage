---
name: Android TV WebView Player System - Complete Architecture Plan
overview: Build a complete Android TV WebView Player system with enhanced backend APIs, optimized web player, and Android TV app wrapper, integrating with existing admin portal.
todos:
  - id: "1"
    content: Create database migration to add player_id column to devices table
    status: completed
  - id: "2"
    content: Create database migration to add player_id to pairing_codes table
    status: completed
  - id: "3"
    content: Add device_token and token_expiry columns to devices table
    status: completed
    dependencies:
      - "1"
  - id: "4"
    content: Implement POST /device/init endpoint in device-service
    status: completed
    dependencies:
      - "1"
      - "3"
  - id: "5"
    content: Implement GET /device/config endpoint in device-service
    status: completed
    dependencies:
      - "1"
      - "3"
  - id: "6"
    content: Create device token authentication middleware
    status: completed
    dependencies:
      - "3"
  - id: "7"
    content: Update pairing/generate endpoint to accept player_id
    status: completed
    dependencies:
      - "2"
  - id: "8"
    content: Update pairing/claim endpoint to return player_id
    status: completed
    dependencies:
      - "1"
      - "2"
  - id: "9"
    content: Add rate limiting to device init endpoint
    status: completed
    dependencies:
      - "4"
  - id: "10"
    content: Route /api/device/* endpoints in API Gateway
    status: completed
    dependencies:
      - "4"
      - "5"
  - id: "11"
    content: Update DevicePlayer component to read player_id from URL query params
    status: completed
  - id: "12"
    content: Update DevicePlayer to call /device/init on mount
    status: completed
    dependencies:
      - "4"
      - "11"
  - id: "13"
    content: Update DevicePlayer to call /device/config when paired
    status: completed
    dependencies:
      - "5"
      - "12"
  - id: "14"
    content: Create offline caching utility with IndexedDB
    status: completed
  - id: "15"
    content: Integrate offline caching in DevicePlayer component
    status: completed
    dependencies:
      - "14"
  - id: "16"
    content: Add WebView detection and optimizations in DevicePlayer
    status: completed
    dependencies:
      - "11"
  - id: "17"
    content: Update frontend API client to skip auth for /device/* routes
    status: completed
  - id: "18"
    content: Create Android TV app project structure
    status: completed
  - id: "19"
    content: Implement PlayerIdManager.kt for UUID generation and storage
    status: completed
    dependencies:
      - "18"
  - id: "20"
    content: Implement MainActivity.kt with WebView setup
    status: completed
    dependencies:
      - "19"
  - id: "21"
    content: Implement BootReceiver.kt for auto-start on TV boot
    status: completed
    dependencies:
      - "18"
  - id: "22"
    content: Configure AndroidManifest.xml with permissions and receivers
    status: completed
    dependencies:
      - "20"
      - "21"
  - id: "23"
    content: Update admin portal Devices page to show player_id
    status: completed
    dependencies:
      - "1"
  - id: "24"
    content: Enhance pairing flow in Organization page to show player_id
    status: completed
    dependencies:
      - "8"
  - id: "25"
    content: "Test end-to-end flow: Android app → WebView → Backend → Content"
    status: pending
    dependencies:
      - "4"
      - "5"
      - "12"
      - "13"
      - "20"
---

# Android TV WebView Player System - Complete Architecture Plan

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Android TV App (Kotlin)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         WebView (Fullscreen, Auto-play)               │  │
│  │  Loads: https://frontend.../player?player_id=xxx      │  │
│  └───────────────────────────────────────────────────────┘  │
│  - Generates/Saves player_id (UUID)                         │
│  - Appends player_id to URL                                │
│  - Boot receiver for auto-start                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              Web Player (React/Vite Frontend)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         DevicePlayer Component                        │  │
│  │  - Reads player_id from URL                           │  │
│  │  - Calls /device/init?player_id=xxx                   │  │
│  │  - Shows pairing screen OR plays content               │  │
│  └───────────────────────────────────────────────────────┘  │
│  - Fullscreen playback                                      │
│  - Offline caching (IndexedDB)                              │
│  - Auto-refresh config                                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Node.js/Express)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Device Service                                        │  │
│  │  - /device/init (check pairing status)                │  │
│  │  - /device/generate-pairing                            │  │
│  │  - /device/config (get playlist)                      │  │
│  │  - /device/heartbeat                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Scheduling Service                                   │  │
│  │  - /player/:deviceId/content (existing, enhance)      │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              Admin Portal (React - Existing)                 │
│  - Device management                                         │
│  - Pair device via code                                      │
│  - Assign playlists                                          │
│  - Upload media                                              │
└─────────────────────────────────────────────────────────────┘
```

## Current State Analysis

### Existing Infrastructure

- ✅ PostgreSQL database with devices, playlists, schedules, media tables
- ✅ Pairing system (pairing_codes table)
- ✅ Device service with pairing endpoints
- ✅ Scheduling service with player content endpoint
- ✅ Web player (DevicePlayer component)
- ✅ Admin portal (React frontend)
- ⚠️ Android template files exist but incomplete

### Gaps to Address

- ❌ No `player_id` field in devices table (currently uses UUID `id`)
- ❌ No device initialization endpoint (`/device/init`)
- ❌ No device token authentication system
- ❌ Web player doesn't read player_id from URL query params
- ❌ Android TV app incomplete
- ❌ No offline caching in web player

## Phase 1: Database Schema Enhancements

### Migration: Add Player ID Support

**File: `database/migrations/add_player_id_support.sql`**

```sql
-- Add player_id column to devices table (for Android app)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS player_id VARCHAR(255) UNIQUE;

-- Add device_token for authentication
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS device_token VARCHAR(255);

-- Add token_expiry
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP WITH TIME ZONE;

-- Create index for fast player_id lookups
CREATE INDEX IF NOT EXISTS idx_devices_player_id ON devices(player_id);

-- Update existing devices to generate player_id from id
UPDATE devices 
SET player_id = id::text 
WHERE player_id IS NULL;
```

### Update Pairing Codes Table

**File: `database/migrations/enhance_pairing_codes.sql`**

```sql
-- Add player_id to pairing_codes for Android app flow
ALTER TABLE pairing_codes 
ADD COLUMN IF NOT EXISTS player_id VARCHAR(255);

-- Add index
CREATE INDEX IF NOT EXISTS idx_pairing_codes_player_id ON pairing_codes(player_id);
```

## Phase 2: Backend API Enhancements

### 2.1 Device Initialization Endpoint

**File: `services/device-service/src/index.js`**

**New Endpoint: `POST /device/init`**

```javascript
// Device initialization - called by Android app/WebView
app.post('/device/init', async (req, res) => {
  try {
    const { player_id } = req.body;
    
    // Validate player_id format (UUID or custom string)
    if (!player_id) {
      return res.status(400).json({ error: 'player_id is required' });
    }
    
    // Check if device exists and is paired
    const deviceResult = await pool.query(
      `SELECT d.*, 
              CASE 
                WHEN d.status = 'online' AND d.zone_id IS NOT NULL THEN 'ACTIVE'
                WHEN d.status = 'offline' AND d.zone_id IS NOT NULL THEN 'DISABLED'
                ELSE 'UNPAIRED'
              END as pairing_status
       FROM devices d
       WHERE d.player_id = $1 OR d.id::text = $1`,
      [player_id]
    );
    
    if (deviceResult.rows.length === 0) {
      // Device doesn't exist - return pairing required
      return res.json({
        status: 'UNPAIRED',
        pairing_required: true,
        message: 'Device not registered. Please pair device.'
      });
    }
    
    const device = deviceResult.rows[0];
    
    if (device.pairing_status === 'UNPAIRED') {
      // Device exists but not paired
      return res.json({
        status: 'UNPAIRED',
        pairing_required: true,
        device_id: device.id,
        player_id: device.player_id || device.id
      });
    }
    
    // Device is paired - return config
    // Get active schedule and playlist for this device
    const scheduleResult = await pool.query(
      `SELECT s.*, p.id as playlist_id, p.name as playlist_name
       FROM schedules s
       JOIN schedule_devices sd ON s.id = sd.schedule_id
       JOIN playlists p ON s.playlist_id = p.id
       WHERE sd.device_id = $1
       AND s.is_active = true
       ORDER BY s.priority DESC
       LIMIT 1`,
      [device.id]
    );
    
    const playlistId = scheduleResult.rows[0]?.playlist_id || null;
    
    // Generate or return device token
    let deviceToken = device.device_token;
    if (!deviceToken || (device.token_expiry && device.token_expiry < new Date())) {
      deviceToken = crypto.randomBytes(32).toString('hex');
      await pool.query(
        `UPDATE devices 
         SET device_token = $1, token_expiry = NOW() + INTERVAL '30 days'
         WHERE id = $2`,
        [deviceToken, device.id]
      );
    }
    
    res.json({
      status: 'ACTIVE',
      pairing_required: false,
      device_id: device.id,
      player_id: device.player_id || device.id,
      device_token: deviceToken,
      playlist_id: playlistId,
      config_url: `/device/config?player_id=${device.player_id || device.id}`
    });
  } catch (error) {
    console.error('Device init error:', error);
    res.status(500).json({ error: 'Failed to initialize device' });
  }
});
```

### 2.2 Device Config Endpoint

**File: `services/device-service/src/index.js`**

**New Endpoint: `GET /device/config`**

```javascript
// Get device configuration and playlist
app.get('/device/config', async (req, res) => {
  try {
    const { player_id } = req.query;
    const deviceToken = req.headers['x-device-token'];
    
    // Verify device exists
    const deviceResult = await pool.query(
      `SELECT * FROM devices 
       WHERE (player_id = $1 OR id::text = $1)`,
      [player_id]
    );
    
    if (deviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const device = deviceResult.rows[0];
    
    // Verify token if provided (optional for backward compatibility)
    if (deviceToken && device.device_token !== deviceToken) {
      return res.status(401).json({ error: 'Invalid device token' });
    }
    
    // Get active schedule and playlist
    const scheduleResult = await pool.query(
      `SELECT s.*, p.*
       FROM schedules s
       JOIN schedule_devices sd ON s.id = sd.schedule_id
       JOIN playlists p ON s.playlist_id = p.id
       WHERE sd.device_id = $1
       AND s.is_active = true
       ORDER BY s.priority DESC
       LIMIT 1`,
      [device.id]
    );
    
    if (scheduleResult.rows.length === 0) {
      return res.json({
        device_id: device.id,
        player_id: device.player_id || device.id,
        playlist: null,
        items: []
      });
    }
    
    const schedule = scheduleResult.rows[0];
    
    // Get playlist items (reuse existing scheduling service logic)
    // This will be proxied to scheduling service
    res.json({
      device_id: device.id,
      player_id: device.player_id || device.id,
      playlist: {
        id: schedule.playlist_id,
        name: schedule.playlist_name,
        transition_effect: schedule.transition_effect
      },
      config_refresh_interval: 60 // seconds
    });
  } catch (error) {
    console.error('Get device config error:', error);
    res.status(500).json({ error: 'Failed to get device config' });
  }
});
```

### 2.3 Enhanced Pairing Flow

**File: `services/device-service/src/index.js`**

**Update: `POST /pairing/generate`**

- Accept `player_id` in request body
- Store `player_id` in pairing_codes table
- Return pairing code

**Update: `POST /pairing/claim`**

- Return `deviceId` and `playerId` in response
- Set `player_id` on device if provided

### 2.4 Device Token Authentication Middleware

**File: `services/device-service/src/index.js`**

```javascript
// Optional device token authentication (for protected endpoints)
function authenticateDeviceToken(req, res, next) {
  const deviceToken = req.headers['x-device-token'];
  const playerId = req.query.player_id || req.body.player_id;
  
  if (!deviceToken || !playerId) {
    return res.status(401).json({ error: 'Device token and player_id required' });
  }
  
  pool.query(
    `SELECT * FROM devices 
     WHERE (player_id = $1 OR id::text = $1) 
     AND device_token = $2
     AND (token_expiry IS NULL OR token_expiry > NOW())`,
    [playerId, deviceToken]
  )
  .then(result => {
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid device token' });
    }
    req.device = result.rows[0];
    next();
  })
  .catch(err => {
    console.error('Device token auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  });
}
```

## Phase 3: Web Player Enhancements

### 3.1 Update DevicePlayer Component

**File: `frontend/src/pages/DevicePlayer.jsx`**

**Key Changes:**

1. Read `player_id` from URL query params: `?player_id=xxx`
2. Call `/device/init` on mount with `player_id`
3. Handle pairing flow if `pairing_required: true`
4. Fetch config from `/device/config` if paired
5. Add offline caching with IndexedDB
6. Optimize for WebView environment

**Implementation:**

```javascript
// Read player_id from URL
const searchParams = new URLSearchParams(window.location.search);
const playerId = searchParams.get('player_id') || useParams().deviceId;

// Initialize device
const { data: initData } = useQuery({
  queryKey: ['device-init', playerId],
  queryFn: async () => {
    const response = await api.post('/device/init', { player_id: playerId });
    return response.data;
  },
  enabled: !!playerId,
  retry: 3
});

// If pairing required, show pairing screen
if (initData?.pairing_required) {
  // Show pairing UI with code generation
}

// If active, fetch config
const { data: config } = useQuery({
  queryKey: ['device-config', playerId],
  queryFn: async () => {
    const response = await api.get('/device/config', {
      params: { player_id: playerId },
      headers: initData?.device_token ? {
        'x-device-token': initData.device_token
      } : {}
    });
    return response.data;
  },
  enabled: !!initData && !initData.pairing_required,
  refetchInterval: 60000 // Refresh every minute
});
```

### 3.2 Offline Caching

**File: `frontend/src/utils/offlineCache.js` (NEW)**

```javascript
// IndexedDB cache for playlist content
const DB_NAME = 'DigitalSignagePlayer';
const DB_VERSION = 1;
const STORE_NAME = 'playlists';

export async function cachePlaylist(playerId, playlistData) {
  // Store playlist in IndexedDB
}

export async function getCachedPlaylist(playerId) {
  // Retrieve cached playlist
}

export async function clearCache() {
  // Clear old cache
}
```

### 3.3 WebView Detection & Optimization

**File: `frontend/src/pages/DevicePlayer.jsx`**

```javascript
// Detect WebView
const isWebView = () => {
  const ua = navigator.userAgent;
  return /wv|WebView/i.test(ua) || window.Android !== undefined;
};

// Disable features that don't work in WebView
if (isWebView()) {
  // Disable popups, redirects
  // Optimize for fullscreen
  // Handle WebView lifecycle
}
```

## Phase 4: Android TV App Development

### 4.1 Project Structure

```
android-tv-app/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/digitalsignage/player/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   ├── PlayerWebView.kt
│   │   │   │   ├── BootReceiver.kt
│   │   │   │   └── PlayerIdManager.kt
│   │   │   ├── res/
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
├── build.gradle
└── settings.gradle
```

### 4.2 Player ID Manager

**File: `android-tv-app/app/src/main/java/.../PlayerIdManager.kt`**

```kotlin
class PlayerIdManager(private val context: Context) {
    private val prefs = context.getSharedPreferences("player_prefs", Context.MODE_PRIVATE)
    private val PLAYER_ID_KEY = "player_id"
    
    fun getOrCreatePlayerId(): String {
        var playerId = prefs.getString(PLAYER_ID_KEY, null)
        if (playerId == null) {
            playerId = UUID.randomUUID().toString()
            prefs.edit().putString(PLAYER_ID_KEY, playerId).apply()
        }
        return playerId
    }
    
    fun getPlayerId(): String? {
        return prefs.getString(PLAYER_ID_KEY, null)
    }
}
```

### 4.3 Main Activity

**File: `android-tv-app/app/src/main/java/.../MainActivity.kt`**

```kotlin
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private val playerIdManager = PlayerIdManager(this)
    private val PLAYER_URL = "https://frontend-production-73c0.up.railway.app/player"
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Get or create player ID
        val playerId = playerIdManager.getOrCreatePlayerId()
        
        // Setup WebView
        setupWebView()
        
        // Load player URL with player_id
        val url = "$PLAYER_URL?player_id=$playerId"
        webView.loadUrl(url)
        
        // Keep screen on
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
    
    private fun setupWebView() {
        webView = WebView(this)
        setContentView(webView)
        
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                // Don't navigate away from player
                return false
            }
            
            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                // Handle errors gracefully
                view?.loadUrl("javascript:console.error('Network error:', '${error?.description}')")
            }
        }
        
        // Handle JavaScript interface for Android callbacks
        webView.addJavascriptInterface(WebAppInterface(), "Android")
    }
}
```

### 4.4 Boot Receiver

**File: `android-tv-app/app/src/main/java/.../BootReceiver.kt`**

```kotlin
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val launchIntent = Intent(context, MainActivity::class.java)
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(launchIntent)
        }
    }
}
```

### 4.5 AndroidManifest.xml

```xml
<manifest>
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    
    <application>
        <activity
            android:name=".MainActivity"
            android:launchMode="singleTask"
            android:screenOrientation="landscape">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
        
        <receiver
            android:name=".BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>
    </application>
</manifest>
```

## Phase 5: API Gateway Updates

### 5.1 Route New Device Endpoints

**File: `services/api-gateway/src/index.js`**

```javascript
// Route device initialization endpoints
app.use('/api/device', createProxyMiddleware({
  ...proxyOptions,
  target: services.device,
  pathRewrite: { '^/api/device': '/device' }
}));
```

## Phase 6: Admin Portal Integration

### 6.1 Device Management Updates

**File: `frontend/src/pages/Devices.jsx`**

- Show `player_id` in device list
- Display pairing status
- Copy player_id for Android app configuration
- Show device token (for debugging)

### 6.2 Pairing Flow Enhancement

**File: `frontend/src/pages/Organization.jsx`**

- When claiming pairing code, show `player_id` in response
- Display player_id for Android app to use
- Add QR code generation for easy pairing

## Phase 7: Security & Performance

### 7.1 Rate Limiting

**File: `services/device-service/src/index.js`**

```javascript
const rateLimit = require('express-rate-limit');

const deviceInitLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many initialization requests'
});

app.post('/device/init', deviceInitLimiter, async (req, res) => {
  // ... implementation
});
```

### 7.2 CORS Configuration

**File: `services/api-gateway/src/index.js`**

- Ensure CORS allows WebView requests
- Add Android WebView user-agent to allowed origins

## Implementation Order

1. **Database Migrations** - Add player_id support
2. **Backend APIs** - Device init, config endpoints
3. **Web Player** - Read player_id from URL, call init API
4. **Android TV App** - Generate/save player_id, WebView setup
5. **Admin Portal** - Show player_id, enhance pairing
6. **Testing** - End-to-end testing
7. **Security** - Rate limiting, token validation
8. **Documentation** - Android app integration guide

## Testing Checklist

- [ ] Android app generates and saves player_id
- [ ] Android app loads WebView with player_id in URL
- [ ] Web player reads player_id from URL
- [ ] Device init API returns correct status
- [ ] Pairing flow works end-to-end
- [ ] Config API returns playlist data
- [ ] Content plays in WebView
- [ ] Offline caching works
- [ ] Boot receiver launches app on TV startup
- [ ] Admin portal shows player_id
- [ ] Device token authentication works
- [ ] Rate limiting prevents abuse

## Files to Create/Modify

### New Files

1. `database/migrations/add_player_id_support.sql`
2. `services/device-service/src/routes/deviceInit.js` (optional - can add to index.js)
3. `frontend/src/utils/offlineCache.js`
4. `android-tv-app/` (entire Android project)
5. `docs/ANDROID_TV_INTEGRATION.md`

### Modified Files

1. `services/device-service/src/index.js` - Add init/config endpoints
2. `frontend/src/pages/DevicePlayer.jsx` - Read player_id, call init API
3. `frontend/src/lib/api.js` - Skip auth for device endpoints
4. `services/api-gateway/src/index.js` - Route device endpoints
5. `frontend/src/pages/Devices.