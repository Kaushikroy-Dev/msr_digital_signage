# Deployment Guide

This guide provides deployment instructions for the Digital Signage Player on all supported platforms.

## Overview

The Digital Signage Player can be deployed on:
- Windows (10/11/IoT)
- Linux (Ubuntu/Debian)
- Android (7.0+)
- Tizen (Samsung Smart TV)
- WebOS (LG Smart TV)
- BrightSign (Series 4+)

## Pre-Deployment Checklist

- [ ] API server is running and accessible
- [ ] API endpoints are configured correctly
- [ ] CORS is configured to allow device origins
- [ ] SSL certificates are valid (for HTTPS)
- [ ] Network connectivity is available
- [ ] Device has sufficient storage
- [ ] Device meets minimum requirements

## Windows Deployment

### Requirements
- Windows 10/11 or Windows IoT
- Administrator privileges (for installation)
- Network connectivity

### Installation Methods

#### Method 1: Installer (.exe)

1. Download the Windows installer from releases
2. Run the installer as Administrator
3. Follow the installation wizard
4. App will launch automatically after installation
5. Configure auto-start (enabled by default)

#### Method 2: Portable Version

1. Extract the portable package
2. Run `DigitalSignagePlayer.exe`
3. App will launch in kiosk mode

### Configuration

1. **Network Settings:**
   - Ensure device can reach API server
   - Configure firewall if needed
   - Test connectivity: `ping api.digitalsignage.com`

2. **Auto-Start:**
   - App auto-starts on boot by default
   - To disable: Remove from startup programs

3. **Kiosk Mode:**
   - App runs in kiosk mode by default
   - To exit: Press Ctrl+Alt+Del (if enabled)

### Updates

- App checks for updates on startup
- Updates are downloaded and installed automatically
- App restarts after update

## Linux Deployment

### Requirements
- Ubuntu 18.04+ or Debian 10+
- Network connectivity
- sudo privileges (for .deb/.rpm installation)

### Installation Methods

#### Method 1: AppImage (Recommended)

1. Download the AppImage file
2. Make it executable:
   ```bash
   chmod +x DigitalSignagePlayer.AppImage
   ```
3. Run the AppImage:
   ```bash
   ./DigitalSignagePlayer.AppImage
   ```

#### Method 2: .deb Package (Debian/Ubuntu)

1. Download the .deb package
2. Install using dpkg:
   ```bash
   sudo dpkg -i digital-signage-player.deb
   sudo apt-get install -f  # Fix dependencies if needed
   ```
3. Launch the app:
   ```bash
   digital-signage-player
   ```

#### Method 3: .rpm Package (Red Hat/CentOS)

1. Download the .rpm package
2. Install using rpm:
   ```bash
   sudo rpm -i digital-signage-player.rpm
   ```
3. Launch the app

### Configuration

1. **Auto-Start:**
   - Create systemd service (optional)
   - Or add to autostart applications

2. **Kiosk Mode:**
   - App runs in kiosk mode by default
   - Configure display settings if needed

### Updates

- Manual updates: Download new version and install
- Automatic updates: Configure update server (if available)

## Android Deployment

### Requirements
- Android 7.0+ device
- Network connectivity
- Unknown sources enabled (for APK installation)

### Installation Methods

#### Method 1: APK Installation

1. Download the APK file
2. Enable "Install from unknown sources" in device settings
3. Install the APK:
   ```bash
   adb install digital-signage-player.apk
   ```
   Or transfer to device and install manually

4. Launch the app

#### Method 2: Google Play Store (if published)

1. Search for "Digital Signage Player"
2. Install from Play Store
3. Launch the app

### Configuration

1. **Kiosk Mode:**
   - Requires device owner mode or kiosk app configuration
   - Set app as device owner:
     ```bash
     adb shell dpm set-device-owner com.digitalsignage.player/.DeviceAdminReceiver
     ```
   - Or use a kiosk management solution

2. **Auto-Start:**
   - App auto-starts on boot
   - Configure in device settings if needed

3. **Permissions:**
   - Grant all required permissions
   - Disable battery optimization

### Updates

- Manual: Install new APK
- Automatic: Configure via Play Store or MDM solution

## Tizen (Samsung Smart TV) Deployment

### Requirements
- Samsung Smart TV with Tizen OS
- Tizen Studio installed
- TV connected to network
- Developer mode enabled on TV

### Installation Steps

1. **Enable Developer Mode:**
   - Go to TV Settings > General > External Device Manager > Device Connection Manager
   - Enable "Developer Mode"
   - Note the IP address

2. **Build Tizen App:**
   ```bash
   cd frontend
   npm run build:tizen
   ```

3. **Deploy to TV:**
   - Open Tizen Studio
   - Connect to TV (enter TV IP address)
   - Install certificate if prompted
   - Deploy the .wgt file to TV

4. **Launch App:**
   - App appears in TV app list
   - Launch from app list

### Configuration

1. **Network:**
   - Ensure TV can reach API server
   - Configure firewall if needed

2. **Permissions:**
   - Grant network permissions
   - Grant display permissions

### Updates

- Rebuild and redeploy app
- Or configure OTA updates (if implemented)

## WebOS (LG Smart TV) Deployment

### Requirements
- LG Smart TV with WebOS 4.0+
- webOS CLI installed
- TV connected to network
- Developer mode enabled on TV

### Installation Steps

1. **Enable Developer Mode:**
   - Go to TV Settings > General > About This TV
   - Click "LG Content Store" 10 times
   - Developer mode enabled

2. **Build WebOS App:**
   ```bash
   cd frontend
   npm run build:webos
   ```

3. **Deploy to TV:**
   ```bash
   ares-install -d <TV_IP> digital-signage.ipk
   ```

4. **Launch App:**
   - App appears in TV app list
   - Launch from app list

### Configuration

1. **Network:**
   - Ensure TV can reach API server
   - Configure firewall if needed

2. **Permissions:**
   - Grant network permissions
   - Grant display permissions

### Updates

- Rebuild and redeploy app
- Or configure OTA updates (if implemented)

## BrightSign Deployment

### Requirements
- BrightSign Series 4+ device
- BrightSign Presentation Manager
- Device connected to network
- USB drive or SD card (optional)

### Installation Steps

1. **Build BrightSign Player:**
   ```bash
   cd frontend
   npm run build:brightsign
   ```

2. **Deploy to Device:**

   **Option A: USB/SD Card**
   - Format USB drive or SD card as FAT32
   - Copy files from `dist/brightsign/` to root of drive
   - Insert drive into BrightSign device
   - Device will auto-detect and launch

   **Option B: Network Deployment**
   - Access device via BrightSign Presentation Manager
   - Upload files via FTP or web interface
   - Set `index.html` as startup presentation

   **Option C: BrightAuthor**
   - Open BrightAuthor
   - Create new presentation
   - Add HTML5 widget
   - Point to `index.html` file
   - Publish to device

3. **Configure Network:**
   - Edit `bsconfig.json` on device
   - Or configure via Presentation Manager
   - Set API endpoint URL

### Configuration

1. **Network Settings:**
   - Configure DHCP or static IP
   - Set gateway and DNS
   - Test connectivity to API server

2. **Player Settings:**
   - Configure refresh interval
   - Set cache settings
   - Configure logging

### Updates

- Copy new files to device
- Or configure network sync (if implemented)

## Enterprise Deployment

### MDM Solutions

For enterprise deployments, use MDM solutions:

- **Windows:** Microsoft Intune, SCCM
- **Linux:** Ansible, Puppet, Chef
- **Android:** Android Enterprise, Samsung Knox
- **TV Platforms:** Custom deployment scripts

### Bulk Deployment

1. **Prepare Devices:**
   - Configure network settings
   - Install base app
   - Configure kiosk mode

2. **Deploy Configuration:**
   - Push configuration files
   - Set API endpoints
   - Configure auto-start

3. **Monitor:**
   - Monitor device status
   - Check connectivity
   - Verify content playback

## Troubleshooting

### Common Issues

1. **App Won't Start:**
   - Check network connectivity
   - Verify API endpoint is accessible
   - Check logs for errors

2. **Content Not Loading:**
   - Verify device is paired
   - Check schedule is assigned
   - Verify content exists

3. **Network Issues:**
   - Check firewall settings
   - Verify DNS resolution
   - Test API endpoint connectivity

4. **Kiosk Mode Not Working:**
   - Verify platform-specific requirements
   - Check permissions
   - Review configuration

### Getting Help

- Check platform-specific documentation
- Review logs
- Contact support with:
  - Platform and version
  - Device information
  - Error messages
  - Steps to reproduce

## Security Considerations

1. **Network Security:**
   - Use HTTPS for API communication
   - Verify SSL certificates
   - Use VPN if needed

2. **Device Security:**
   - Enable device encryption
   - Use strong passwords
   - Keep software updated

3. **App Security:**
   - Verify app signatures
   - Use secure storage for credentials
   - Implement secure pairing

## Maintenance

### Regular Tasks

1. **Monitor Devices:**
   - Check device status regularly
   - Review logs
   - Verify content playback

2. **Update Software:**
   - Keep app updated
   - Update device firmware
   - Apply security patches

3. **Backup Configuration:**
   - Backup device configurations
   - Document network settings
   - Keep deployment records
