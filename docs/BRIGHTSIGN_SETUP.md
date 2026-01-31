# BrightSign Setup Guide

This guide explains how to deploy and configure the Digital Signage Player on BrightSign Series 4+ devices.

## Prerequisites

1. **BrightSign Device** - Series 4 or higher (HD, XD, XT, XT4, etc.)
2. **BrightSign Presentation Manager** - For device configuration
3. **Network Access** - Device must be able to reach the API server
4. **USB Drive or SD Card** - For content deployment (optional, can use network)

## Installation Steps

### 1. Build the BrightSign Player

```bash
cd frontend
npm run build:brightsign
```

This creates:
- `frontend/dist/brightsign/index.html` - Main player
- `frontend/dist/brightsign/bsconfig.json` - Configuration
- `frontend/dist/brightsign/player.zip` - Deployment package

### 2. Configure API Endpoints

Create `frontend/.env.production.brightsign`:

```env
VITE_API_URL=https://your-api-domain.com/api
VITE_WS_URL=wss://your-api-domain.com/ws
```

Rebuild after configuring:
```bash
npm run build:brightsign
```

### 3. Deploy to BrightSign Device

#### Option A: USB/SD Card Deployment

1. Format USB drive or SD card as FAT32
2. Copy all files from `frontend/dist/brightsign/` to the root of the drive
3. Insert drive into BrightSign device
4. Device will auto-detect and launch the player

#### Option B: Network Deployment

1. Connect BrightSign device to network
2. Access device via BrightSign Presentation Manager
3. Upload files via FTP or web interface
4. Set `index.html` as the startup presentation

#### Option C: BrightAuthor

1. Open BrightAuthor
2. Create new presentation
3. Add HTML5 widget
4. Point to `index.html` file
5. Publish to device

### 4. Configure BrightSign Device

#### Network Configuration

Edit `bsconfig.json` on the device or configure via Presentation Manager:

```json
{
    "device": {
        "network": {
            "dhcp": true,
            "staticIP": "192.168.1.100",
            "gateway": "192.168.1.1",
            "dns": "8.8.8.8"
        }
    }
}
```

#### Player Configuration

```json
{
    "player": {
        "autoStart": true,
        "fullScreen": true,
        "kioskMode": true,
        "refreshInterval": 60000,
        "apiEndpoint": "https://your-api-domain.com/api"
    }
}
```

### 5. Device Pairing

1. Launch the player on BrightSign device
2. Note the pairing code displayed on screen
3. In the portal, go to Organization > Area
4. Add device and enter the pairing code
5. Device will connect and start receiving content

## Configuration

### bsconfig.json Settings

**Device Settings:**
- `model`: BrightSign device model
- `firmware`: Minimum firmware version
- `network`: Network configuration (DHCP or static)

**Player Settings:**
- `autoStart`: Auto-launch player on boot
- `fullScreen`: Full-screen mode
- `kioskMode`: Prevent user interaction
- `refreshInterval`: Content refresh interval (ms)
- `apiEndpoint`: API server URL

**Content Settings:**
- `syncInterval`: Content sync interval (ms)
- `cacheEnabled`: Enable content caching
- `maxCacheSize`: Maximum cache size (bytes)

## Testing

### Manual Testing

1. **Pairing Test:**
   - Launch player on device
   - Verify pairing code displays
   - Pair from portal
   - Verify device appears online

2. **Content Playback:**
   - Create schedule with content
   - Assign to device
   - Verify content plays on device
   - Check transitions work

3. **Network Test:**
   - Verify device can reach API
   - Check WebSocket connection
   - Verify heartbeat reporting

### Debugging

1. **View Device Logs:**
   - Access device via Presentation Manager
   - View system logs
   - Check network connectivity

2. **Remote Debugging:**
   - Enable remote debugging in bsconfig.json
   - Access device IP in browser
   - Use browser DevTools

3. **Network Diagnostics:**
   ```bash
   # Ping device
   ping <device-ip>
   
   # Test API connectivity
   curl http://<device-ip>/api/health
   ```

## Troubleshooting

### Player Won't Start

- **Check File Location:** Ensure index.html is in root directory
- **Check File Permissions:** Ensure files are readable
- **Check BrightSign Firmware:** Update to latest firmware
- **Check Presentation Settings:** Verify HTML5 widget is configured

### Content Not Loading

- **Check Network:** Verify device has internet connection
- **Check API URL:** Verify API endpoint is correct and accessible
- **Check CORS:** Ensure CORS allows BrightSign device IP
- **Check Firewall:** Ensure firewall allows outbound connections

### Pairing Fails

- **Check Network:** Verify device can reach API server
- **Check Code:** Verify pairing code is correct
- **Check Expiration:** Pairing codes expire after 24 hours
- **Check Device Status:** Verify device is online

## BrightSign-Specific Features

### Auto-Start on Boot

Configure in BrightSign Presentation Manager:
1. Go to **Settings** > **Startup**
2. Set **Auto-start Presentation** to enabled
3. Select the player presentation

### Kiosk Mode

The player runs in kiosk mode by default:
- Full-screen display
- No user controls
- Auto-play content
- Prevent exit

### Network Configuration

BrightSign devices support:
- DHCP (automatic)
- Static IP
- WiFi (if supported)
- Ethernet

Configure via Presentation Manager or bsconfig.json.

## Resources

- [BrightSign Developer Documentation](https://brightsign.biz/support/)
- [BrightSign HTML5 Guide](https://brightsign.biz/support/html5/)
- [BrightSign Network Setup](https://brightsign.biz/support/network/)

## Support

For BrightSign-specific issues:
- Check BrightSign system logs
- Verify network connectivity
- Test API endpoint accessibility
- Review bsconfig.json configuration
