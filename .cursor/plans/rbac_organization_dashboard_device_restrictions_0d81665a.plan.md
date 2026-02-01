---
name: RBAC Organization Dashboard Device Restrictions
overview: Implement role-based access control for Organization page visibility, Super Admin organization-filtered dashboard, and Area User (zone_admin) device restrictions with limited device management capabilities.
todos:
  - id: org-page-access
    content: Update Organization page access control - restrict to super_admin and property_admin in Sidebar and Organization component
    status: completed
  - id: superadmin-dashboard-dropdown
    content: Add property dropdown to Dashboard for super_admin with property selection and filtering
    status: completed
  - id: dashboard-api-property-filter
    content: Update dashboard-stats API endpoint to accept propertyId parameter and filter stats by property for super_admin
    status: completed
    dependencies:
      - superadmin-dashboard-dropdown
  - id: zoneadmin-device-restrictions
    content: Hide Add Screen and Delete buttons for zone_admin in Devices page, show only Pause and Restart buttons
    status: completed
  - id: device-api-rbac
    content: Add RBAC protection to device creation and deletion endpoints, allow zone_admin only for commands
    status: completed
    dependencies:
      - zoneadmin-device-restrictions
  - id: verify-zone-filtering
    content: Verify zone_admin dashboard and device filtering works correctly with user_zone_access table
    status: completed
    dependencies:
      - dashboard-api-property-filter
      - device-api-rbac
---

# RBAC: Organization Access, Dashboard Filtering, and Device Restrictions

## Overview

Implement role-based access control for:

1. Organization page visibility (super_admin and property_admin only)
2. Super Admin dashboard with organization/property dropdown filtering
3. Area User (zone_admin) device restrictions (no add/delete, only pause/restart)

## Phase 1: Organization Page Access Control

### 1.1 Update Sidebar Navigation

**File**: `frontend/src/components/Sidebar.jsx`

- Add `requiresRole` property to Organization menu item
- Allow access for both `super_admin` and `property_admin` roles
- Update menu filtering logic to support multiple roles

**Changes**:

```javascript
{ path: '/properties', icon: Building2, label: 'Organization', requiresRoles: ['super_admin', 'property_admin'] }
```

### 1.2 Update Organization Page Component

**File**: `frontend/src/pages/Organization.jsx`

- Add role check at component level
- Show access denied message for unauthorized roles
- Ensure all existing functionality remains for authorized roles

## Phase 2: Super Admin Dashboard with Organization Filter

### 2.1 Update Dashboard Component

**File**: `frontend/src/pages/Dashboard.jsx`

- Add state for selected property/organization
- Add dropdown to select property (only visible for super_admin)
- Fetch list of properties for dropdown
- Pass selected propertyId to dashboard stats API
- Update query key to include propertyId for proper caching

**Implementation**:

- Add `useState` for `selectedPropertyId`
- Add `useQuery` to fetch properties list
- Add dropdown component in dashboard header
- Update dashboard-stats query to include `propertyId` parameter
- Conditionally show dropdown only when `user.role === 'super_admin'`

### 2.2 Update Dashboard Stats API

**File**: `services/device-service/src/index.js`

- Update `/analytics/dashboard-stats` endpoint
- Accept optional `propertyId` query parameter
- When `propertyId` is provided and user is `super_admin`, filter all stats by that property
- Filter devices, media, playlists, and schedules by property

**Changes**:

- Add propertyId filtering to device query
- Add propertyId filtering to media query (via tenant_id and property association)
- Add propertyId filtering to playlists query
- Add propertyId filtering to schedules query

## Phase 3: Area User (zone_admin) Device Restrictions

### 3.1 Update Devices Page Component

**File**: `frontend/src/pages/Devices.jsx`

- Hide "Add Screen" button for `zone_admin` role
- Hide "Delete" button for `zone_admin` role
- Show only "Pause" (screen_off) and "Restart" (reboot) buttons for `zone_admin`
- Keep all buttons visible for `super_admin` and `property_admin`

**Implementation**:

- Add role-based conditional rendering for "Add Screen" button
- Add role-based conditional rendering for delete button in device row
- Filter device commands based on role
- Show only `screen_off`, `screen_on`, and `reboot` commands for `zone_admin`

### 3.2 Update Device Service API

**File**: `services/device-service/src/index.js`

- Add RBAC checks to device creation endpoint (`POST /devices/devices`)
- Add RBAC checks to device deletion endpoint (`DELETE /devices/devices/:id`)
- Allow `zone_admin` to only send commands (pause, restart) but not create/delete
- Use existing `authorize` middleware or add role checks

**Changes**:

- Protect `POST /devices/devices` with `authorize('super_admin', 'property_admin')`
- Protect `DELETE /devices/devices/:id` with `authorize('super_admin', 'property_admin')`
- Ensure command endpoints remain accessible to `zone_admin`

### 3.3 Update Device Filtering for Zone Admin

**File**: `services/device-service/src/index.js`

- Ensure `GET /devices/devices` endpoint filters devices by zone access for `zone_admin`
- Use existing `user_zone_access` table to filter devices
- Only show devices in zones assigned to the `zone_admin` user

## Phase 4: Area User Dashboard Filtering

### 4.1 Update Dashboard for Zone Admin

**File**: `frontend/src/pages/Dashboard.jsx`

- Ensure dashboard automatically filters by user's assigned zones for `zone_admin`
- No dropdown needed - automatically scoped to their zones
- Backend should handle zone filtering automatically

### 4.2 Verify Dashboard Stats API Zone Filtering

**File**: `services/device-service/src/index.js`

- Verify existing zone_admin filtering in dashboard-stats endpoint
- Ensure all stats (devices, media, playlists, schedules) are filtered by zone access
- Test that zone_admin only sees data from their assigned zones

## Database Considerations

### Verify Zone Access Table

**File**: `database/migrations/002_rbac_enhancement.sql`

- Ensure `user_zone_access` table exists and is properly indexed
- Verify foreign key relationships are correct

## Testing Checklist

1. **Organization Page Access**:

   - [ ] Super Admin can access Organization page
   - [ ] Property Admin can access Organization page
   - [ ] Zone Admin cannot see Organization page in sidebar
   - [ ] Zone Admin gets access denied if navigating directly

2. **Super Admin Dashboard**:

   - [ ] Dropdown shows all properties in tenant
   - [ ] Selecting property filters all dashboard stats
   - [ ] Default shows all properties (or first property)
   - [ ] Stats update when property is changed

3. **Area User Device Restrictions**:

   - [ ] Cannot see "Add Screen" button
   - [ ] Cannot see "Delete" button on device rows
   - [ ] Can see and use "Pause" and "Restart" buttons
   - [ ] API returns 403 when trying to create/delete devices
   - [ ] Only sees devices in their assigned zones

4. **Area User Dashboard**:

   - [ ] Dashboard shows only data from assigned zones
   - [ ] Device count matches assigned zones
   - [ ] Media, playlists, schedules filtered correctly

## Files to Modify

### Frontend

- `frontend/src/components/Sidebar.jsx` - Add role-based menu filtering
- `frontend/src/pages/Dashboard.jsx` - Add property dropdown and filtering
- `frontend/src/pages/Devices.jsx` - Add role-based button visibility
- `frontend/src/pages/Organization.jsx` - Add access control check

### Backend

- `services/device-service/src/index.js` - Update dashboard stats and device endpoints
- `services/auth-service/src/middleware/rbac.js` - Verify existing RBAC functions

### Database

- Verify `user_zone_access` table structure (no changes needed if exists)