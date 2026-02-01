# Device Status and Control Fix

## Issues Identified

### 1. Device Status Not Updating Correctly
- **Problem**: Device status calculation relies on `last_heartbeat`, but heartbeat updates are missing the `isPlaying` state dependency
- **Impact**: Status shows incorrect online/offline states, and screen on/off state doesn't persist

### 2. Devices Not Displaying
- **Problem**: Missing error handling and loading states, making it unclear when devices fail to load
- **Impact**: Some devices don't appear in the device list without clear error messages

### 3. Unable to Reboot/Control Devices
- **Problem**: WebSocket connection issues and missing reconnection logic
- **Impact**: Commands (reboot, screen on/off) fail to reach devices, especially after network interruptions

### 4. Screen On/Off State Not Persisting
- **Problem**: `is_playing` state not properly synchronized between player and backend
- **Impact**: UI shows incorrect screen state after toggling

## Fixes Applied

### 1. Fixed Heartbeat Dependency (DevicePlayer.jsx)
**Changes:**
- Added `isPlaying` to heartbeat effect dependencies array
- Ensured heartbeat sends current playing state on every update
- Added logging to track heartbeat status

**Code:**
```javascript
useEffect(() => {
    // ... heartbeat logic
}, [deviceId, isPlaying]); // Added isPlaying dependency
```

### 2. Improved WebSocket Reconnection (DevicePlayer.jsx)
**Changes:**
- Implemented automatic reconnection with exponential backoff
- Added connection state tracking and retry logic
- Better error handling and logging
- Command acknowledgment system
- Proper cleanup on component unmount

**Features:**
- Base reconnect delay: 1 second
- Max reconnect delay: 30 seconds
- Exponential backoff: delay = baseDelay * 2^attempts
- Automatic retry on connection failure

### 3. Enhanced Device Status Calculation (device-service)
**Changes:**
- Improved status calculation logic in SQL query
- Better handling of `is_playing` field with COALESCE
- Fixed status updates on heartbeat
- Added detailed logging for debugging

**Status Logic:**
- `last_heartbeat` NULL → offline
- `last_heartbeat` < 2 minutes ago → online
- `last_heartbeat` < 5 minutes ago → online
- Otherwise → offline

### 4. Fixed Device List Query (device-service)
**Changes:**
- Ensured all devices are returned with proper relationships
- Fixed RBAC filtering logic
- Added better error handling with detailed error messages
- Added logging for query debugging

### 5. Improved UI Feedback (Devices.jsx)
**Changes:**
- Added loading state with spinner
- Added error state with retry button
- Enhanced error messages
- Better empty state handling
- Added query client for manual refresh

## Files Modified

1. **`/frontend/src/pages/DevicePlayer.jsx`**
   - Fixed heartbeat effect dependencies
   - Implemented WebSocket auto-reconnection
   - Added command acknowledgment
   - Enhanced logging

2. **`/services/device-service/src/index.js`**
   - Improved device status calculation
   - Enhanced error handling
   - Added detailed logging

3. **`/frontend/src/pages/Devices.jsx`**
   - Added loading and error states
   - Enhanced error handling
   - Improved user feedback

## Testing Steps

### 1. Test Device Status
1. Open a player window: `http://localhost:5173/player/{deviceId}`
2. Check if device shows as "online" in Devices page
3. Verify last heartbeat time updates every 30 seconds
4. Close player window
5. Wait 2-5 minutes and verify device shows as "offline"

### 2. Test Screen On/Off
1. With player running, click "Turn Screen OFF" button (Power icon)
2. Verify player stops playing content (black screen or paused)
3. Verify device status shows "(Paused)" in the device list
4. Verify Power icon turns red
5. Click "Turn Screen ON" button
6. Verify playback resumes
7. Verify device status no longer shows "(Paused)"
8. Verify Power icon turns green

### 3. Test Reboot
1. Open browser console to see logs
2. Click "Reboot Player" button (Rotate icon)
3. Confirm the reboot action
4. Verify player page reloads
5. Verify device reconnects to WebSocket
6. Verify device shows online after reload

### 4. Test Device List
1. Navigate to Devices page
2. Verify all registered devices appear in the list
3. Check that property and zone names display correctly
4. Verify last heartbeat time updates automatically
5. Check online/offline status indicators
6. Verify device counts in header (Online/Offline pills)

### 5. Test WebSocket Reconnection
1. Open player in browser
2. Open browser DevTools → Network tab
3. Find WebSocket connection
4. Right-click and "Close connection"
5. Verify player automatically reconnects (check console logs)
6. Verify reconnection attempts increase with exponential backoff
7. Send a command after reconnection to verify it works

### 6. Test Error Handling
1. Stop the API Gateway service
2. Refresh Devices page
3. Verify error message displays
4. Verify "Retry" button appears
5. Restart API Gateway
6. Click "Retry" button
7. Verify devices load successfully

## Database Migration

The `is_playing` field is added via migration. Ensure it's applied:

```bash
# Check if migration is applied
psql -h localhost -U postgres -d digital_signage -c "SELECT column_name FROM information_schema.columns WHERE table_name='devices' AND column_name='is_playing';"

# If not applied, run:
psql -h localhost -U postgres -d digital_signage -f database/migrations/add_device_is_playing.sql
```

## Troubleshooting

### Devices Not Showing
1. Check browser console for errors
2. Check device-service logs: `docker logs digital_signage-device-service-1`
3. Verify user has correct RBAC permissions
4. Check if devices have valid zone and property relationships

### Commands Not Working
1. Verify WebSocket connection in browser DevTools
2. Check API Gateway logs: `docker logs digital_signage-api-gateway-1`
3. Ensure player is connected (check console logs)
4. Verify device ID matches between player and portal

### Status Not Updating
1. Check if heartbeat is being sent (player console logs)
2. Verify device-service is receiving heartbeats
3. Check database `last_heartbeat` field:
   ```sql
   SELECT id, device_name, last_heartbeat, is_playing, status FROM devices;
   ```

## Success Criteria

✅ Device status accurately reflects online/offline state  
✅ Screen on/off commands work reliably  
✅ Reboot command works and device reconnects  
✅ Device list shows all devices with correct information  
✅ WebSocket automatically reconnects after disconnection  
✅ Error messages are clear and actionable  
✅ Loading states provide good user feedback  
✅ `is_playing` state persists correctly  

## Next Steps

Consider implementing:
1. Device health monitoring dashboard
2. Command history and audit log
3. Bulk device operations
4. Device grouping and tagging
5. Advanced filtering and search
6. Real-time device metrics (CPU, memory, storage)

