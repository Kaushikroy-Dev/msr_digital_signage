# Android Setup Guide

This guide explains how to set up and build the Digital Signage Player as a native Android app.

## Prerequisites

1. **Node.js** - Version 18 or higher
2. **Java JDK** - Version 17 or higher
3. **Android Studio** - Latest version
4. **Android SDK** - API 24 (Android 7.0) or higher
5. **Capacitor** - Installed via npm

## Installation Steps

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This installs Capacitor and all required dependencies.

### 2. Initialize Capacitor (First Time Only)

```bash
npm run capacitor:init
```

This creates the `capacitor.config.json` file (already created in this project).

### 3. Add Android Platform

```bash
npm run capacitor:add:android
```

This creates the `android/` directory with the native Android project.

### 4. Configure Android Project

The Android project is pre-configured with:
- Minimum SDK: 24 (Android 7.0)
- Target SDK: 34 (Latest)
- Kiosk mode support
- Auto-start on boot
- Required permissions

### 5. Customize Android Project (Optional)

If you need to customize the Android project, copy files from `frontend/android-template/`:

- **AndroidManifest.xml** - App permissions and configuration
- **MainActivity.java** - Main activity with kiosk mode
- **BootReceiver.java** - Auto-start on boot
- **build.gradle** - Build configuration

### 6. Build React App

```bash
npm run build
```

This builds the React app for production.

### 7. Sync Capacitor

```bash
npm run capacitor:sync
```

This copies the built web assets to the Android project.

### 8. Build Android APK

#### Option A: Using Gradle (Command Line)

```bash
npm run build:android:apk
```

This builds a release APK at:
`android/app/build/outputs/apk/release/app-release.apk`

#### Option B: Using Android Studio

1. Open Android Studio
2. Open the `android/` directory
3. Build > Build Bundle(s) / APK(s) > Build APK(s)
4. APK will be generated in `app/build/outputs/apk/`

### 9. Sign APK (For Production)

1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore digital-signage.keystore -alias digital-signage -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configure signing in `android/app/build.gradle`:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('digital-signage.keystore')
               storePassword 'your-password'
               keyAlias 'digital-signage'
               keyPassword 'your-password'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
           }
       }
   }
   ```

3. Build signed APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## Kiosk Mode Configuration

### Device Owner Mode (Recommended)

For true kiosk mode, the app must be set as device owner:

1. **Enable Developer Options** on Android device
2. **Enable USB Debugging**
3. **Connect device** via USB
4. **Set device owner:**
   ```bash
   adb shell dpm set-device-owner com.digitalsignage.player/.DeviceAdminReceiver
   ```

**Note:** Device owner mode can only be set on a factory reset device or via ADB before first setup.

### Alternative: Kiosk App

Use a kiosk management solution:
- **SureLock** - Enterprise kiosk solution
- **Scalefusion** - MDM with kiosk mode
- **Hexnode** - Mobile device management

## Auto-Start on Boot

The app includes a `BootReceiver` that automatically launches the app on device boot.

**Requirements:**
- App must be set as device owner, OR
- Boot receiver must be manually enabled in device settings

## Permissions

The app requires the following permissions (configured in AndroidManifest.xml):

- **INTERNET** - Network connectivity
- **ACCESS_NETWORK_STATE** - Check network status
- **WAKE_LOCK** - Keep screen on
- **RECEIVE_BOOT_COMPLETED** - Auto-start on boot
- **SYSTEM_ALERT_WINDOW** - Display over other apps (if needed)

## Testing

### On Physical Device

1. Enable USB debugging on device
2. Connect device via USB
3. Run:
   ```bash
   npm run capacitor:open:android
   ```
4. Click "Run" in Android Studio

### On Emulator

1. Create Android Virtual Device (AVD) in Android Studio
2. Minimum requirements:
   - API Level: 24 (Android 7.0)
   - RAM: 2GB
   - Storage: 2GB
3. Run app on emulator

## Troubleshooting

### Build Errors

**Error: "SDK location not found"**
- Set `ANDROID_HOME` environment variable
- Or configure in `local.properties`:
  ```properties
  sdk.dir=/path/to/android/sdk
  ```

**Error: "Gradle sync failed"**
- Update Android Studio
- Sync Gradle files: File > Sync Project with Gradle Files
- Clean project: Build > Clean Project

### Runtime Issues

**App won't start in kiosk mode:**
- Verify device owner mode is set
- Check MainActivity.java configuration
- Review device logs: `adb logcat`

**Auto-start not working:**
- Verify BootReceiver is registered
- Check device boot receiver settings
- Review device logs

**Network connectivity issues:**
- Verify INTERNET permission is granted
- Check network configuration
- Test API endpoint accessibility

## Deployment

### Internal Distribution

1. Build release APK
2. Sign APK (if needed)
3. Distribute via:
   - Email
   - Internal file server
   - MDM solution

### Google Play Store

1. Create Google Play Developer account
2. Prepare store listing
3. Build App Bundle (AAB):
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
4. Upload to Play Console
5. Submit for review

### Enterprise Distribution

Use Android Enterprise for bulk deployment:
1. Enroll devices in Android Enterprise
2. Configure app as managed app
3. Push app via MDM solution

## Configuration

### API Endpoint

Configure API endpoint in `capacitor.config.json`:

```json
{
    "server": {
        "url": "https://api.digitalsignage.com"
    }
}
```

Or use environment variables in production builds.

### App Settings

Edit `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">Digital Signage Player</string>
</resources>
```

## Updates

### Manual Updates

1. Build new APK
2. Distribute to devices
3. Install on devices

### Automatic Updates

Configure via:
- Google Play Store (if published)
- MDM solution
- Custom update mechanism

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [Android Enterprise](https://www.android.com/enterprise/)

## Support

For Android-specific issues:
- Check Android logs: `adb logcat`
- Review Capacitor documentation
- Test on multiple devices
- Contact support with device details
