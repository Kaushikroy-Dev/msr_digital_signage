# Tizen (Samsung Smart TV) Setup Guide

This guide explains how to build, deploy, and test the Digital Signage Player on Samsung Tizen Smart TVs.

## Prerequisites

1. **Tizen Studio** - Download and install from [Tizen Developer Portal](https://developer.tizen.org/development/tizen-studio)
2. **Samsung TV** - Tizen TV with SSSP 6.0 or higher
3. **Developer Mode** - Enable developer mode on your Samsung TV
4. **Certificate** - Create a certificate profile for app signing

## Installation Steps

### 1. Install Tizen Studio

1. Download Tizen Studio from the official website
2. Install Tizen Studio with TV Extensions
3. Launch Tizen Studio and install required packages

### 2. Enable Developer Mode on TV

1. On your Samsung TV, go to **Settings** > **General** > **External Device Manager** > **Device Connection Manager**
2. Enable **Developer Mode**
3. Note the IP address displayed on screen

### 3. Create Certificate Profile

1. Open Tizen Studio
2. Go to **Tools** > **Certificate Manager**
3. Click **+** to create a new certificate profile
4. Select **Tizen** > **TV** > **Next**
5. Create or select an author certificate
6. Create or select a distributor certificate
7. Save the certificate profile (e.g., "default")

### 4. Build the Tizen Web App

```bash
cd frontend
npm run build:tizen
```

This will:
- Build the React app for production
- Copy Tizen configuration files
- Create a `.wgt` package file

**Output:** `frontend/dist/tizen/digital-signage.wgt`

### 5. Deploy to TV

#### Option A: Using Tizen Studio

1. Open Tizen Studio
2. Go to **Tools** > **Device Manager**
3. Click **Remote Device Manager**
4. Add your TV by IP address
5. Connect to the TV
6. Go to **File** > **Open File to Install**
7. Select `digital-signage.wgt`
8. Click **Install**

#### Option B: Using Tizen CLI

```bash
# Connect to TV
tizen connect <TV_IP_ADDRESS>

# Install the app
tizen install -n digital-signage.wgt -t <DEVICE_ID>
```

### 6. Launch the App

1. On your TV, go to **Apps** > **My Apps**
2. Find **Digital Signage Player**
3. Launch the app

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
   - Verify app doesn't exit on back button

### Debugging

1. **Enable Remote Debugging:**
   - In Tizen Studio, go to **Tools** > **Web Inspector**
   - Connect to your TV
   - Open developer tools

2. **View Logs:**
   ```bash
   sdb logcat | grep "DigitalSignage"
   ```

## Troubleshooting

### App Won't Install

- **Check TV Developer Mode:** Ensure developer mode is enabled
- **Check Certificate:** Verify certificate profile is correct
- **Check TV Model:** Ensure TV supports SSSP 6.0+

### App Crashes on Launch

- **Check Logs:** Use `sdb logcat` to view error logs
- **Check Permissions:** Verify all required privileges in `config.xml`
- **Check Network:** Ensure TV can reach the API server

### Content Not Loading

- **Check Network:** Verify TV has internet connection
- **Check API URL:** Verify API endpoint is accessible from TV
- **Check CORS:** Ensure CORS is configured for TV's IP

## Configuration

### config.xml Settings

Key settings in `frontend/tizen/config.xml`:

- **App ID:** Unique identifier for your app
- **Version:** App version number
- **Privileges:** Required TV permissions
- **Screen Orientation:** Landscape (required for TV)

### Environment Variables

Create `frontend/.env.production.tizen`:

```env
VITE_API_URL=https://your-api-domain.com
VITE_WS_URL=wss://your-api-domain.com
```

## App Signing

For production deployment:

1. Create a distributor certificate
2. Sign the app with the certificate
3. Submit to Samsung App Store (if applicable)

## Resources

- [Tizen Developer Documentation](https://developer.tizen.org/development)
- [Tizen TV API Reference](https://developer.tizen.org/development/api-references/native-application)
- [Samsung Developer Forum](https://developer.samsung.com/forum)

## Support

For issues specific to Tizen deployment, check:
- Tizen Studio logs
- TV system logs
- Network connectivity
- Certificate validity
