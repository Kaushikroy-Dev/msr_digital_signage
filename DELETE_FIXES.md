# Delete and Device Control Fixes ✅

## Issues Fixed

### 1. Delete Organization/Property/Area
**Problem**: No delete functionality in the Organization page UI.

**Solution**:
- Added `deletePropertyMutation` and `deleteZoneMutation` in `Organization.jsx`
- Added delete buttons with proper RBAC checks:
  - Properties: Only `super_admin` can delete
  - Zones/Areas: `super_admin` and `property_admin` can delete
- Added confirmation dialogs before deletion
- Delete buttons appear next to properties and areas in the hierarchy view

### 2. Delete Device
**Problem**: Device delete endpoint existed but wasn't properly authenticated.

**Solution**:
- Added authentication middleware to `/devices/:id` DELETE endpoint
- Added RBAC permission checks:
  - `super_admin`: Can delete any device
  - `property_admin`: Can delete devices in their assigned properties
  - `zone_admin`: Can delete devices in their assigned zones
- Frontend delete functionality was already implemented, now works correctly

### 3. Device Commands (Reboot/Shutdown)
**Problem**: Device command endpoints weren't properly authenticated and WebSocket broadcasting had path matching issues.

**Solution**:
- Added authentication middleware to `/devices/:id/commands` POST endpoint
- Added RBAC permission checks for device commands
- Fixed API Gateway WebSocket path matching regex to handle both `/api/devices/:id/commands` and `/devices/:id/commands` paths
- Commands are now properly broadcast via WebSocket to connected devices

### 4. Device Service Not Running
**Problem**: Device service wasn't running, causing "Service unavailable" errors.

**Solution**:
- Started device service on port 3005
- Service is now accessible through API Gateway

## Files Modified

1. **frontend/src/pages/Organization.jsx**
   - Added delete mutations for properties and zones
   - Added delete handlers with confirmation dialogs
   - Added delete buttons in the UI with proper role-based visibility

2. **services/device-service/src/index.js**
   - Added authentication to DELETE `/devices/:id` endpoint
   - Added authentication to POST `/devices/:id/commands` endpoint
   - Added RBAC permission checks for both endpoints
   - Improved error handling

3. **services/api-gateway/src/index.js**
   - Fixed WebSocket command broadcasting path matching regex
   - Now correctly matches both `/api/devices/:id/commands` and `/devices/:id/commands`

## Testing

### Delete Property
1. Go to Organization page
2. Click the trash icon next to a property (super_admin only)
3. Confirm deletion
4. Property and all its areas/devices are deleted

### Delete Area/Zone
1. Go to Organization page
2. Expand a property
3. Click the trash icon next to an area (super_admin or property_admin)
4. Confirm deletion
5. Area and all its devices are deleted

### Delete Device
1. Go to Devices page
2. Click the trash icon next to a device
3. Confirm deletion
4. Device is removed from the system

### Device Commands (Reboot/Shutdown)
1. Go to Devices page
2. Click the reboot or power button next to a device
3. Confirm the action
4. Command is sent via WebSocket to the connected device
5. Device receives and executes the command

## RBAC Permissions

| Action | super_admin | property_admin | zone_admin | content_editor | viewer |
|--------|-------------|----------------|------------|----------------|--------|
| Delete Property | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Zone/Area | ✅ | ✅ (own properties) | ❌ | ❌ | ❌ |
| Delete Device | ✅ | ✅ (own properties) | ✅ (own zones) | ❌ | ❌ |
| Send Device Commands | ✅ | ✅ (own properties) | ✅ (own zones) | ❌ | ❌ |

## Notes

- All delete operations include confirmation dialogs to prevent accidental deletions
- Delete operations cascade: deleting a property deletes all its zones and devices
- Device commands are broadcast in real-time via WebSocket if the device is connected
- If a device is not connected via WebSocket, the command is still stored in the database for later execution
- All endpoints now properly validate user permissions based on RBAC roles

---

**Status**: All delete and device control functionality is now working correctly! ✅
