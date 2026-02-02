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

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : ['http://localhost:5173'];
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));


// Body parsing - MUST skip for multipart/form-data to allow file uploads
// Create parsers but apply conditionally
const jsonParser = express.json({ limit: '200mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '200mb' });

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
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Service unavailable' });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    const contentType = req.headers['content-type'] || '';

    // CRITICAL: Forward Authorization header for all requests
    if (req.headers['authorization']) {
      proxyReq.setHeader('Authorization', req.headers['authorization']);
    }

    // For multipart/form-data, don't touch anything - let it stream naturally
    if (contentType.includes('multipart/form-data')) {
      console.log('[Gateway] Multipart request detected, streaming through untouched');
      // Don't modify anything - let http-proxy-middleware handle streaming
      // The request body will be piped automatically
      return;
    }

    // For JSON requests, rewrite the body (only if body was parsed)
    if (req.body && Object.keys(req.body).length > 0 && typeof req.body === 'object') {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }

    // BROADCAST LOGIC: If this is a command request, broadcast it via WebSocket
    const requestPath = req.url || req.path || '';
    if (req.method === 'POST' && requestPath.includes('/commands')) {
      console.log(`[Gateway] Intercepted potential command. Path: ${requestPath}, Method: ${req.method}`);
      console.log(`[Gateway] Body:`, JSON.stringify(req.body));

      // Match both /api/devices/:id/commands and /devices/:id/commands (after path rewrite)
      // Also handle /devices/devices/:id/commands (legacy path)
      const match = requestPath.match(/\/(?:api\/)?devices(?:\/devices)?\/([^/]+)\/commands/);
      const deviceId = match ? match[1] : null;
      const { commandType } = req.body || {};

      console.log(`[Gateway] Match Result: ${match ? 'Match found' : 'No match'}`);
      console.log(`[Gateway] Extracted DeviceID: ${deviceId}, CommandType: ${commandType}`);
      console.log(`[Gateway] Connected devices:`, Array.from(clients.keys()));

      if (deviceId && commandType) {
        // Use setTimeout to ensure the command is sent after the response
        setTimeout(() => {
          const sent = sendToDevice(deviceId, {
            type: 'command',
            command: commandType,
            timestamp: Date.now()
          });
          console.log(`[Gateway] Broadcast status for ${deviceId}: ${sent ? 'SUCCESS' : 'FAILED (Device not connected via WS)'}`);
          if (!sent) {
            console.log(`[Gateway] Device ${deviceId} is not connected. Available devices:`, Array.from(clients.keys()));
          }
        }, 100);
      } else {
        console.log(`[Gateway] Skipping broadcast: Missing deviceId (${deviceId}) or commandType (${commandType})`);
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

    // CRITICAL: Forward ALL headers including Authorization for authentication
    // Copy all headers from original request to proxy request
    Object.keys(req.headers).forEach(key => {
      const value = req.headers[key];
      if (value && typeof value === 'string') {
        proxyReq.setHeader(key, value);
      } else if (Array.isArray(value)) {
        proxyReq.setHeader(key, value.join(', '));
      }
    });

    // For multipart/form-data, don't write anything - let proxy pipe the stream
    if (contentType.includes('multipart/form-data')) {
      console.log('[Gateway] Multipart upload - preserving headers, streaming body');
      console.log('[Gateway] Authorization header present:', !!req.headers['authorization']);
      // Don't write body - the proxy will pipe req to proxyReq automatically
      // Just return and let the proxy handle streaming
      return;
    }

    // For JSON requests, rewrite the body
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

// WebSocket Server for real-time communication
const wss = new WebSocket.Server({
  server,
  path: '/ws'
});

const clients = new Map(); // deviceId -> WebSocket connection

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  let deviceId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle device registration
      if (data.type === 'register' && data.deviceId) {
        deviceId = data.deviceId;
        clients.set(deviceId, ws);
        console.log(`Device registered: ${deviceId}`);
        ws.send(JSON.stringify({ type: 'registered', deviceId }));
      }

      // Handle heartbeat
      if (data.type === 'heartbeat') {
        ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
      }

      // Handle proof of play
      if (data.type === 'proof_of_play') {
        console.log(`Proof of play received from ${deviceId}`);
        // Forward to device service for processing
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
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

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

// Export broadcast functions for use by other services
app.locals.sendToDevice = sendToDevice;
app.locals.broadcastToAll = broadcastToAll;

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
