/**
 * Automated Verification Suite for Prometheus Application Metrics
 *
 * Verifies:
 * 1. GET /metrics returns HTTP 200 with Prometheus-compatible Content-Type.
 * 2. Output contains custom metrics:
 *    - campuscare_http_requests_total
 *    - campuscare_http_errors_total
 *    - campuscare_http_request_duration_seconds
 * 3. Output contains default Node.js/process runtime metrics.
 * 4. Normal API request (/api/health) increments campuscare_http_requests_total.
 * 5. Failed/Unmatched request (/api/nonexistent-route-404) increments campuscare_http_errors_total.
 * 6. Low-cardinality label verification (no raw query/body/user data in labels).
 * 7. Security audit: No secrets, passwords, or tokens are exposed in /metrics output.
 * 8. GET /metrics itself does not create recursive application request metrics.
 */

const express = require('express');
const http = require('http');
const {
  register,
  metricsMiddleware,
  metricsHandler,
  campuscareHttpRequestsTotal,
  campuscareHttpErrorsTotal,
  campuscareHttpRequestDurationSeconds,
} = require('./metrics');

// Helper to make HTTP requests using native fetch
const request = async (baseUrl, path, options = {}) => {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    text,
  };
};

async function runMetricsTests() {
  console.log('===============================================================');
  console.log('    CampusCare Prometheus Metrics Test Suite Verification      ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // Create isolated Express test app
  const app = express();
  app.use(express.json());
  app.use(metricsMiddleware);

  // Scrape endpoint
  app.get('/metrics', metricsHandler);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'online' });
  });

  // Parameterized endpoint to test route normalization
  app.get('/api/complaints/:id', (req, res) => {
    res.status(200).json({ id: req.params.id, title: 'Test complaint' });
  });

  // Controlled error endpoint
  app.get('/api/error-test', (req, res) => {
    res.status(500).json({ error: 'Intentional server error' });
  });

  // Catch-all 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Start HTTP server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    console.log(`[Setup] Metrics test server listening at ${baseUrl}\n`);

    // -------------------------------------------------------------------------
    // Test 1: GET /metrics Endpoint Availability and Headers
    // -------------------------------------------------------------------------
    console.log('--- Test Group 1: Endpoint & Format Verification ---');
    const initialMetricsRes = await request(baseUrl, '/metrics');
    assert(initialMetricsRes.status === 200, 'GET /metrics returns HTTP 200 OK');

    const contentType = initialMetricsRes.headers.get('content-type') || '';
    assert(
      contentType.includes('text/plain') && contentType.includes('version=0.0.4'),
      `Content-Type is Prometheus-compatible (${contentType})`
    );

    // -------------------------------------------------------------------------
    // Test 2: Custom Metric Definitions Exist in Scrape Output
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 2: Registered Metrics Presence ---');
    assert(
      initialMetricsRes.text.includes('# TYPE campuscare_http_requests_total counter') ||
      initialMetricsRes.text.includes('# HELP campuscare_http_requests_total'),
      'Output contains campuscare_http_requests_total'
    );

    assert(
      initialMetricsRes.text.includes('# TYPE campuscare_http_errors_total counter') ||
      initialMetricsRes.text.includes('# HELP campuscare_http_errors_total'),
      'Output contains campuscare_http_errors_total'
    );

    assert(
      initialMetricsRes.text.includes('# TYPE campuscare_http_request_duration_seconds histogram') ||
      initialMetricsRes.text.includes('# HELP campuscare_http_request_duration_seconds'),
      'Output contains campuscare_http_request_duration_seconds'
    );

    // -------------------------------------------------------------------------
    // Test 3: Standard Node.js & Process Runtime Metrics
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 3: Default Runtime Metrics ---');
    assert(
      initialMetricsRes.text.includes('process_cpu_user_seconds_total') ||
      initialMetricsRes.text.includes('nodejs_eventloop_lag_seconds') ||
      initialMetricsRes.text.includes('process_resident_memory_bytes'),
      'Output contains standard Node.js/process runtime metrics'
    );

    // -------------------------------------------------------------------------
    // Test 4: Request Counter Increments on Successful API Call
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 4: Request Counter & Latency Measurement ---');
    const healthRes = await request(baseUrl, '/api/health');
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');

    // Scrape metrics after health request
    const afterHealthRes = await request(baseUrl, '/metrics');
    assert(
      afterHealthRes.text.includes('campuscare_http_requests_total{method="GET",route="/api/health",status_code="200"}'),
      'Request counter incremented with normalized label for /api/health'
    );

    assert(
      afterHealthRes.text.includes('campuscare_http_request_duration_seconds_bucket{le='),
      'Request duration histogram recorded latency observations'
    );

    // -------------------------------------------------------------------------
    // Test 5: Route Normalization & Parameter Obfuscation (Low-Cardinality)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 5: Low-Cardinality Route Normalization ---');
    // Call endpoint with arbitrary ID parameter
    const complaintRes = await request(baseUrl, '/api/complaints/cmpl_67890_sensitive_id?secret=123');
    assert(complaintRes.status === 200, 'GET /api/complaints/:id returns HTTP 200');

    const afterParamRes = await request(baseUrl, '/metrics');
    assert(
      afterParamRes.text.includes('route="/api/complaints/:id"'),
      'Route label uses parameterized pattern (/api/complaints/:id), not raw URL'
    );
    assert(
      !afterParamRes.text.includes('cmpl_67890_sensitive_id'),
      'URL parameter value (cmpl_67890_sensitive_id) is NOT leaked in metrics labels'
    );
    assert(
      !afterParamRes.text.includes('secret=123'),
      'Query string parameters are NOT leaked in metrics labels'
    );

    // -------------------------------------------------------------------------
    // Test 6: Error Counter Increments on 4xx and 5xx
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 6: Error Counter Verification ---');
    // Trigger 404 unmatched request
    const notFoundRes = await request(baseUrl, '/api/nonexistent-route-404-test');
    assert(notFoundRes.status === 404, 'Unmatched route returns HTTP 404');

    // Trigger 500 error request
    const errorRes = await request(baseUrl, '/api/error-test');
    assert(errorRes.status === 500, 'Error route returns HTTP 500');

    const afterErrorsRes = await request(baseUrl, '/metrics');
    assert(
      afterErrorsRes.text.includes('campuscare_http_errors_total{method="GET",route="unmatched",status_code="404"}'),
      'Error counter incremented for HTTP 404 on unmatched route'
    );

    assert(
      afterErrorsRes.text.includes('campuscare_http_errors_total{method="GET",route="/api/error-test",status_code="500"}'),
      'Error counter incremented for HTTP 500 on application error'
    );

    // -------------------------------------------------------------------------
    // Test 7: Scrape Recursion Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 7: Scrape Exclusion ---');
    assert(
      !afterErrorsRes.text.includes('route="/metrics"'),
      '/metrics route is excluded from application request tracking'
    );

    // -------------------------------------------------------------------------
    // Test 8: Security & Secret Leak Prevention Audit
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 8: Security Audit (Zero Secret Exposure) ---');
    const sensitiveTokens = [
      process.env.JWT_SECRET || 'campuscare_test_jwt_secret_key_2026',
      'password',
      'MONGO_INITDB',
      'mongodb://',
      'dockerhub',
    ];

    let leakDetected = false;
    for (const token of sensitiveTokens) {
      if (token && afterErrorsRes.text.includes(token)) {
        console.error(`  ✗ [LEAK] Metric output leaked token pattern: ${token}`);
        leakDetected = true;
      }
    }
    assert(!leakDetected, 'Zero secrets or credential strings exposed in /metrics output');

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(` Test Summary: ${passed} passed, ${failed} failed`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

// Execute tests
runMetricsTests().catch((err) => {
  console.error('[Fatal Error in Metrics Test Suite]', err);
  process.exit(1);
});
