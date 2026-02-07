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
  // Skip GET requests (except important ones - maybe none for now)
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
    
    // Note: We'll check req.user inside the log function (res.send override) 
    // because req.user might not be set yet if this middleware runs before auth
    
    // Store original send function
    const originalSend = res.send;
    
    // Override send to log after response
    res.send = function(data) {
      // Capture context (req.user might be set by subsequent auth middleware)
      const user = req.user;
      
      // Log asynchronously to not block response
      setImmediate(async () => {
        try {
          // If unauthenticated, we skip (unless we want to log failed login attempts? 
          // failed login attempts usually don't have req.user set unless we set it manually on error)
          // For now, consistent with existing logic: log only if user is identified or if it's a special public action
          if (!user && !req.path.includes('/login')) {
             return; 
          }

          // If it's login, user might be null, but we might want to log it?
          // Existing logic relies on req.user. 
          // If login succeeds, req.user *might* be set if we manually set it in login route? 
          // Actually login route sends response. 
          // If login route doesn't set req.user, we miss it here.
          // But login route does manual logging anyway.
          // So let's stick to: if (!user) return.
          if (!user) return;

          const action = `${req.method.toLowerCase()}_${req.path
            .replace(/^\/api\//, '')
            .replace(/\//g, '_')
            .replace(/^_/, '')
            .replace(/_$/, '')}`;
          
          const logEntry = {
            tenant_id: user.tenantId || user.tenant_id,
            user_id: user.userId || user.id,
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
          const apiGatewayUrl = process.env.API_GATEWAY_URL || process.env.GATEWAY_URL || 'http://api-gateway:3000';
          
          setImmediate(() => {
            try {
              const url = new URL(`${apiGatewayUrl}/api/internal/broadcast-log`);
              const postData = JSON.stringify({
                tenantId: logEntry.tenant_id,
                logEntry: {
                  ...logEntry,
                  created_at: new Date().toISOString(),
                  user_name: user.email || user.firstName || 'Unknown',
                  user_email: user.email
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
                timeout: 300 // Short timeout for internal call
              };
              
              const client = url.protocol === 'https:' ? https : http;
              const httpReq = client.request(options, (httpRes) => {
                httpRes.on('data', () => {});
                httpRes.on('end', () => {});
              });
              
              httpReq.on('error', (err) => {
                  // silent fail
              });
              
              httpReq.write(postData);
              httpReq.end();
            } catch (err) {
               // silent fail
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
