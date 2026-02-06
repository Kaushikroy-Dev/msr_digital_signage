/**
 * Audit Logging Middleware
 * Logs all user activities to audit_logs table and broadcasts via WebSocket
 */

const http = require('http');
const https = require('https');

function getResourceType(path) {
  if (path.includes('/media') || path.includes('/assets')) return 'media';
  if (path.includes('/templates')) return 'template';
  if (path.includes('/playlists')) return 'playlist';
  if (path.includes('/schedules')) return 'schedule';
  if (path.includes('/devices')) return 'device';
  if (path.includes('/users')) return 'user';
  if (path.includes('/properties') || path.includes('/zones')) return 'property';
  if (path.includes('/auth') || path.includes('/login')) return 'auth';
  return 'other';
}

function shouldSkipLogging(path, method) {
  // Skip GET requests (except important ones)
  if (method === 'GET') return true;
  
  // Skip health checks
  if (path.includes('/health')) return true;
  
  // Skip static assets
  if (path.includes('/uploads') || path.includes('/static')) return true;
  
  // Skip WebSocket endpoints
  if (path.includes('/ws')) return true;
  
  // Skip internal endpoints
  if (path.includes('/internal')) return true;
  
  return false;
}

/**
 * Create audit logging middleware
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Function} Express middleware function
 */
function createAuditLogger(pool) {
  return async (req, res, next) => {
    // Skip logging if conditions are met
    if (shouldSkipLogging(req.path, req.method)) {
      return next();
    }
    
    // Only log authenticated requests
    if (!req.user) {
      return next();
    }
    
    // Store original send function
    const originalSend = res.send;
    
    // Override send to log after response
    res.send = function(data) {
      // Log asynchronously to not block response
      setImmediate(async () => {
        try {
          const action = `${req.method.toLowerCase()}_${req.path
            .replace(/^\/api\//, '')
            .replace(/\//g, '_')
            .replace(/^_/, '')
            .replace(/_$/, '')}`;
          
          const logEntry = {
            tenant_id: req.user.tenantId,
            user_id: req.user.userId,
            action: action,
            resource_type: getResourceType(req.path),
            resource_id: req.params.id || req.params.deviceId || req.params.userId || null,
            details: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              query: Object.keys(req.query).length > 0 ? req.query : undefined
            },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent') || null
          };
          
          // Save to database (async, don't block)
          pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              logEntry.tenant_id,
              logEntry.user_id,
              logEntry.action,
              logEntry.resource_type,
              logEntry.resource_id,
              JSON.stringify(logEntry.details),
              logEntry.ip_address,
              logEntry.user_agent
            ]
          ).catch(err => {
            console.error('[AuditLogger] Database error:', err.message);
          });
          
          // Broadcast via WebSocket through API Gateway internal endpoint
          // Try to get API Gateway URL from environment or use default
          const apiGatewayUrl = process.env.API_GATEWAY_URL || process.env.GATEWAY_URL || 'http://api-gateway:3000';
          
          // Make HTTP call to API Gateway's internal broadcast endpoint (fire and forget)
          setImmediate(() => {
            try {
              const url = new URL(`${apiGatewayUrl}/api/internal/broadcast-log`);
              const postData = JSON.stringify({
                tenantId: logEntry.tenant_id,
                logEntry: {
                  ...logEntry,
                  created_at: new Date().toISOString(),
                  user_name: req.user.email || req.user.firstName || 'Unknown',
                  user_email: req.user.email
                }
              });
              
              const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 2000 // 2 second timeout
              };
              
              const client = url.protocol === 'https:' ? https : http;
              const httpReq = client.request(options, (httpRes) => {
                // Consume response but don't wait
                httpRes.on('data', () => {});
                httpRes.on('end', () => {});
              });
              
              httpReq.on('error', (err) => {
                // Silently fail - logging shouldn't break the application
                if (process.env.NODE_ENV === 'development') {
                  console.error('[AuditLogger] Failed to broadcast log:', err.message);
                }
              });
              
              httpReq.on('timeout', () => {
                httpReq.destroy();
              });
              
              httpReq.write(postData);
              httpReq.end();
            } catch (err) {
              // Silently fail if URL parsing fails or other errors
              if (process.env.NODE_ENV === 'development') {
                console.error('[AuditLogger] Failed to broadcast log:', err.message);
              }
            }
          });
        } catch (error) {
          console.error('[AuditLogger] Error:', error.message);
        }
      });
      
      // Call original send
      originalSend.call(this, data);
    };
    
    next();
  };
}

module.exports = { createAuditLogger };
