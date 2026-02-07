# Digital Signage Cloud Portal

Enterprise-grade cloud digital signage platform with multi-tenant support, advanced content management, and remote device monitoring.

## 🚀 Features

### Core Capabilities
- **Multi-Tenant Architecture**: Hierarchical organization structure (Tenant → Region → Property → Zone → Device)
- **Content Management**: Upload and manage images, videos, PDFs, and PowerPoint presentations
- **Template Engine**: WYSIWYG designer with drag-and-drop zones and widgets
- **Advanced Scheduling**: Day-parting, recurring schedules, and validity dates
- **Device Management**: Real-time monitoring, heartbeat tracking, and remote control
- **Emergency Alerts**: CAP protocol integration for instant content interruption
- **Role-Based Access Control**: 4 user roles (Super Admin, Property Admin, Content Editor, Viewer)

### Technology Stack
- **Backend**: Node.js microservices (Express)
- **Frontend**: React 18 + Vite
- **Database**: PostgreSQL 16
- **Cache**: Redis
- **Message Queue**: RabbitMQ
- **Storage**: AWS S3 / Azure Blob Storage
- **Real-time**: WebSocket for device communication

## 📋 Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis (or use Docker)
- AWS S3 account (or Azure Blob Storage)

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd "Digital Signedge"
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Install dependencies
```bash
npm install
```

### 4. Start with Docker Compose (Recommended)
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- RabbitMQ message queue
- All microservices (API Gateway, Auth, Content, Template, Scheduling, Device)
- Frontend React application

### 5. Access the application
- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

## 🏗️ Project Structure

```
Digital Signedge/
├── services/
│   ├── api-gateway/          # API Gateway & WebSocket server
│   ├── auth-service/         # Authentication & RBAC
│   ├── content-service/      # Media upload & management
│   ├── template-service/     # Template engine
│   ├── scheduling-service/   # Playlist & schedule management
│   └── device-service/       # Device monitoring & control
├── frontend/                 # React frontend application
├── workers/
│   ├── media-processor/      # Background media processing
│   └── content-sync/         # Content synchronization
├── database/
│   └── schema.sql           # PostgreSQL database schema
├── docker-compose.yml       # Docker orchestration
└── package.json            # Root package.json (monorepo)
```

## 🔧 Development

### Run services individually

#### Backend Services
```bash
# API Gateway
cd services/api-gateway && npm run dev

# Auth Service
cd services/auth-service && npm run dev

# Content Service
cd services/content-service && npm run dev
```

#### Frontend
```bash
cd frontend && npm run dev
```

### Database Setup
```bash
# Create database
createdb digital_signage

# Run schema
psql digital_signage < database/schema.sql
```

## 📊 Database Schema

The platform uses a comprehensive PostgreSQL schema with:
- **Organization Hierarchy**: tenants, regions, properties, zones, devices
- **Content Management**: media_assets, templates, template_zones
- **Scheduling**: playlists, playlist_items, schedules, schedule_devices
- **Device Monitoring**: device_heartbeats, proof_of_play, device_commands
- **Security**: users, user_property_access, audit_logs
- **Emergency**: emergency_alerts, emergency_alert_devices

## 🔐 Authentication

The platform uses JWT-based authentication with role-based access control:

- **Super Admin**: Full access to all properties and global settings
- **Property Admin**: Access to specific properties only
- **Content Editor**: Can create/edit content but cannot publish
- **Viewer**: Read-only access

## 🎨 Frontend Features

### Implemented
- ✅ Login & Authentication
- ✅ Dashboard with stats and activity
- ✅ Media Library with drag-and-drop upload
- ✅ Responsive sidebar navigation
- ✅ Modern UI with gradient design

### Coming Soon
- 🔄 Template Designer (WYSIWYG)
- 🔄 Playlist Manager
- 🔄 Advanced Scheduler
- 🔄 Device Monitoring Dashboard
- 🔄 Organization Hierarchy Manager

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/verify` - Verify token
- `GET /api/auth/profile` - Get user profile

### Content Management
- `POST /api/content/upload` - Upload media
- `GET /api/content/assets` - Get media assets
- `DELETE /api/content/assets/:id` - Delete asset

### WebSocket
- `ws://localhost:3000/ws` - Real-time device communication

## 🚢 Deployment

### Production Build
```bash
# Build all services
npm run build

# Build frontend only
cd frontend && npm run build
```

### Environment Variables
See `.env.example` for all required environment variables.

## 📝 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private enterprise project. Contact the development team for contribution guidelines.

## 📧 Support

For support, email: support@digitalsignage.com

---

**Version**: 1.0.0  
**Last Updated**: January 2026
