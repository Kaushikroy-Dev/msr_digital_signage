# Digital Signage Android TV App

Android TV application for displaying digital signage content via WebView.

## Features

- **Auto-start on boot**: Automatically launches when the device boots
- **Player ID management**: Generates and stores a unique player ID
- **WebView integration**: Loads the web player with player_id in URL
- **Kiosk mode**: Fullscreen, no navigation, prevents app exit
- **Offline support**: WebView caches content for offline playback

## Setup

1. **Update Player URL**: Edit `MainActivity.kt` and update `PLAYER_URL` to match your frontend URL:
   ```kotlin
   private val PLAYER_URL = "https://your-frontend-url.com/player"
   ```

2. **Build the app**:
   ```bash
   ./gradlew assembleRelease
   ```

3. **Install on Android TV device**:
   ```bash
   adb install app/build/outputs/apk/release/app-release.apk
   ```

4. **Set as launcher (optional)**: Use Android TV launcher settings to set this app as the default launcher for kiosk mode.

## Configuration

- **Player ID**: Automatically generated on first launch and stored in SharedPreferences
- **Auto-start**: Enabled via BootReceiver - requires `RECEIVE_BOOT_COMPLETED` permission
- **Screen orientation**: Locked to landscape mode
- **Fullscreen**: System UI is hidden for immersive experience

## Testing

1. **Local testing**: Update `PLAYER_URL` to `http://192.168.x.x:5173/player` for local development
2. **Player ID**: Check logs with `adb logcat | grep PlayerIdManager` to see generated player ID
3. **WebView debugging**: Enable remote debugging in Chrome DevTools (requires Chrome 33+)

## Troubleshooting

- **App doesn't auto-start**: Check if `RECEIVE_BOOT_COMPLETED` permission is granted
- **WebView not loading**: Check internet connection and verify `PLAYER_URL` is correct
- **Content not playing**: Verify device is paired in admin portal using the player ID

## Requirements

- Android 7.0 (API 24) or higher
- Internet connection for initial content load
- Android TV device or Android device with TV launcher
