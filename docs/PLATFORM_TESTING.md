# Platform Testing Guide

This guide provides testing procedures for each supported platform in the Digital Signage Player.

## Testing Overview

### Test Categories

1. **Functional Testing** - Core functionality works on each platform
2. **Performance Testing** - App performance and resource usage
3. **Compatibility Testing** - Platform-specific features and limitations
4. **Network Testing** - Connectivity and content sync
5. **Kiosk Mode Testing** - Lockdown and security features

## Platform-Specific Testing

### Windows (Electron)

#### Prerequisites
- Windows 10/11 or Windows IoT
- Electron app installed
- Network connectivity

#### Test Cases

1. **Installation**
   - [ ] Installer runs successfully
   - [ ] App launches automatically after installation
   - [ ] App appears in Start Menu
   - [ ] Auto-start on boot works

2. **Kiosk Mode**
   - [ ] App runs in fullscreen
   - [ ] Alt+F4 does not close app
   - [ ] Ctrl+Alt+Del does not allow task switching
   - [ ] Windows key is disabled
   - [ ] Right-click context menu is disabled

3. **Functionality**
   - [ ] Device pairing works
   - [ ] Content loads and plays
   - [ ] Transitions work smoothly
   - [ ] WebSocket connection stable
   - [ ] Heartbeat reporting works

4. **Performance**
   - [ ] Memory usage < 500MB
   - [ ] CPU usage < 20% idle
   - [ ] Smooth video playback (60fps)
   - [ ] No memory leaks after 24h

#### Test Results Template

```
Platform: Windows
Version: 10/11/IoT
Date: YYYY-MM-DD
Tester: Name

Installation: ✅/❌
Kiosk Mode: ✅/❌
Functionality: ✅/❌
Performance: ✅/❌
Notes: [Any issues or observations]
```

### Linux (Electron)

#### Prerequisites
- Ubuntu/Debian Linux
- Electron app installed
- Network connectivity

#### Test Cases

1. **Installation**
   - [ ] AppImage runs without installation
   - [ ] .deb package installs correctly
   - [ ] .rpm package installs correctly (if applicable)
   - [ ] App launches automatically

2. **Kiosk Mode**
   - [ ] App runs in fullscreen
   - [ ] Window cannot be closed
   - [ ] System shortcuts disabled
   - [ ] Auto-restart on crash works

3. **Functionality**
   - [ ] Device pairing works
   - [ ] Content loads and plays
   - [ ] Network connectivity stable
   - [ ] Auto-update works (if configured)

#### Test Results Template

```
Platform: Linux
Distribution: Ubuntu/Debian
Date: YYYY-MM-DD
Tester: Name

Installation: ✅/❌
Kiosk Mode: ✅/❌
Functionality: ✅/❌
Performance: ✅/❌
Notes: [Any issues or observations]
```

### Android

#### Prerequisites
- Android 7.0+ device
- APK installed
- Network connectivity

#### Test Cases

1. **Installation**
   - [ ] APK installs successfully
   - [ ] App launches on first run
   - [ ] Permissions granted correctly
   - [ ] App appears in app drawer

2. **Kiosk Mode**
   - [ ] Lock task mode enabled
   - [ ] Home button does not exit app
   - [ ] Recent apps button disabled
   - [ ] Back button disabled
   - [ ] Auto-launch on boot works

3. **Functionality**
   - [ ] Device pairing works
   - [ ] Content loads and plays
   - [ ] Touch interactions work (if enabled)
   - [ ] Network connectivity stable
   - [ ] Battery optimization disabled

4. **Performance**
   - [ ] Memory usage reasonable
   - [ ] Smooth playback
   - [ ] No crashes after 24h

#### Test Results Template

```
Platform: Android
Version: 7.0+
Device: [Device Model]
Date: YYYY-MM-DD
Tester: Name

Installation: ✅/❌
Kiosk Mode: ✅/❌
Functionality: ✅/❌
Performance: ✅/❌
Notes: [Any issues or observations]
```

### Tizen (Samsung Smart TV)

#### Prerequisites
- Samsung Smart TV with Tizen OS
- Tizen Studio installed
- TV connected to network
- App deployed to TV

#### Test Cases

1. **Installation**
   - [ ] App installs via Tizen Studio
   - [ ] App appears in TV app list
   - [ ] App launches successfully
   - [ ] App permissions granted

2. **TV Remote Control**
   - [ ] Arrow keys navigate (if needed)
   - [ ] OK button works
   - [ ] Back button handled correctly
   - [ ] Color keys work (if used)

3. **Functionality**
   - [ ] Device pairing works
   - [ ] Content loads and plays
   - [ ] Screen saver prevented
   - [ ] App lifecycle events work
   - [ ] Network connectivity stable

4. **Performance**
   - [ ] Smooth playback
   - [ ] No lag or stuttering
   - [ ] Memory usage acceptable

#### Test Results Template

```
Platform: Tizen
TV Model: [Model]
Tizen Version: [Version]
Date: YYYY-MM-DD
Tester: Name

Installation: ✅/❌
Remote Control: ✅/❌
Functionality: ✅/❌
Performance: ✅/❌
Notes: [Any issues or observations]
```

### WebOS (LG Smart TV)

#### Prerequisites
- LG Smart TV with WebOS 4.0+
- webOS CLI installed
- TV connected to network
- App deployed to TV

#### Test Cases

1. **Installation**
   - [ ] App installs via webOS CLI
   - [ ] App appears in TV app list
   - [ ] App launches successfully
   - [ ] App permissions granted

2. **TV Remote Control**
   - [ ] Arrow keys work
   - [ ] OK button works
   - [ ] Back button handled
   - [ ] Magic Remote gestures work (if applicable)

3. **Functionality**
   - [ ] Device pairing works
   - [ ] Content loads and plays
   - [ ] Fullscreen mode works
   - [ ] App lifecycle events work
   - [ ] Network connectivity stable

#### Test Results Template

```
Platform: WebOS
TV Model: [Model]
WebOS Version: [Version]
Date: YYYY-MM-DD
Tester: Name

Installation: ✅/❌
Remote Control: ✅/❌
Functionality: ✅/❌
Performance: ✅/❌
Notes: [Any issues or observations]
```

### BrightSign

#### Prerequisites
- BrightSign Series 4+ device
- BrightSign Presentation Manager
- Device connected to network
- Content deployed to device

#### Test Cases

1. **Deployment**
   - [ ] Files copy to device successfully
   - [ ] Device launches player on boot
   - [ ] Network configuration correct
   - [ ] Device can reach API server

2. **Functionality**
   - [ ] Device pairing works
   - [ ] Content loads and plays
   - [ ] Content sync works
   - [ ] Network connectivity stable
   - [ ] Remote commands work

3. **Performance**
   - [ ] Smooth playback
   - [ ] Content caching works
   - [ ] Network usage optimized

#### Test Results Template

```
Platform: BrightSign
Device Model: [Model]
Firmware: [Version]
Date: YYYY-MM-DD
Tester: Name

Deployment: ✅/❌
Functionality: ✅/❌
Performance: ✅/❌
Notes: [Any issues or observations]
```

## Common Test Scenarios

### Device Pairing

1. Launch player on device
2. Note pairing code displayed
3. In portal, go to Organization > Area
4. Add device and enter pairing code
5. Verify device appears online
6. Verify device receives content

**Expected Result:** Device pairs successfully and appears online

### Content Playback

1. Create playlist with images/videos
2. Create schedule
3. Assign schedule to device
4. Verify content plays on device
5. Verify transitions work
6. Verify timing is correct

**Expected Result:** Content plays correctly with smooth transitions

### Network Connectivity

1. Verify device has network connection
2. Verify device can reach API server
3. Verify WebSocket connection established
4. Verify heartbeat reporting works
5. Test with network interruption
6. Verify reconnection works

**Expected Result:** Device maintains stable connection and reconnects after interruption

### Kiosk Mode

1. Launch app in kiosk mode
2. Attempt to exit app (platform-specific)
3. Verify app cannot be closed
4. Verify system shortcuts disabled
5. Verify auto-restart on crash

**Expected Result:** App cannot be exited and restarts automatically

## Performance Benchmarks

### Memory Usage
- **Target:** < 500MB for all platforms
- **Acceptable:** < 1GB
- **Unacceptable:** > 1GB

### CPU Usage
- **Idle:** < 20%
- **Playing Video:** < 50%
- **Unacceptable:** > 80%

### Network Usage
- **Content Sync:** Efficient, only sync when needed
- **Heartbeat:** Every 30 seconds
- **WebSocket:** Persistent connection

### Playback Performance
- **Frame Rate:** 60fps for video, smooth for images
- **Transition:** < 500ms
- **Load Time:** < 3 seconds for first content

## Known Issues

### Platform-Specific Issues

**Windows:**
- None currently known

**Linux:**
- AppImage may require execute permission

**Android:**
- Lock task mode requires device owner or kiosk app configuration

**Tizen:**
- Some older TV models may have performance issues

**WebOS:**
- Back button behavior may vary by TV model

**BrightSign:**
- Network configuration can be complex

## Reporting Issues

When reporting issues, include:

1. **Platform:** Windows/Linux/Android/Tizen/WebOS/BrightSign
2. **Version:** Platform and app version
3. **Device:** Device model and specifications
4. **Steps to Reproduce:** Detailed steps
5. **Expected Behavior:** What should happen
6. **Actual Behavior:** What actually happens
7. **Logs:** Relevant log files or console output
8. **Screenshots:** If applicable

## Test Checklist

Before releasing, verify:

- [ ] All platforms tested
- [ ] Device pairing works on all platforms
- [ ] Content playback works on all platforms
- [ ] Kiosk mode works on all platforms
- [ ] Network connectivity stable
- [ ] Performance benchmarks met
- [ ] No critical bugs
- [ ] Documentation updated
