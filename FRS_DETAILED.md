# Functional Requirements Specification (FRS)
# Digital Signage Platform - Complete System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend Services](#backend-services)
5. [Frontend Modules](#frontend-modules)
6. [Components](#components)
7. [Widgets](#widgets)
8. [Real-time Features](#real-time-features)
9. [Authentication & Authorization](#authentication--authorization)
10. [Deployment](#deployment)

---

## System Overview

### Purpose
Enterprise Cloud Digital Signage Solution - A multi-tenant platform for managing digital displays across multiple properties, zones, and devices. Supports content creation, template design, playlist management, scheduling, and real-time device control.

### Key Features
- Multi-tenant architecture with role-based access control
- Template designer with drag-and-drop zones and widgets
- Media library with property/zone isolation
- Playlist creation and management
- Advanced scheduling system
- Real-time device monitoring and control
- WebSocket-based command broadcasting
- Support for multiple platforms (Windows, Android, Tizen, webOS, BrightSign, Linux)

---

## Architecture

### Technology Stack
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL 16+
- **Cache**: Redis
- **Message Queue**: RabbitMQ
- **Frontend**: React, Vite
- **State Management**: Zustand
- **API Client**: Axios
- **Real-time**: WebSocket (ws library)
- **File Storage**: Local filesystem or AWS S3
- **Image Processing**: Sharp
- **Video Processing**: FFmpeg
- **Containerization**: Docker, Docker Compose

### Service Architecture (Microservices)
1. **API Gateway** (Port 3000) - Routes requests, handles WebSocket
2. **Auth Service** (Port 3001) - Authentication, user management, RBAC
3. **Content Service** (Port 3002) - Media upload, storage, thumbnails
4. **Template Service** (Port 3003) - Template CRUD, sharing, versioning
5. **Scheduling Service** (Port 3004) - Playlists, schedules, player content
6. **Device Service** (Port 3005) - Device management, heartbeats, commands

### Infrastructure Services
- **PostgreSQL** (Port 5432) - Primary database
- **Redis** (Port 6379) - Caching
- **RabbitMQ** (Ports 5672, 15672) - Message queue
- **Media Processor Worker** - Background media processing

---

## Database Schema

### Core Tables

#### Organization Hierarchy
- **tenants** - Root organizations (multi-tenancy)
- **regions** - Optional grouping layer
- **properties** - Physical locations/sites
- **zones** - Specific areas within properties

#### User Management
- **users** - User accounts with roles (super_admin, property_admin, content_editor, viewer)
- **user_property_access** - Property-level access for property_admin
- **user_zone_access** - Zone-level access for zone_admin
- **audit_logs** - Activity tracking

#### Media & Content
- **media_assets** - Uploaded files (images, videos, documents)
  - Fields: tenant_id, property_id, zone_id, file_name, file_type, storage_path, thumbnail_path, is_shared, shared_with_properties
- **templates** - Template designs
  - Fields: tenant_id, property_id, zone_id, name, zones (JSONB), background_color, preview_image_path, is_shared, shared_with_properties
- **template_zones** - Zone definitions within templates

#### Playlists & Scheduling
- **playlists** - Content playlists
  - Fields: tenant_id, property_id, zone_id, name, transition_effect, transition_duration_ms, is_shared, shared_with_properties
- **playlist_items** - Items in playlists (media or templates)
  - Fields: playlist_id, content_type ('media' or 'template'), media_asset_id, template_id, sequence_order, duration_seconds
- **schedules** - Playback schedules
  - Fields: tenant_id, playlist_id, start_date, end_date, start_time, end_time, days_of_week, recurrence_pattern, is_active, priority
- **schedule_devices** - Device assignments to schedules

#### Device Management
- **devices** - Display devices/players
  - Fields: zone_id, device_name, device_code, platform, status, last_heartbeat, is_playing
- **device_heartbeats** - Telemetry data
- **device_commands** - Remote commands (reboot, screen_on, screen_off, etc.)
- **pairing_codes** - Device pairing codes

#### Additional Tables
- **widget_settings** - Global widget configurations
- **template_versions** - Template version history
- **template_shares** - Template sharing across tenants/users
- **template_comments** - Template collaboration
- **data_sources** - External data bindings
- **scheduled_content** - Time-based content switching
- **emergency_alerts** - Emergency broadcast system

### Key Relationships
- Tenant → Properties → Zones → Devices
- Templates/Media → Property/Zone (with sharing support)
- Playlists → Playlist Items → Media/Templates
- Schedules → Playlists → Devices

---

## Backend Services

### 1. API Gateway Service (`services/api-gateway/src/index.js`)

**Purpose**: Central entry point, request routing, WebSocket server

**Endpoints**:
- `GET /health` - Health check
- Routes all `/api/*` requests to appropriate services

**WebSocket Server** (`/ws`):
- Device registration: `{ type: 'register', deviceId }`
- Heartbeat: `{ type: 'heartbeat' }`
- Command broadcasting: `{ type: 'command', command: 'screen_off', timestamp }`
- Proof of play: `{ type: 'proof_of_play' }`

**Proxy Configuration**:
- `/api/auth` → Auth Service (port 3001)
- `/api/content` → Content Service (port 3002)
- `/api/templates` → Template Service (port 3003)
- `/api/schedules` → Scheduling Service (port 3004)
- `/api/devices` → Device Service (port 3005)
- `/uploads` → Content Service (static files)

**Features**:
- CORS handling
- Rate limiting (10000 requests per 15 minutes)
- Multipart/form-data streaming for file uploads
- WebSocket command interception and broadcasting

---

### 2. Auth Service (`services/auth-service/src/index.js`)

**Purpose**: Authentication, user management, RBAC enforcement

**Endpoints**:

#### Authentication
- `POST /register` - Register new user
  - Body: { email, password, firstName, lastName, tenantId, role }
- `POST /login` - User login
  - Body: { email, password }
  - Returns: { token, user: { id, email, firstName, lastName, role, tenantId, tenantName } }
- `POST /verify` - Verify JWT token
- `GET /profile` - Get user profile (authenticated)

#### User Management (Super Admin Only)
- `GET /users?tenantId=...` - List all users for tenant
- `POST /users` - Create user
  - Body: { tenantId, email, password, firstName, lastName, role, propertyAccess[], zoneAccess[] }
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `GET /users/:id/property-access` - Get user's property access
- `GET /users/:id/zone-access` - Get user's zone access

#### Analytics
- `GET /analytics/activity?tenantId=...` - Get recent activity logs

**RBAC Middleware** (`middleware/rbac.js`):
- Validates user permissions based on role
- Enforces property/zone access restrictions

**JWT Configuration**:
- Secret: `JWT_SECRET` env variable
- Expiry: `JWT_EXPIRY` (default: 24h)

---

### 3. Content Service (`services/content-service/src/index.js`)

**Purpose**: Media upload, storage, thumbnail generation

**Endpoints**:

#### Media Upload
- `POST /upload` (multipart/form-data)
  - Fields: file, tenantId, userId, tags, propertyId, zoneId
  - Supports: images (jpeg, jpg, png, gif, webp), videos (mp4, webm, mov, avi), documents (pdf, doc, docx, ppt, pptx)
  - Max size: 500MB
  - Auto-generates thumbnails for images and videos
  - Video thumbnails use FFmpeg (1 second mark)
  - Returns: { id, fileName, originalName, fileType, url, thumbnailUrl, width, height }

#### Media Management
- `GET /assets?tenantId=...&fileType=...&propertyId=...&zoneId=...`
  - Returns filtered media assets based on RBAC
  - Supports pagination: limit, offset
- `DELETE /assets/:id` - Soft delete (status = 'archived')
- `POST /assets/:id/regenerate-thumbnail` - Regenerate video thumbnail

#### Content Sharing
- `POST /assets/:id/share` - Share media with properties
  - Body: { propertyIds: [] }
  - Super admin only
- `DELETE /assets/:id/share` - Unshare from all properties
- `DELETE /assets/:id/share/:propertyId` - Unshare from specific property

**Storage**:
- Local: `uploads/{tenantId}/media/` and `uploads/{tenantId}/thumbnails/`
- S3: Configured via AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME

**RBAC**:
- Super admin: Can upload to any property, must specify propertyId
- Property admin: Auto-assigned to their property, requires zoneId
- Zone admin: Auto-assigned to their zone
- Content editor: Same as property admin
- Viewer: Cannot upload

---

### 4. Template Service (`services/template-service/src/index.js`)

**Purpose**: Template CRUD, sharing, versioning, widget settings

**Endpoints**:

#### Template CRUD
- `GET /templates?tenantId=...&category=...&tags=...&search=...&propertyId=...&zoneId=...&sortBy=...&sortOrder=...`
  - Returns filtered templates based on RBAC
- `GET /templates/:id` - Get single template
- `POST /templates` - Create template
  - Body: { name, description, category, tags, variables, width, height, orientation, zones, background_color, background_image_id, propertyId, zoneId }
  - Zones: JSONB array of zone objects
- `PUT /templates/:id` - Update template (supports partial updates)
- `DELETE /templates/:id` - Delete template
- `POST /templates/:id/duplicate` - Duplicate template
- `POST /templates/:id/save-as` - Save as new template
  - Body: { name, description }

#### Template Versioning
- `POST /templates/:id/versions` - Create version snapshot
- `GET /templates/:id/versions` - Get version history
- `POST /templates/:id/versions/:versionId/restore` - Restore version

#### Template Sharing
- `POST /templates/:id/share` - Share template
  - Body: { propertyIds: [] } OR { sharedWithUserId, sharedWithTenantId, permission, isPublic }
- `GET /templates/shared?type=...` - Get shared templates (with-me, by-me, public, all)
- `DELETE /templates/:id/share?shareId=...` - Unshare template

#### Template Analytics
- `GET /templates/:id/analytics` - Get usage statistics
  - Returns: { playlistUsage, deviceCount, lastUsed, loadTime, errors }

#### Widget Settings
- `GET /settings/widgets?widgetType=...` - Get widget settings
- `GET /settings/widgets/:key?widgetType=...` - Get specific setting
- `PUT /settings/widgets/:key` - Create/update setting
  - Body: { setting_value, widget_type }
- `DELETE /settings/widgets/:key?widgetType=...` - Delete setting

#### Data Sources & Bindings
- `GET /data-sources?tenantId=...` - List data sources
- `POST /data-sources` - Create data source
  - Body: { name, source_type, config, authentication, refresh_interval }
- `POST /data-sources/:id/test` - Test data source connection
- `PUT /templates/:templateId/zones/:zoneId/data-binding` - Bind zone to data source

#### Scheduled Content
- `GET /templates/:id/scheduled-content` - Get scheduled content for template
- `POST /templates/:id/scheduled-content` - Create scheduled content
  - Body: { zone_id, content_type, schedule_type, schedule_config, content_data, priority }

#### Template Export/Import
- `GET /templates/:id/export?includeMedia=...` - Export template as JSON
- `POST /templates/import` - Import template
  - Body: { template, mediaAssets, propertyId, zoneId }

**Template Zone Structure** (JSONB):
```json
{
  "id": "uuid",
  "name": "Zone 1",
  "x": 0,
  "y": 0,
  "width": 1920,
  "height": 1080,
  "zIndex": 0,
  "contentType": "media|widget|text",
  "widgetType": "clock|weather|ticker|qrcode|webview|...",
  "mediaAssetId": "uuid",
  "widgetConfig": {},
  "isLocked": false
}
```

---

### 5. Scheduling Service (`services/scheduling-service/src/index.js`)

**Purpose**: Playlist management, scheduling, player content delivery

**Endpoints**:

#### Playlist Management
- `GET /playlists?tenantId=...&propertyId=...&zoneId=...`
  - Returns filtered playlists based on RBAC
- `POST /playlists` - Create playlist
  - Body: { name, description, transitionEffect, transitionDuration, propertyId, zoneId }
- `PUT /playlists/:id` - Update playlist
- `DELETE /playlists/:id` - Delete playlist

#### Playlist Items
- `GET /playlists/:id/items` - Get playlist items
  - Returns: { items: [{ id, content_type, content_id, content_name, url, thumbnail_url, duration_seconds, order_index, template }] }
- `POST /playlists/:id/items` - Add item to playlist
  - Body: { contentType: 'media'|'template', contentId, duration }
- `PUT /playlists/:playlistId/items/:itemId` - Update item duration
  - Body: { duration } (in seconds)
- `DELETE /playlists/:playlistId/items/:itemId` - Remove item

#### Schedule Management
- `GET /schedules?tenantId=...&propertyId=...&zoneId=...`
  - Returns filtered schedules based on RBAC
- `POST /schedules` - Create schedule
  - Body: { name, playlistId, startDate, endDate, startTime, endTime, daysOfWeek[], recurrencePattern, deviceIds[], propertyId, zoneId }
- `PUT /schedules/:id` - Update schedule
  - Body: { name, playlistId, startDate, endDate, startTime, endTime, daysOfWeek, recurrencePattern, deviceIds, isActive }
- `DELETE /schedules/:id` - Delete schedule

#### Device Assignments
- `GET /schedules/:id/devices` - Get assigned devices
- `POST /schedules/:id/devices` - Assign devices
  - Body: { deviceIds: [] }
- `POST /playlists/:playlistId/assign-devices` - Quick assign (creates default schedule)
  - Body: { deviceIds: [] }
- `GET /playlists/:playlistId/devices` - Get devices assigned to playlist

#### Player Content (Device Endpoint)
- `GET /player/:deviceId/content` - Get current content for device
  - Returns: { playlist: { id, name, transition_effect, transition_duration_ms }, items: [...] }
  - Filters by: current date, time, day of week
  - Respects schedule priority
  - Returns null playlist if no active schedule

#### Playlist Sharing
- `POST /playlists/:id/share` - Share playlist with properties
- `DELETE /playlists/:id/share` - Unshare from all
- `DELETE /playlists/:id/share/:propertyId` - Unshare from property

**Schedule Logic**:
- Date range: startDate <= currentDate <= endDate (NULL = no limit)
- Time range: startTime <= currentTime <= endTime (handles midnight crossover)
- Days of week: Array of integers (0=Sunday, 1=Monday, etc.)
- Priority: Higher priority schedules override lower ones

---

### 6. Device Service (`services/device-service/src/index.js`)

**Purpose**: Device management, heartbeats, commands, properties/zones

**Endpoints**:

#### Device Management
- `GET /devices?tenantId=...&zoneId=...&propertyId=...`
  - Returns: { devices: [{ id, deviceName, deviceCode, platform, status, isPlaying, lastHeartbeat, zoneName, propertyName }] }
  - Calculates status: 'online' if last_heartbeat < 2 minutes, else 'offline'
- `POST /devices` - Register device
  - Body: { name, deviceCode, zoneId, platform, orientation }
- `DELETE /devices/:id` - Delete device

#### Device Heartbeats
- `POST /devices/:id/heartbeat` - Update heartbeat
  - Body: { cpuUsage, memoryUsage, storageUsedGb, storageTotalGb, networkStatus, isPlaying }
  - Updates: device status='online', last_heartbeat=NOW(), is_playing
  - Inserts heartbeat record
- `GET /devices/:id/heartbeats` - Get heartbeat history

#### Device Commands
- `POST /devices/:id/commands` - Send remote command
  - Body: { commandType: 'reboot'|'update'|'screen_on'|'screen_off'|'clear_cache' }
  - Stores command in device_commands table
  - API Gateway broadcasts via WebSocket

#### Properties Management
- `GET /properties?tenantId=...` - List properties (RBAC filtered)
- `POST /properties` - Create property (super admin only)
  - Body: { tenantId, name, address, city, state, country, timezone }
- `PUT /properties/:id` - Update property
- `DELETE /properties/:id` - Delete property

#### Zones Management
- `GET /zones?propertyId=...` - Get zones for property
- `GET /all-zones?tenantId=...` - Get all zones for tenant
- `POST /zones` - Create zone
  - Body: { propertyId, name, description, zone_type }
- `PUT /zones/:id` - Update zone
- `DELETE /zones/:id` - Delete zone

#### Device Pairing
- `POST /pairing/generate` - Generate pairing code (called by player)
  - Body: { platform, deviceInfo }
  - Returns: { code, expires_at }
- `GET /pairing/status/:code` - Check pairing status (polled by player)
  - Returns: { assignedDeviceId } or 404
- `POST /pairing/claim` - Claim pairing code (called by portal)
  - Body: { code, name, zoneId, platform }
  - Creates device and links to code

#### Analytics
- `GET /analytics/dashboard-stats?tenantId=...&propertyId=...`
  - Returns: { totalDevices, onlineDevices, totalMedia, totalPlaylists, activeSchedules }
  - RBAC filtered

**RBAC**:
- Super admin: Full access
- Property admin: Access to assigned properties
- Zone admin: Access to assigned zones (cannot create/delete devices)
- Content editor: Same as property admin
- Viewer: Read-only

---

## Frontend Modules

### 1. Login Page (`frontend/src/pages/Login.jsx`)

**Functionality**:
- User authentication form (email, password)
- Calls `POST /api/auth/login`
- Stores JWT token in localStorage (Zustand store)
- Redirects to Dashboard on success
- Error handling and display

**State Management**:
- Uses `authStore` from `store/authStore.js`
- Stores: token, user object (id, email, firstName, lastName, role, tenantId)

---

### 2. Dashboard Page (`frontend/src/pages/Dashboard.jsx`)

**Functionality**:
- Displays overview statistics
- Calls `GET /api/analytics/dashboard-stats`
- Shows: Total devices, online devices, total media, playlists, active schedules
- Recent activity feed
- Calls `GET /api/analytics/activity`
- Property/zone filtering (if super admin)

**Components Used**:
- PropertyZoneSelector (for filtering)

---

### 3. Organization Page (`frontend/src/pages/Organization.jsx`)

**Functionality**:
- Manage properties and zones hierarchy
- Create/edit/delete properties (super admin only)
- Create/edit/delete zones
- Calls Device Service endpoints:
  - `GET /api/devices/properties`
  - `POST /api/devices/properties`
  - `PUT /api/devices/properties/:id`
  - `DELETE /api/devices/properties/:id`
  - `GET /api/devices/zones`
  - `POST /api/devices/zones`
  - `PUT /api/devices/zones/:id`
  - `DELETE /api/devices/zones/:id`

**UI Features**:
- Tree/hierarchy view of properties → zones
- Form modals for create/edit
- Confirmation dialogs for delete

---

### 4. Media Library Page (`frontend/src/pages/MediaLibrary.jsx`)

**Functionality**:
- Upload media files
- View media grid/list
- Filter by file type, property, zone
- Delete media
- Share media with properties (super admin)
- Calls Content Service:
  - `GET /api/content/assets`
  - `POST /api/content/upload` (multipart/form-data)
  - `DELETE /api/content/assets/:id`
  - `POST /api/content/assets/:id/share`
  - `DELETE /api/content/assets/:id/share`

**Components Used**:
- PropertyZoneSelector (for filtering and upload assignment)
- Media uploader with drag-and-drop
- Media grid with thumbnails

**Features**:
- Thumbnail display (auto-generated)
- File type icons
- Duration display for videos
- Property/zone tags
- Sharing indicators

---

### 5. Templates Page (`frontend/src/pages/Templates.jsx`)

**Functionality**:
- Template designer with canvas
- Create/edit/delete templates
- Zone management (add, resize, move, delete zones)
- Widget placement and configuration
- Background image/color selection
- Template preview and live preview
- Generate template thumbnail
- Duplicate template
- Save as new template
- Calls Template Service:
  - `GET /api/templates`
  - `POST /api/templates`
  - `PUT /api/templates/:id`
  - `DELETE /api/templates/:id`
  - `POST /api/templates/:id/duplicate`
  - `POST /api/templates/:id/save-as`
  - `POST /api/templates/:id/generate-thumbnail` (uploads to content service)

**Components Used**:
- TemplateCanvas - Main design canvas
- ZoneElement - Individual zone rendering
- PropertiesPanel - Zone/widget properties
- MediaLibraryPanel - Media selection
- WidgetConfigPanel - Widget configuration
- TemplateLivePreview - Preview modal
- PropertyZoneSelector - Property/zone assignment

**Template Designer Features**:
- Drag-and-drop zones
- Resize handles
- Layer panel (z-index management)
- Undo/redo (useTemplateUndoRedo hook)
- Zoom controls
- Grid/snap-to-grid
- Background image picker
- Color picker
- Widget library sidebar

**Zone Types**:
- Media zone: Displays uploaded media
- Widget zone: Clock, Weather, Ticker, QR Code, WebView, etc.
- Text zone: Static text content

---

### 6. Playlists Page (`frontend/src/pages/Playlists.jsx`)

**Functionality**:
- Create/edit/delete playlists
- Add media and templates to playlists
- Reorder playlist items
- Set item duration
- Preview playlist
- Assign playlists to devices
- Calls Scheduling Service:
  - `GET /api/schedules/playlists`
  - `POST /api/schedules/playlists`
  - `PUT /api/schedules/playlists/:id`
  - `DELETE /api/schedules/playlists/:id`
  - `GET /api/schedules/playlists/:id/items`
  - `POST /api/schedules/playlists/:id/items`
  - `PUT /api/schedules/playlists/:playlistId/items/:itemId`
  - `DELETE /api/schedules/playlists/:playlistId/items/:itemId`
  - `POST /api/schedules/playlists/:playlistId/assign-devices`

**Components Used**:
- PropertyZoneSelector (for filtering)
- PlaylistPreview (preview component)
- Media/template selection modals

**Features**:
- Drag-and-drop reordering
- Duration editor (seconds)
- Transition effect selection
- Auto-advance preview

---

### 7. Scheduler Page (`frontend/src/pages/Scheduler.jsx`)

**Functionality**:
- Create/edit/delete schedules
- Assign playlists to schedules
- Set date/time ranges
- Configure days of week
- Set recurrence patterns
- Assign devices to schedules
- Calls Scheduling Service:
  - `GET /api/schedules/schedules`
  - `POST /api/schedules/schedules`
  - `PUT /api/schedules/schedules/:id`
  - `DELETE /api/schedules/schedules/:id`
  - `GET /api/schedules/schedules/:id/devices`
  - `POST /api/schedules/schedules/:id/devices`

**Features**:
- Calendar view
- Time range picker
- Days of week selector
- Recurrence pattern selector (daily, weekly, monthly, custom)
- Device multi-select
- Priority setting
- Active/inactive toggle

---

### 8. Devices Page (`frontend/src/pages/Devices.jsx`)

**Functionality**:
- List all devices
- View device status (online/offline, isPlaying)
- Register new device (pairing code)
- Delete device
- Send remote commands (reboot, screen_on, screen_off, clear_cache)
- Filter by property/zone
- Calls Device Service:
  - `GET /api/devices/devices`
  - `POST /api/devices/devices` (register)
  - `DELETE /api/devices/:id`
  - `POST /api/devices/:id/commands`
  - `POST /api/devices/pairing/claim`

**Components Used**:
- PropertyZoneSelector (for filtering)
- Device status indicators
- Command buttons

**Features**:
- Real-time status updates (polling or WebSocket)
- Last heartbeat display
- Platform badges
- Zone/property display
- Pairing code input modal

---

### 9. Device Player Page (`frontend/src/pages/DevicePlayer.jsx`)

**Purpose**: Runs on actual display devices

**Functionality**:
- Fetches current content from `GET /api/schedules/player/:deviceId/content`
- Renders playlist items sequentially
- Handles transitions (fade, slide, cut)
- Sends heartbeats: `POST /api/devices/:deviceId/heartbeat`
- WebSocket connection for commands
- Handles commands: screen_on, screen_off, reboot, update
- Updates isPlaying status based on screen_on/screen_off
- Renders templates using TemplateRenderer
- Renders media (images, videos)

**Components Used**:
- TemplateRenderer (for template content)
- MediaPlayer (for video playback)

**Features**:
- Auto-advance based on duration
- Transition animations
- Fullscreen mode
- Error handling and fallback content
- Offline mode detection

---

### 10. User Management Page (`frontend/src/pages/UserManagement.jsx`)

**Functionality**:
- List all users (super admin only)
- Create/edit/delete users
- Assign property/zone access
- Set user roles
- Calls Auth Service:
  - `GET /api/auth/users`
  - `POST /api/auth/users`
  - `PUT /api/auth/users/:id`
  - `DELETE /api/auth/users/:id`
  - `GET /api/auth/users/:id/property-access`
  - `GET /api/auth/users/:id/zone-access`

**Features**:
- User table with sorting/filtering
- Role badges
- Property/zone access multi-select
- Password reset (future)

---

## Components

### Core Components

#### Layout (`frontend/src/components/Layout.jsx`)
- Main app layout with header, sidebar, content area
- Navigation menu
- User profile dropdown
- Logout functionality

#### Header (`frontend/src/components/Header.jsx`)
- Top navigation bar
- Breadcrumbs
- User menu
- Notifications (future)

#### Sidebar (`frontend/src/components/Sidebar.jsx`)
- Main navigation menu
- Menu items: Dashboard, Organization, Media Library, Templates, Playlists, Scheduler, Devices, User Management
- Role-based menu visibility

#### PropertyZoneSelector (`frontend/src/components/PropertyZoneSelector.jsx`)
- Dropdown for property selection
- Dropdown for zone selection (filtered by property)
- Used across multiple pages for filtering and assignment
- RBAC-aware (shows only accessible properties/zones)
- Calls: `GET /api/devices/properties`, `GET /api/devices/zones`

### Template Designer Components

#### TemplateCanvas (`frontend/src/components/TemplateCanvas.jsx`)
- Main canvas for template design
- Handles zone rendering
- Drag-and-drop zone creation
- Zone selection
- Canvas zoom/pan
- Grid overlay
- Snap-to-grid

#### ZoneElement (`frontend/src/components/ZoneElement.jsx`)
- Individual zone rendering
- Resize handles
- Selection border
- Zone type indicators
- Lock indicator

#### PropertiesPanel (`frontend/src/components/PropertiesPanel.jsx`)
- Zone properties editor
- Position (x, y)
- Size (width, height)
- Z-index
- Content type selector
- Widget type selector (if widget zone)
- Media asset selector (if media zone)

#### WidgetConfigPanel (`frontend/src/components/WidgetConfigPanel.jsx`)
- Widget-specific configuration
- Different configs per widget type
- Saves to zone.widgetConfig

#### MediaLibraryPanel (`frontend/src/components/MediaLibraryPanel.jsx`)
- Media asset browser
- Filter by type, property, zone
- Thumbnail grid
- Click to assign to zone

#### TemplateLivePreview (`frontend/src/components/TemplateLivePreview.jsx`)
- Modal with device frame previews
- Multiple device sizes (1920x1080, 3840x2160, etc.)
- Real-time template rendering
- Uses TemplateRenderer

#### TemplateRenderer (`frontend/src/components/TemplateRenderer.jsx`)
- Renders template with zones and widgets
- Handles media display
- Widget rendering
- Background color/image
- Used in preview and device player

#### BackgroundImagePicker (`frontend/src/components/BackgroundImagePicker.jsx`)
- Select background image from media library
- Color picker for solid colors
- Preview

#### LayerPanel (`frontend/src/components/LayerPanel.jsx`)
- List of all zones
- Z-index ordering
- Zone selection
- Lock/unlock zones
- Delete zones

#### CanvasToolbar (`frontend/src/components/CanvasToolbar.jsx`)
- Undo/redo buttons
- Zoom controls
- Grid toggle
- Snap toggle
- Clear canvas
- Save template

### Playlist Components

#### PlaylistPreview (`frontend/src/components/PlaylistPreview.jsx`)
- Preview playlist items
- Auto-advance simulation
- Transition effects
- Template rendering
- Media playback

### Media Components

#### MediaPlayer (`frontend/src/components/MediaPlayer.jsx`)
- Video player
- Image display
- Auto-play
- Loop support
- Duration tracking

### Utility Components

#### ColorPicker (`frontend/src/components/ColorPicker.jsx`)
- Color selection UI
- Hex input
- Preset colors

#### NumericInput (`frontend/src/components/NumericInput.jsx`)
- Number input with increment/decrement
- Min/max validation

#### ResizeHandles (`frontend/src/components/ResizeHandles.jsx`)
- Zone resize handles (8 directions)
- Drag to resize

#### ZoomControls (`frontend/src/components/ZoomControls.jsx`)
- Zoom in/out buttons
- Zoom level display
- Fit to screen

---

## Widgets

All widgets located in `frontend/src/components/widgets/`

### 1. Clock Widget (`ClockWidget.jsx`)
- Displays current time
- Config: timeFormat (12/24h), timezone, fontFamily, fontSize, color, showSeconds, showDate, dateFormat

### 2. Weather Widget (`WeatherWidget.jsx`)
- Displays weather information
- Config: location, units (metric/imperial), apiKey, updateInterval, showIcon, showTemperature, showDescription

### 3. Text Widget (`TextWidget.jsx`)
- Static or dynamic text
- Config: text, fontFamily, fontSize, color, alignment, fontWeight, textDecoration

### 4. QR Code Widget (`QRCodeWidget.jsx`)
- Generates QR code
- Config: data, size, errorCorrectionLevel, foregroundColor, backgroundColor

### 5. WebView Widget (`WebViewWidget.jsx`)
- Embeds web page
- Config: url, refreshInterval, allowScripts, sandbox

### 6. RSS Widget (`RSSWidget.jsx`)
- Displays RSS feed
- Config: feedUrl, updateInterval, maxItems, showImages, itemDuration

### 7. Social Media Widget (`SocialMediaWidget.jsx`)
- Displays social media feed
- Config: platform, accountId, apiKey, maxPosts, updateInterval

### 8. Chart Widget (`ChartWidget.jsx`)
- Displays charts (line, bar, pie)
- Config: chartType, dataSource, dataBinding, colors, labels

### 9. Image Gallery Widget (`ImageGalleryWidget.jsx`)
- Image slideshow
- Config: images[], transitionEffect, transitionDuration, autoAdvance, loop

### 10. Countdown Widget (`CountdownWidget.jsx`)
- Countdown timer
- Config: targetDate, format, showDays, showHours, showMinutes, showSeconds

### 11. HTML Widget (`HTMLWidget.jsx`)
- Custom HTML content
- Config: html, allowScripts, refreshInterval

### 12. Shape Widget (`ShapeWidget.jsx`)
- Geometric shapes
- Config: shapeType (rectangle, circle, triangle), fillColor, strokeColor, strokeWidth

**Widget Registration**:
- All widgets exported from `widgets/index.js`
- Widget configs stored in zone.widgetConfig (JSONB)
- Global widget settings in widget_settings table

---

## Real-time Features

### WebSocket Communication

**Connection**: `ws://localhost:3000/ws` (or `wss://` for production)

**Client → Server Messages**:
```json
// Device registration
{ "type": "register", "deviceId": "uuid" }

// Heartbeat
{ "type": "heartbeat" }

// Proof of play
{ "type": "proof_of_play", "screenshot": "base64", "contentId": "uuid" }
```

**Server → Client Messages**:
```json
// Registration confirmation
{ "type": "registered", "deviceId": "uuid" }

// Heartbeat acknowledgment
{ "type": "heartbeat_ack", "timestamp": 1234567890 }

// Command
{ "type": "command", "command": "screen_off", "timestamp": 1234567890 }
```

**Command Types**:
- `screen_on` - Turn screen on
- `screen_off` - Turn screen off
- `reboot` - Reboot device
- `update` - Update app
- `clear_cache` - Clear cache

**Implementation**:
- API Gateway intercepts `POST /api/devices/:id/commands`
- Broadcasts command via WebSocket to registered device
- Device player receives command and executes action
- Device updates status via heartbeat

---

## Authentication & Authorization

### JWT Token Structure
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "tenantId": "uuid",
  "role": "super_admin|property_admin|content_editor|viewer"
}
```

### Role Permissions

#### Super Admin
- Full access to all tenants, properties, zones, devices
- Can create/edit/delete properties and zones
- Can create/edit/delete users
- Can share content across properties
- Can send commands to any device

#### Property Admin
- Access to assigned properties only
- Can create/edit zones within assigned properties
- Can upload media to assigned properties (requires zoneId)
- Can create templates for assigned properties
- Can create playlists for assigned properties
- Can view/manage devices in assigned properties
- Cannot create/delete properties
- Cannot share content (super admin only)

#### Zone Admin
- Access to assigned zones only
- Can view media/templates in assigned zones
- Can create playlists for assigned zones
- Can view devices in assigned zones
- Cannot create/delete devices
- Cannot upload media (property admin or above)

#### Content Editor
- Same as property admin
- Focus on content creation

#### Viewer
- Read-only access
- Can view content, templates, playlists
- Cannot create/edit/delete anything
- Cannot upload media

### RBAC Implementation
- Middleware in each service validates JWT
- Queries filtered by user role and access assignments
- Property/zone access checked via `user_property_access` and `user_zone_access` tables
- Frontend hides UI elements based on role

---

## Deployment

### Docker Compose Configuration

**Services**:
1. **postgres** - PostgreSQL 16-alpine
   - Port: 5432
   - Database: digital_signage
   - User: postgres
   - Password: postgres
   - Volumes: schema.sql, migrations/

2. **redis** - Redis 7-alpine
   - Port: 6379

3. **rabbitmq** - RabbitMQ 3-management-alpine
   - Ports: 5672, 15672 (management)

4. **api-gateway** - API Gateway service
   - Ports: 3000, 3100 (WebSocket)

5. **auth-service** - Auth service
   - Port: 3001

6. **content-service** - Content service
   - Port: 3002
   - Volume: media_storage

7. **template-service** - Template service
   - Port: 3003

8. **scheduling-service** - Scheduling service
   - Port: 3004

9. **device-service** - Device service
   - Port: 3005

10. **frontend** - React frontend
    - Port: 5173
    - Environment: VITE_API_URL=http://localhost:3000

11. **media-processor** - Background worker
    - Volume: media_storage

### Environment Variables

**Common**:
- `NODE_ENV=development|production`
- `DATABASE_HOST=postgres` (Docker) or `localhost` (local)
- `DATABASE_PORT=5432`
- `DATABASE_NAME=digital_signage`
- `DATABASE_USER=postgres`
- `DATABASE_PASSWORD=postgres`
- `REDIS_HOST=redis`
- `RABBITMQ_HOST=rabbitmq`
- `JWT_SECRET=your-secret-key-change-in-production`
- `JWT_EXPIRY=24h`

**Content Service**:
- `AWS_ACCESS_KEY_ID` (optional, for S3)
- `AWS_SECRET_ACCESS_KEY` (optional)
- `AWS_REGION=us-east-1`
- `S3_BUCKET_NAME=digital-signage-media`
- `S3_CDN_URL` (optional)
- `UPLOAD_DIR=/app/storage` (Docker) or `./uploads` (local)

**API Gateway**:
- `CORS_ORIGIN=http://localhost:5173`
- `AUTH_SERVICE_URL=http://localhost:3001`
- `CONTENT_SERVICE_URL=http://localhost:3002`
- `TEMPLATE_SERVICE_URL=http://localhost:3003`
- `SCHEDULING_SERVICE_URL=http://localhost:3004`
- `DEVICE_SERVICE_URL=http://localhost:3005`

### Database Migrations

**Location**: `database/migrations/`

**Migration Files**:
- `add_device_is_playing.sql` - Adds is_playing column to devices
- `add_data_binding.sql` - Adds data binding support
- `add_template_categories_tags.sql` - Adds template categorization
- `add_template_sharing.sql` - Adds template sharing
- `add_template_variables.sql` - Adds template variables
- `add_template_versioning.sql` - Adds template versioning
- `add_widget_settings.sql` - Adds widget settings table
- `add_property_zone_content_isolation.sql` - Adds property/zone columns to media/templates

**Migration Script**: `database/migrations/run-migrations.sh`
- Runs automatically in Docker postgres container
- Executes all .sql files in migrations directory

### Startup Sequence

1. Start infrastructure: `docker-compose up postgres redis rabbitmq`
2. Wait for database to be ready
3. Run migrations (automatic in Docker)
4. Start services: `docker-compose up`
5. Frontend accessible at `http://localhost:5173`
6. API Gateway at `http://localhost:3000`

### Production Considerations

1. **Security**:
   - Change JWT_SECRET
   - Use HTTPS/WSS
   - Enable CORS for specific domains
   - Rate limiting
   - Input validation

2. **Scalability**:
   - Load balancer for API Gateway
   - Multiple service instances
   - Redis cluster
   - PostgreSQL replication
   - S3 for media storage

3. **Monitoring**:
   - Health check endpoints
   - Logging (Winston, Pino)
   - Metrics (Prometheus)
   - Error tracking (Sentry)

4. **Backup**:
   - Database backups
   - Media storage backups
   - Configuration backups

---

## API Endpoint Summary

### Auth Service (Port 3001)
- `POST /register`
- `POST /login`
- `POST /verify`
- `GET /profile`
- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`
- `GET /analytics/activity`

### Content Service (Port 3002)
- `POST /upload`
- `GET /assets`
- `DELETE /assets/:id`
- `POST /assets/:id/share`
- `DELETE /assets/:id/share`
- `POST /assets/:id/regenerate-thumbnail`

### Template Service (Port 3003)
- `GET /templates`
- `GET /templates/:id`
- `POST /templates`
- `PUT /templates/:id`
- `DELETE /templates/:id`
- `POST /templates/:id/duplicate`
- `POST /templates/:id/save-as`
- `GET /templates/:id/versions`
- `POST /templates/:id/versions`
- `POST /templates/:id/versions/:versionId/restore`
- `GET /settings/widgets`
- `PUT /settings/widgets/:key`
- `GET /templates/:id/analytics`

### Scheduling Service (Port 3004)
- `GET /playlists`
- `POST /playlists`
- `PUT /playlists/:id`
- `DELETE /playlists/:id`
- `GET /playlists/:id/items`
- `POST /playlists/:id/items`
- `PUT /playlists/:playlistId/items/:itemId`
- `DELETE /playlists/:playlistId/items/:itemId`
- `GET /schedules`
- `POST /schedules`
- `PUT /schedules/:id`
- `DELETE /schedules/:id`
- `GET /player/:deviceId/content`

### Device Service (Port 3005)
- `GET /devices`
- `POST /devices`
- `DELETE /devices/:id`
- `POST /devices/:id/heartbeat`
- `POST /devices/:id/commands`
- `GET /properties`
- `POST /properties`
- `PUT /properties/:id`
- `DELETE /properties/:id`
- `GET /zones`
- `POST /zones`
- `PUT /zones/:id`
- `DELETE /zones/:id`
- `POST /pairing/generate`
- `GET /pairing/status/:code`
- `POST /pairing/claim`
- `GET /analytics/dashboard-stats`

---

## Frontend API Client

**File**: `frontend/src/lib/api.js`

**Configuration**:
- Base URL: `VITE_API_URL` or `http://localhost:3000`
- All requests prefixed with `/api`
- JWT token added to Authorization header automatically
- 401 responses trigger logout and redirect to login

**Usage**:
```javascript
import api from '@/lib/api';

// GET request
const response = await api.get('/templates', { params: { tenantId } });

// POST request
const response = await api.post('/templates', templateData);

// File upload
const formData = new FormData();
formData.append('file', file);
formData.append('tenantId', tenantId);
const response = await api.post('/content/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

---

## State Management

**Store**: Zustand (`frontend/src/store/authStore.js`)

**Auth Store**:
```javascript
{
  token: string | null,
  user: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    role: string,
    tenantId: string
  } | null,
  setAuth: (token, user) => void,
  logout: () => void
}
```

**Storage**: localStorage key `auth-storage`

---

## Key Business Rules

1. **Content Isolation**:
   - Media and templates are assigned to property/zone
   - Users see only content in their assigned properties/zones
   - Super admins can see all content
   - Content can be shared across properties (super admin only)

2. **Device Assignment**:
   - Devices belong to zones
   - Devices inherit property from zone
   - Schedules assign playlists to devices
   - Multiple schedules can target same device (priority-based)

3. **Playlist Items**:
   - Can be media (image, video) or template
   - Each item has duration (seconds)
   - Items play sequentially
   - Transitions between items (fade, slide, cut)

4. **Schedule Logic**:
   - Date range: startDate <= current <= endDate (NULL = always)
   - Time range: startTime <= current <= endTime (handles midnight)
   - Days of week: Array of integers (0=Sunday)
   - Priority: Higher priority overrides lower
   - Active schedules only

5. **Device Status**:
   - Online: last_heartbeat < 2 minutes
   - Offline: last_heartbeat >= 2 minutes
   - is_playing: Updated via heartbeat and WebSocket commands

6. **Template Zones**:
   - Zones are positioned absolutely (x, y, width, height)
   - Z-index determines layering
   - Zones can be locked (HQ mode)
   - Zones can contain media or widgets

---

## Testing Considerations

1. **Unit Tests**:
   - Service endpoints
   - RBAC middleware
   - Database queries
   - Widget rendering

2. **Integration Tests**:
   - API Gateway routing
   - Service communication
   - Database transactions
   - WebSocket communication

3. **E2E Tests**:
   - User workflows
   - Template creation
   - Playlist creation
   - Schedule assignment
   - Device pairing

---

## Future Enhancements (Not in Current Implementation)

1. Emergency alerts system
2. Proof of play screenshots
3. Advanced analytics and reporting
4. Multi-language support
5. Template marketplace
6. Mobile app for device management
7. Advanced scheduling (recurrence patterns)
8. Content approval workflows
9. A/B testing for content
10. Social media integration
11. Live data feeds (RSS, APIs)
12. Interactive touch screen support

---

## Notes for AI Development

1. **No UI Design/Theme**: The AI should implement its own modern, responsive UI theme. Focus on functionality, not specific design.

2. **Docker First**: All services should run in Docker containers. Use docker-compose.yml as reference.

3. **Database Schema**: Use schema.sql as the source of truth. All tables use UUID primary keys.

4. **API Consistency**: All services follow RESTful conventions. Use JWT for authentication. Return JSON.

5. **Error Handling**: All endpoints should have proper error handling and return appropriate HTTP status codes.

6. **RBAC**: Implement role-based access control consistently across all services. Filter data based on user role and access assignments.

7. **Real-time**: WebSocket server in API Gateway. Devices register and receive commands via WebSocket.

8. **File Uploads**: Use multipart/form-data. Support both local storage and S3. Generate thumbnails for images and videos.

9. **Template Zones**: Zones are stored as JSONB array in templates table. Each zone has position, size, content type, and configuration.

10. **Widget System**: Widgets are React components. Configuration stored in zone.widgetConfig. Global settings in widget_settings table.

---

**End of FRS Document**
