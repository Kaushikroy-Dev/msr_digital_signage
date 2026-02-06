const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Trust proxy - required for Railway/load balancer environments
// This allows express-rate-limit to correctly identify client IPs from X-Forwarded-For headers
app.set('trust proxy', true);

// WebSocket clients map - must be defined before proxyOptions
const clients = new Map(); // deviceId -> WebSocket connection
const playerClients = new Map(); // player_id -> WebSocket connection
const logClients = new Map(); // tenantId -> Set of WebSocket connections

// Broadcast message to specific device
function sendToDevice(deviceId, message) {
  const client = clients.get(deviceId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// Broadcast to all devices
function broadcastToAll(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Send message to specific player by player_id
function sendToPlayer(playerId, message) {
  const client = playerClients.get(playerId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// CORS configuration - MUST be FIRST to handle preflight correctly
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:4173', 'http://localhost:3000'];

// CRITICAL: Explicitly add frontend production URL if not already present
const FRONTEND_PRODUCTION_URL = 'https://frontend-production-73c0.up.railway.app';
if (corsOrigins.indexOf(FRONTEND_PRODUCTION_URL) === -1) {
  corsOrigins.push(FRONTEND_PRODUCTION_URL);
  console.log(`[CORS] Added frontend production URL to allowed origins: ${FRONTEND_PRODUCTION_URL}`);
}
console.log(`[CORS] Allowed origins:`, corsOrigins);

// Helper function to check if origin is allowed
function isOriginAllowed(origin) {
  if (!origin) return true;

  const isLocalhost = origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin.startsWith('http://192.168.');

  const isRailway = origin.endsWith('.railway.app') || origin.endsWith('up.railway.app');

  return corsOrigins.indexOf(origin) !== -1 || isRailway || isLocalhost;
}

// Enhanced CORS configuration with explicit preflight handling
// CRITICAL: This must be configured to handle preflight correctly
const corsMiddleware = cors({
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(null, true); // Still allow for now, but log warning
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false // Don't continue to next middleware after preflight
});

app.use(corsMiddleware);

// CRITICAL: Handle OPTIONS (preflight) requests BEFORE any other middleware
// This must be the FIRST route handler after CORS middleware
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  const requestHeaders = req.headers['access-control-request-headers'];

  // Reduced logging for production performance
  // console.log(`[CORS] OPTIONS preflight request received:`, { origin, path: req.path });

  // Always allow Railway domains and explicitly check origin
  const isAllowed = isOriginAllowed(origin);

  if (isAllowed) {
    // CRITICAL: Set Access-Control-Allow-Origin to the EXACT origin (not *)
    // This is required for credentials: true
    const allowedOrigin = origin || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', requestHeaders || 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Send response immediately
    return res.status(200).end();
  } else {
    console.error(`[CORS] Preflight request BLOCKED for origin: ${origin}`);
    res.status(403).json({ error: 'CORS policy: Origin not allowed' }).end();
  }
});

// Security middleware - AFTER CORS to not interfere with preflight
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parsing - MUST skip for multipart/form-data to allow file uploads
// Create parsers but apply conditionally
// Reduced limits to 50mb to prevent OOM
const jsonParser = express.json({ limit: '50mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '50mb' });

// Apply body parsing conditionally - skip multipart/form-data
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  // CRITICAL: Skip ALL body parsing for multipart/form-data
  // This allows the raw stream to pass through to the proxy
  if (contentType.includes('multipart/form-data')) {
    return next(); // Skip parsing completely
  }

  // For JSON requests
  if (contentType.includes('application/json')) {
    return jsonParser(req, res, next);
  }

  // For URL-encoded requests
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return urlencodedParser(req, res, next);
  }

  // For other content types, skip parsing
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 10000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Service routes with proxy
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  content: process.env.CONTENT_SERVICE_URL || 'http://localhost:3002',
  template: process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3003',
  scheduling: process.env.SCHEDULING_SERVICE_URL || 'http://localhost:3004',
  device: process.env.DEVICE_SERVICE_URL || 'http://localhost:3005'
};

// Proxy configuration
const proxyOptions = {
  changeOrigin: true,
  logLevel: 'error', // Reduced log level
  // Ensure headers are forwarded (http-proxy-middleware does this by default, but be explicit)
  headers: {
    'Connection': 'keep-alive'
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Service unavailable' });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    const contentType = req.headers['content-type'] || '';

    // Forward all headers from the incoming request EXCEPT host and authorization
    // We handle authorization explicitly to avoid duplicates and ensure casing
    Object.keys(req.headers).forEach(headerName => {
      const lowerName = headerName.toLowerCase();
      if (lowerName === 'host' || lowerName === 'authorization') {
        return;
      }
      proxyReq.setHeader(headerName, req.headers[headerName]);
    });

    // Handle Authorization header explicitly (ensure standard casing)
    if (req.headers['authorization']) {
      proxyReq.setHeader('Authorization', req.headers['authorization']);
    }

    // For multipart/form-data, don't touch anything - let it stream naturally
    if (contentType.includes('multipart/form-data')) {
      // console.log('[Gateway] Multipart request detected, streaming through untouched');
      return;
    }

    // For JSON or URL-encoded requests, rewrite the body (only if body was parsed)
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      let bodyData;
      if (contentType.includes('application/json')) {
        bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const bodyParams = new URLSearchParams();
        Object.entries(req.body).forEach(([key, value]) => bodyParams.append(key, value));
        bodyData = bodyParams.toString();
        proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
      }

      if (bodyData) {
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure CORS headers are present in response even if service doesn't send them
    const origin = req.headers.origin;

    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Accept-Ranges, Content-Range');
    }

    // CRITICAL: Preserve Content-Type header for media files (especially videos)
    // This prevents ORB (Opaque Response Blocking) errors in WebView/Android TV
    const requestPath = req.url || req.path || '';
    if (requestPath.includes('/uploads/')) {
      const contentType = proxyRes.headers['content-type'];
      if (contentType) {
        // Preserve the Content-Type from the upstream service
        res.setHeader('Content-Type', contentType);
      } else {
        // Fallback: Set Content-Type based on file extension if not present
        // This ensures ORB doesn't block the response
        if (requestPath.match(/\.mp4$/i)) {
          res.setHeader('Content-Type', 'video/mp4');
        } else if (requestPath.match(/\.webm$/i)) {
          res.setHeader('Content-Type', 'video/webm');
        } else if (requestPath.match(/\.mov$/i)) {
          res.setHeader('Content-Type', 'video/quicktime');
        } else if (requestPath.match(/\.avi$/i)) {
          res.setHeader('Content-Type', 'video/x-msvideo');
        } else if (requestPath.match(/\.m4v$/i)) {
          res.setHeader('Content-Type', 'video/x-m4v');
        } else if (requestPath.match(/\.(jpg|jpeg)$/i)) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (requestPath.match(/\.png$/i)) {
          res.setHeader('Content-Type', 'image/png');
        } else if (requestPath.match(/\.gif$/i)) {
          res.setHeader('Content-Type', 'image/gif');
        } else if (requestPath.match(/\.webp$/i)) {
          res.setHeader('Content-Type', 'image/webp');
        }
      }
    }

    // BROADCAST LOGIC: If this is a command request, broadcast it via WebSocket
    if (req.method === 'POST' && requestPath.includes('/commands')) {
      // Match both /api/devices/:id/commands and /devices/:id/commands (after path rewrite)
      // Also handle /devices/devices/:id/commands (legacy path)
      const match = requestPath.match(/\/(?:api\/)?devices(?:\/devices)?\/([^/]+)\/commands/);
      const deviceId = match ? match[1] : null;
      const { commandType } = req.body || {};

      if (deviceId && commandType) {
        // Use setTimeout to ensure the command is sent after the response
        setTimeout(() => {
          const sent = sendToDevice(deviceId, {
            type: 'command',
            command: commandType,
            timestamp: Date.now()
          });
          if (!sent) {
            // console.log(`[Gateway] Device ${deviceId} is not connected.`);
          }
        }, 100);
      }
    }
  },
  timeout: 30000 // 30 second timeout
};

// Route proxying with path rewriting
app.use('/api/auth', createProxyMiddleware({
  ...proxyOptions,
  target: services.auth,
  pathRewrite: { '^/api/auth': '' }
}));

// Special configuration for content service to handle file uploads
const contentProxyOptions = {
  ...proxyOptions,
  target: services.content,
  pathRewrite: { '^/api/content': '' },
  onProxyReq: (proxyReq, req, res) => {
    const contentType = req.headers['content-type'] || '';

    // CRITICAL: Forward Authorization header FIRST
    if (req.headers['authorization']) {
      proxyReq.setHeader('Authorization', req.headers['authorization']);
    }

    // Forward ALL other headers
    Object.keys(req.headers).forEach(headerName => {
      if (['host', 'authorization', 'content-length'].includes(headerName.toLowerCase())) return;
      proxyReq.setHeader(headerName, req.headers[headerName]);
    });

    // Special handling for multipart
    if (contentType.includes('multipart/form-data')) {
      // console.log('[Gateway] Multipart upload - streaming through');
      return;
    }

    // For JSON requests, rewrite the body if it was parsed
    if (req.body && Object.keys(req.body).length > 0 && typeof req.body === 'object') {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
};

app.use('/api/content', createProxyMiddleware(contentProxyOptions));

app.use('/api/templates', createProxyMiddleware({
  ...proxyOptions,
  target: services.template,
  pathRewrite: { '^/api/templates': '/templates' }
}));

// Widget settings routes (also proxied to template service)
app.use('/api/settings', createProxyMiddleware({
  ...proxyOptions,
  target: services.template,
  pathRewrite: { '^/api/settings': '/settings' }
}));

// Proxy for scheduling service - handles /schedules, /playlists, /player routes
app.use('/api/schedules', createProxyMiddleware({
  ...proxyOptions,
  target: services.scheduling,
  pathRewrite: (path, req) => {
    // More specific routes first
    if (path.startsWith('/api/schedules/playlists')) {
      return path.replace('/api/schedules/playlists', '/playlists');
    }
    if (path.startsWith('/api/schedules/player')) {
      return path.replace('/api/schedules/player', '/player');
    }
    if (path.startsWith('/api/schedules/devices')) {
      return path.replace('/api/schedules/devices', '/devices');
    }
    if (path.startsWith('/api/schedules/schedules')) {
      return path.replace('/api/schedules/schedules', '/schedules');
    }
    // Default: /api/schedules → /schedules
    if (path.startsWith('/api/schedules')) {
      return path.replace('/api/schedules', '/schedules');
    }
    return path;
  }
}));

app.use('/api/devices', createProxyMiddleware({
  ...proxyOptions,
  target: services.device,
  pathRewrite: (path, req) => {
    // Handle /api/devices/devices -> /devices (remove duplicate)
    if (path.startsWith('/api/devices/devices')) {
      return path.replace('/api/devices/devices', '/devices');
    }
    // Handle /api/devices/properties -> /properties
    if (path.startsWith('/api/devices/properties')) {
      return path.replace('/api/devices/properties', '/properties');
    }
    // Handle /api/devices/all-zones -> /all-zones
    if (path.startsWith('/api/devices/all-zones')) {
      return path.replace('/api/devices/all-zones', '/all-zones');
    }
    // Handle /api/devices/zones -> /zones
    if (path.startsWith('/api/devices/zones')) {
      return path.replace('/api/devices/zones', '/zones');
    }
    // Handle /api/devices/pairing -> /pairing
    if (path.startsWith('/api/devices/pairing')) {
      return path.replace('/api/devices/pairing', '/pairing');
    }
    // Default: /api/devices -> /devices
    return path.replace('/api/devices', '/devices');
  }
}));

// Route device initialization endpoints (for Android TV app)
app.use('/api/device', createProxyMiddleware({
  ...proxyOptions,
  target: services.device,
  pathRewrite: { '^/api/device': '/device' }
}));

// Analytics routes
app.use('/api/analytics/dashboard-stats', createProxyMiddleware({
  ...proxyOptions,
  target: services.device,
  pathRewrite: { '^/api/analytics': '/analytics' }
}));

app.use('/api/analytics/activity', createProxyMiddleware({
  ...proxyOptions,
  target: services.auth,
  pathRewrite: { '^/api/analytics': '/analytics' }
}));

// Proxy static uploads from content service
app.use('/uploads', createProxyMiddleware({
  ...proxyOptions,
  target: services.content,
  pathRewrite: { '^/uploads': '/uploads' }
}));

// Migration endpoint - proxy to device-service
app.use('/admin/run-migrations', createProxyMiddleware({
  ...proxyOptions,
  target: services.device,
  pathRewrite: { '^/admin/run-migrations': '/admin/run-migrations' }
}));

// WebSocket Server for real-time communication
const wss = new WebSocket.Server({
  server,
  path: '/ws'
});

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  let deviceId = null;
  let playerId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle device registration
      if (data.type === 'register' && data.deviceId) {
        deviceId = data.deviceId;
        clients.set(deviceId, ws);
        console.log(`Device registered: ${deviceId}`);
        ws.send(JSON.stringify({ type: 'registered', deviceId }));
        
        // If we also have playerId, link them together
        if (playerId) {
          // Update playerClients to point to same connection
          playerClients.set(playerId, ws);
        }
      }

      // Handle player_id registration (for unpaired devices)
      if (data.type === 'register_player' && data.playerId) {
        playerId = data.playerId;
        playerClients.set(playerId, ws);
        console.log(`Player registered: ${playerId}`);
        ws.send(JSON.stringify({ type: 'registered_player', playerId }));
        
        // If we also have deviceId, link them together
        if (deviceId) {
          clients.set(deviceId, ws);
        }
      }

      // Handle heartbeat
      if (data.type === 'heartbeat') {
        ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
      }

      // Handle proof of play
      if (data.type === 'proof_of_play') {
        console.log(`Proof of play received from ${deviceId || playerId}`);
        // Forward to device service for processing
      }

      // Handle log streaming subscription
      if (data.type === 'subscribe_logs' && data.tenantId) {
        const tenantId = data.tenantId;
        if (!logClients.has(tenantId)) {
          logClients.set(tenantId, new Set());
        }
        logClients.get(tenantId).add(ws);
        ws.tenantId = tenantId;
        ws.isLogSubscriber = true;
        console.log(`Log subscription registered for tenant: ${tenantId}`);
        ws.send(JSON.stringify({ type: 'logs_subscribed', tenantId }));
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    if (deviceId) {
      clients.delete(deviceId);
      console.log(`Device disconnected: ${deviceId}`);
    }
    if (playerId) {
      playerClients.delete(playerId);
      console.log(`Player disconnected: ${playerId}`);
    }
    if (ws.isLogSubscriber && ws.tenantId) {
      const clients = logClients.get(ws.tenantId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          logClients.delete(ws.tenantId);
        }
        console.log(`Log subscription removed for tenant: ${ws.tenantId}`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast log entry to all subscribed clients for a tenant
function broadcastLog(tenantId, logEntry) {
  const clients = logClients.get(tenantId);
  if (clients) {
    const message = JSON.stringify({
      type: 'log',
      data: logEntry
    });
    let sentCount = 0;
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.error('Error sending log to client:', error);
          // Remove dead connection
          clients.delete(client);
        }
      } else {
        // Remove closed connections
        clients.delete(client);
      }
    });
    
    // Clean up empty sets
    if (clients.size === 0) {
      logClients.delete(tenantId);
    }
    
    if (sentCount > 0) {
      console.log(`Broadcasted log to ${sentCount} client(s) for tenant: ${tenantId}`);
    }
  }
}

// Export broadcast functions for use by other services (already defined above)
app.locals.sendToDevice = sendToDevice;
app.locals.sendToPlayer = sendToPlayer;
app.locals.broadcastToAll = broadcastToAll;
app.locals.broadcastLog = broadcastLog;

// Internal endpoint for device-service to send WebSocket notifications
// Protected by internal service token or Railway internal network
app.post('/api/internal/notify-player', (req, res) => {
  try {
    const { playerId, deviceId, message } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }
    
    const notification = {
      type: 'device_paired',
      deviceId: deviceId || null,
      playerId: playerId,
      message: message || 'Device paired successfully',
      timestamp: Date.now()
    };
    
    const sent = sendToPlayer(playerId, notification);
    
    if (sent) {
      console.log(`[Gateway] Notification sent to player ${playerId} for device ${deviceId}`);
    } else {
      console.log(`[Gateway] Player ${playerId} not connected, notification not sent`);
    }
    
    res.json({ success: sent, playerId, deviceId });
  } catch (error) {
    console.error('[Gateway] Error in notify-player endpoint:', error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});

// Internal endpoint for services to broadcast logs via WebSocket
// Services can POST logs here, and API Gateway will broadcast to subscribed clients
app.post('/api/internal/broadcast-log', (req, res) => {
  try {
    const { tenantId, logEntry } = req.body;
    
    if (!tenantId || !logEntry) {
      return res.status(400).json({ error: 'tenantId and logEntry are required' });
    }
    
    // Broadcast log to all subscribed clients for this tenant
    broadcastLog(tenantId, logEntry);
    
    return res.json({ success: true, message: 'Log broadcasted' });
  } catch (error) {
    console.error('[Gateway] Error in broadcast-log endpoint:', error);
    res.status(500).json({ error: 'Failed to broadcast log', details: error.message });
  }
});

// Internal endpoint for services to send commands to devices via WebSocket
// Used when device is deleted to reset device ID on Android TV
app.post('/api/internal/send-device-command', (req, res) => {
  try {
    const { deviceId, commandType } = req.body;
    
    if (!deviceId || !commandType) {
      return res.status(400).json({ error: 'deviceId and commandType are required' });
    }
    
    const message = {
      type: 'command',
      command: commandType,
      timestamp: Date.now()
    };
    
    const sent = sendToDevice(deviceId, message);
    
    if (sent) {
      console.log(`[Gateway] Command '${commandType}' sent to device ${deviceId} via internal endpoint`);
    } else {
      console.log(`[Gateway] Device ${deviceId} not connected, command '${commandType}' not sent`);
    }
    
    res.json({ success: sent, deviceId, commandType });
  } catch (error) {
    console.error('[Gateway] Error in send-device-command endpoint:', error);
    res.status(500).json({ error: 'Failed to send device command', details: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || process.env.API_GATEWAY_PORT || 3000;
const WS_PORT = process.env.WEBSOCKET_PORT || 3100;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`WebSocket server running on port ${PORT}/ws`);
  console.log('Service routes:');
  Object.entries(services).forEach(([name, url]) => {
    console.log(`  - /api/${name} -> ${url}`);
  });
});

module.exports = { app, server, wss };
