# WebOS (LG Smart TV) Setup Guide

This guide explains how to build, deploy, and test the Digital Signage Player on LG WebOS Smart TVs.

## Prerequisites

1. **webOS CLI** - Install webOS CLI tools
2. **LG TV** - WebOS 4.0 or higher
3. **Developer Mode** - Enable developer mode on your LG TV
4. **TV Connection** - TV and development machine on same network

## Installation Steps

### 1. Install webOS CLI

#### macOS:
```bash
brew install webos-cli
```

#### Linux:
```bash
# Download from webOS OSE repository
# Or use npm
npm install -g @webosose/cli
```

#### Windows:
Download from [webOS OSE website](https://www.webosose.org/docs/tools/sdk/cli/installing-cli/)

### 2. Enable Developer Mode on TV

1. On your LG TV, go to **Settings** > **General** > **About This TV**
2. Click on **TV Information** multiple times (usually 5-7 times)
3. Developer Mode will be enabled
4. Go to **Settings** > **General** > **Developer Mode**
5. Enable **Developer Mode** toggle
6. Note the IP address displayed

### 3. Connect to TV

```bash
# Connect to your TV
ares-setup-device -a <TV_IP_ADDRESS>
```

Follow the prompts to:
- Enter a device name
- Enter TV's IP address
- Accept the connection on TV screen

### 4. Build the WebOS App

```bash
cd frontend
npm run build:webos
```

This will:
- Build the React app for production
- Copy WebOS configuration files
- Create an `.ipk` package file

**Output:** `frontend/dist/webos/digital-signage.ipk`

### 5. Deploy to TV

#### Option A: Using webOS CLI

```bash
cd frontend/dist/webos
ares-install digital-signage.ipk -d <DEVICE_NAME>
```

#### Option B: Using webOS CLI (alternative)

```bash
ares-install digital-signage.ipk -d <TV_IP_ADDRESS>
```

### 6. Launch the App

```bash
ares-launch com.digitalsignage.player -d <DEVICE_NAME>
```

Or manually:
1. On your TV, press **Home** button
2. Go to **My Apps**
3. Find **Digital Signage Player**
4. Launch the app

## Testing

### Manual Testing

1. **Pairing Test:**
   - Launch the app
   - Note the pairing code displayed
   - Pair from the portal

2. **Content Playback:**
   - Verify content loads and plays
   - Check transitions work correctly
   - Verify full-screen display

3. **Remote Control:**
   - Test play/pause functionality
   - Verify back button doesn't exit app

### Debugging

1. **Enable Remote Debugging:**
   ```bash
   ares-inspect com.digitalsignage.player -d <DEVICE_NAME>
   ```

2. **View Logs:**
   ```bash
   ares-log -d <DEVICE_NAME>
   ```

3. **Inspect App:**
   ```bash
   ares-inspect com.digitalsignage.player -d <DEVICE_NAME>
   ```
   This opens Chrome DevTools connected to the TV app.

## Troubleshooting

### App Won't Install

- **Check Developer Mode:** Ensure developer mode is enabled on TV
- **Check Connection:** Verify TV and computer are on same network
- **Check TV Model:** Ensure TV supports WebOS 4.0+

### App Crashes on Launch

- **Check Logs:** Use `ares-log` to view error logs
- **Check Permissions:** Verify appinfo.json configuration
- **Check Network:** Ensure TV can reach the API server

### Content Not Loading

- **Check Network:** Verify TV has internet connection
- **Check API URL:** Verify API endpoint is accessible from TV
- **Check CORS:** Ensure CORS is configured for TV's IP

## Configuration

### appinfo.json Settings

Key settings in `frontend/webos/appinfo.json`:

- **id:** Unique app identifier (com.digitalsignage.player)
- **version:** App version number
- **type:** "web" for web-based app
- **main:** Entry point (index.html)
- **title:** App display name
- **disableBackHistoryAPI:** Set to true for kiosk mode

### Environment Variables

Create `frontend/.env.production.webos`:

```env
VITE_API_URL=https://your-api-domain.com
VITE_WS_URL=wss://your-api-domain.com
```

## App Signing

For production deployment:

1. Create a developer certificate
2. Sign the app with the certificate
3. Submit to LG Content Store (if applicable)

## Useful Commands

```bash
# List connected devices
ares-setup-device -l

# Install app
ares-install <app.ipk> -d <device>

# Launch app
ares-launch <app-id> -d <device>

# View logs
ares-log -d <device>

# Inspect app (opens DevTools)
ares-inspect <app-id> -d <device>

# Package app
ares-package <app-directory>
```

## Resources

- [webOS Developer Documentation](https://www.webosose.org/docs/)
- [webOS TV API Reference](https://webostv.developer.lge.com/api/web-api/)
- [LG Developer Forum](https://developer.lge.com/forum/)

## Support

For issues specific to WebOS deployment, check:
- webOS CLI logs
- TV system logs
- Network connectivity
- App permissions
