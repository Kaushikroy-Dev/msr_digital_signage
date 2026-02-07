const axios = require('axios');
const fs = require('fs');

const API_BASE = 'https://api-gateway-production-d887.up.railway.app/api';

// Get auth token from command line or environment
const AUTH_TOKEN = process.argv[2] || process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('❌ Auth token required!');
  console.log('\nUsage:');
  console.log('  node test-production-apis.js YOUR_AUTH_TOKEN');
  console.log('  OR');
  console.log('  export AUTH_TOKEN="your-token" && node test-production-apis.js');
  console.log('\nTo get your token:');
  console.log('  1. Open production site: https://frontend-production-73c0.up.railway.app');
  console.log('  2. Login');
  console.log('  3. Open browser console (F12)');
  console.log('  4. Run: localStorage.getItem("authToken")');
  console.log('  5. Copy the token value');
  process.exit(1);
}

// You'll need to replace these with actual IDs from your production data
const TEST_TENANT_ID = process.env.TENANT_ID || 'YOUR_TENANT_ID';
const TEST_PROPERTY_ID = process.env.PROPERTY_ID || 'YOUR_PROPERTY_ID';
const TEST_DEVICE_ID = process.env.DEVICE_ID || 'YOUR_DEVICE_ID';

// Test endpoints configuration
const tests = {
  // Auth Service
  auth: [
    { method: 'GET', path: '/auth/health', auth: false, name: 'Health Check' },
    { method: 'GET', path: '/auth/profile', auth: true, name: 'Get Profile' },
  ],
  
  // Device Service
  device: [
    { 
      method: 'GET', 
      path: '/devices/properties', 
      auth: true, 
      params: { tenantId: TEST_TENANT_ID },
      name: 'Get Properties'
    },
    { 
      method: 'GET', 
      path: '/devices/zones', 
      auth: true, 
      params: { propertyId: TEST_PROPERTY_ID },
      name: 'Get Zones',
      skipIfNoId: true
    },
    { 
      method: 'GET', 
      path: '/devices/all-zones', 
      auth: true, 
      params: { tenantId: TEST_TENANT_ID },
      name: 'Get All Zones'
    },
    { 
      method: 'GET', 
      path: '/devices/devices', 
      auth: true, 
      params: { tenantId: TEST_TENANT_ID },
      name: 'Get Devices'
    },
    { 
      method: 'GET', 
      path: '/analytics/dashboard-stats', 
      auth: true,
      name: 'Dashboard Stats'
    },
  ],
  
  // Content Service
  content: [
    { 
      method: 'GET', 
      path: '/content/assets', 
      auth: true, 
      params: { tenantId: TEST_TENANT_ID, limit: 50 },
      name: 'Get Media Assets'
    },
  ],
  
  // Template Service
  template: [
    { 
      method: 'GET', 
      path: '/templates', 
      auth: true, 
      params: { tenantId: TEST_TENANT_ID },
      name: 'Get Templates'
    },
    { 
      method: 'GET', 
      path: '/settings/widgets', 
      auth: true, 
      params: { tenantId: TEST_TENANT_ID },
      name: 'Get Widget Settings'
    },
  ],
  
  // Scheduling Service
  scheduling: [
    { 
      method: 'GET', 
      path: '/schedules/playlists', 
      auth: true, 
      params: { tenantId: TEST_TENANT_ID },
      name: 'Get Playlists'
    },
    { 
      method: 'GET', 
      path: '/schedules/schedules', 
      auth: true, 
      params: { tenantId: TEST_TENANT_ID },
      name: 'Get Schedules'
    },
    { 
      method: 'GET', 
      path: `/schedules/player/${TEST_DEVICE_ID}/content`, 
      auth: false, 
      name: 'Get Player Content',
      skipIfNoId: true
    },
  ],
};

async function testEndpoint(test, token) {
  const startTime = Date.now();
  
  // Skip if requires ID but not provided
  if (test.skipIfNoId && (test.path.includes('YOUR_') || test.params?.propertyId === 'YOUR_PROPERTY_ID')) {
    return {
      success: false,
      status: 'SKIPPED',
      duration: 0,
      error: 'Missing required ID',
    };
  }
  
  const config = {
    method: test.method,
    url: `${API_BASE}${test.path}`,
    headers: {
      'Content-Type': 'application/json',
      ...(token && test.auth && { 'Authorization': `Bearer ${token}` }),
    },
    params: test.params,
    timeout: 30000,
  };
  
  try {
    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    // Check for cache headers
    const cacheControl = response.headers['cache-control'];
    const etag = response.headers['etag'];
    const expires = response.headers['expires'];
    
    // Calculate response size
    const responseSize = JSON.stringify(response.data).length;
    const dataCount = Array.isArray(response.data) 
      ? response.data.length 
      : (response.data?.items?.length || response.data?.properties?.length || response.data?.devices?.length || 0);
    
    return {
      success: true,
      status: response.status,
      duration,
      responseSize,
      dataCount,
      cacheControl: cacheControl || 'NOT SET',
      etag: etag || 'NOT SET',
      expires: expires || 'NOT SET',
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      status: error.response?.status || 'ERROR',
      duration,
      error: error.response?.data?.error || error.message,
    };
  }
}

async function runTests() {
  console.log('🚀 Starting Production API Performance Tests...\n');
  console.log(`📡 API Base URL: ${API_BASE}`);
  console.log(`🔑 Auth Token: ${AUTH_TOKEN.substring(0, 20)}...\n`);
  
  const results = {};
  let totalTests = 0;
  let successfulTests = 0;
  let failedTests = 0;
  let skippedTests = 0;
  const durations = [];
  
  for (const [service, endpoints] of Object.entries(tests)) {
    console.log(`\n📡 Testing ${service.toUpperCase()} service...`);
    console.log('─'.repeat(60));
    results[service] = [];
    
    for (const endpoint of endpoints) {
      totalTests++;
      const result = await testEndpoint(endpoint, AUTH_TOKEN);
      results[service].push({
        name: endpoint.name,
        endpoint: endpoint.path,
        method: endpoint.method,
        ...result,
      });
      
      if (result.status === 'SKIPPED') {
        skippedTests++;
        console.log(`  ⏭️  ${endpoint.name.padEnd(30)} - SKIPPED (missing ID)`);
      } else if (result.success) {
        successfulTests++;
        durations.push(result.duration);
        const cache = result.cacheControl !== 'NOT SET' ? '📦' : '⚠️';
        const dataInfo = result.dataCount > 0 ? `(${result.dataCount} items)` : '';
        console.log(`  ✅ ${endpoint.name.padEnd(30)} - ${result.duration.toString().padStart(5)}ms ${cache} ${dataInfo}`);
      } else {
        failedTests++;
        console.log(`  ❌ ${endpoint.name.padEnd(30)} - ${result.status} (${result.duration}ms)`);
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
      }
      
      // Wait between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Calculate statistics
  const avgDuration = durations.length > 0 
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  
  const endpointsWithoutCache = Object.values(results)
    .flat()
    .filter(r => r.success && r.cacheControl === 'NOT SET').length;
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    apiBase: API_BASE,
    summary: {
      totalTests,
      successful: successfulTests,
      failed: failedTests,
      skipped: skippedTests,
      avgResponseTime: avgDuration,
      minResponseTime: minDuration,
      maxResponseTime: maxDuration,
      endpointsWithoutCache,
    },
    results,
  };
  
  // Save report
  const reportFile = `api-performance-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`   Total Tests:     ${totalTests}`);
  console.log(`   ✅ Successful:    ${successfulTests}`);
  console.log(`   ❌ Failed:        ${failedTests}`);
  console.log(`   ⏭️  Skipped:       ${skippedTests}`);
  console.log(`\n   ⏱️  Response Times:`);
  console.log(`      Average:       ${avgDuration}ms`);
  console.log(`      Fastest:       ${minDuration}ms`);
  console.log(`      Slowest:       ${maxDuration}ms`);
  console.log(`\n   📦 Caching:`);
  console.log(`      Without Cache: ${endpointsWithoutCache} endpoints`);
  console.log(`\n📄 Full report saved to: ${reportFile}`);
  console.log('='.repeat(60));
  
  // Performance warnings
  if (maxDuration > 2000) {
    console.log('\n⚠️  WARNING: Some endpoints are slow (>2000ms)');
  }
  if (endpointsWithoutCache > 0) {
    console.log(`\n⚠️  WARNING: ${endpointsWithoutCache} endpoints missing cache headers`);
  }
}

runTests().catch(console.error);
