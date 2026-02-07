# Functional Requirements Specification (FRS): Digital Signage Platform

## 1. Introduction
This document outlines the functional requirements for a comprehensive, multi-tenant Digital Signage CMS. The system is designed to manage high-definition content across geographically distributed display devices. 

**Deployment Model:** Containerized microservices (Docker).
**Core Objective:** Enable users to design complex, multi-zone layouts (Templates) and schedule them for playback on remote hardware (Players).

---

## 2. System Architecture
The system follows a microservices architecture to ensure scalability and fault tolerance.

### 2.1 Backend Microservices
1.  **API Gateway:**
    *   Single entry point for the frontend.
    *   Handles request routing, rate limiting, and centralized logging.
2.  **Auth Service:**
    *   Manages user accounts, authentication (JWT), and Role-Based Access Control (RBAC).
    *   Handles Organization and Tenant assignments.
3.  **Content Service:**
    *   Handles media asset uploads (Image, Video).
    *   Manages cloud or local storage integration (S3/Minio).
    *   Generates thumbnails and extracts metadata.
4.  **Template Service:**
    *   Manages the storage and retrieval of Template JSON structures.
    *   Handles Widget configuration data.
5.  **Device Service:**
    *   Tracks device registration, heartbeats, and online/offline status.
    *   Facilitates remote commands (Reboot, Screenshot, Refresh).
6.  **Scheduling Service:**
    *   Manages the calendar logic for content distribution.
    *   Calculates active content based on time, date, and priority rules.

### 2.2 Frontend Application
*   A Single Page Application (SPA) built for modern web browsers.
*   State management for real-time updates (e.g., Device status).
*   Interactive WYSIWYG Template Designer.

---

## 3. Detailed Module Breakdown

### 3.1 Authentication & Multi-Tenancy
*   **Tenant Separation:** Complete data isolation between Organizations.
*   **Roles:** Admin (Full access), Editor (Content management), Viewer (Dashboard only).
*   **Functionality:**
    *   User registration and secure login.
    *   Invite users to an Organization with specific roles.
    *   Profile and password management.

### 3.2 Organization Hierarchy
*   **Structure:** Organization -> Property (e.g., Office Building) -> Site (e.g., Lobby, Floor 1).
*   **Functionality:**
    *   Manage physical locations hierarchically.
    *   Group devices by site for batch scheduling.

### 3.3 Media Library
*   **Asset Support:** Images (JPG, PNG, WebP), Videos (MP4, WebM).
*   **Functionality:**
    *   Drag-and-drop file upload.
    *   Progressive loading and search/filter.
    *   Asset attribution (Resolution, Duration, Size).
    *   Content validation (checking for corrupted files).

### 3.4 Template Designer (WYSIWYG)
*   **Canvas Management:**
    *   Define resolution (1080p, 4K, Portrait/Landscape).
    *   Grid system and snap-to-grid functionality.
    *   Undo/Redo capabilities for designer actions.
*   **Zone Interaction:**
    *   Drag, resize, and position multiple "Zones" on the canvas.
    *   Layering (Z-index management).
    *   "Fill Canvas" shortcut to scale a zone to the background.
*   **Widget Library:**
    *   **Media Player:** Plays selected media from the library in a loop.
    *   **Clock:** Time display with customizable fonts, colors, and timezones.
    *   **RSS Feed:** Real-time news ticker with scrolling frequency control.
    *   **Weather:** Current conditions and forecast based on location.
    *   **HTML/WebView:** Embed secure external web content or raw HTML blocks.
    *   **QR Code:** Dynamic generation for "Scan-to-Mobile" interactions.
    *   **Countdown:** Timer for events/product launches.
    *   **Social Media:** Aggregated feeds (placeholder for API hooks).

### 3.5 Playlists
*   **Sequence Management:** Combine multiple templates or raw media files into a timed sequence.
*   **Functionality:**
    *   Set custom duration for each item.
    *   Visual timeline of the playback loop.
    *   Preview the entire sequence before publishing.

### 3.6 Content Scheduler
*   **Event Types:** Simple loop, Scheduled Event, Overlay/Priority content.
*   **Logic:**
    *   **Dayparting:** Schedule content for specific hours (e.g., Breakfast menu).
    *   **Recurrence:** Daily, Weekly, or Monthly rules.
    *   **Conflict Resolution:** Higher priority schedules override standard loops.

### 3.7 Device Management
*   **Provisioning:** Pairing code workflow for new devices.
*   **Monitoring:**
    *   Live "Health" status (CPU, Memory, Storage).
    *   Current playback status (What's playing now?).
    *   Remote screenshot to verify display output visually.
*   **Firmware/Software Updates:** Version tracking for remote players.

### 3.8 Device Player (The Playback Engine)
*   **Technology:** Chromium-based playback environment.
*   **Features:**
    *   **Offline Cache:** Downloads all assets locally; continues playing if internet drops.
    *   **Auto-Update:** Synchronizes with the CMS via WebSockets or polling.
    *   **Boot to App:** Launches automatically on device startup.

---

## 4. Data Models & Relationships
*   **Organization:** `id, name, settings, createdAt`.
*   **Property/Site:** `id, organizationId, parentId, name, locationData`.
*   **MediaAsset:** `id, organizationId, url, type, metadata, size`.
*   **Template:** `id, organizationId, name, resolution, zones (JSON)`.
*   **Device:** `id, pairingCode, siteId, lastSeen, status, currentConfig`.
*   **Schedule:** `id, targetId (Device/Site), playlistId, startTime, endTime, cronExpression`.

---

## 5. Non-Functional Requirements
1.  **Security:** HTTPS everywhere, JWT for API calls, Sanitize HTML widget inputs.
2.  **Performance:** Optimized media delivery (CDN ready), Efficient JSON payloads for device configs.
3.  **Reliability:** The Player must be resilient to network failures.
4.  **Scalability:** Microservices should be stateless to allow horizontal scaling via Docker Swarm/Kubernetes.

---

## 6. API Guidelines
*   **RESTful endpoints** for all CRUD operations.
*   **WebSockets** (Socket.io) for real-time device heartbeats and remote commands.
*   **Standardized Error Responses:** `{ error: string, code: number }`.
