/**
 * CampusCare Prometheus Metrics Module
 * Provides Prometheus-compatible application observability metrics
 * using prom-client with low-cardinality labels.
 */

const promClient = require('prom-client');

// Initialize default Node.js and process runtime metrics
promClient.collectDefaultMetrics({
  register: promClient.register,
  prefix: '',
});

// Counter: Total HTTP Requests
const campuscareHttpRequestsTotal = new promClient.Counter({
  name: 'campuscare_http_requests_total',
  help: 'Total number of HTTP requests processed by CampusCare backend',
  labelNames: ['method', 'route', 'status_code'],
});

// Counter: Total HTTP Errors (4xx and 5xx)
const campuscareHttpErrorsTotal = new promClient.Counter({
  name: 'campuscare_http_errors_total',
  help: 'Total number of HTTP error responses (4xx and 5xx) returned by CampusCare backend',
  labelNames: ['method', 'route', 'status_code'],
});

// Histogram: HTTP Request Latency Duration in seconds
const campuscareHttpRequestDurationSeconds = new promClient.Histogram({
  name: 'campuscare_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Counter: Total SLA At-Risk Detections
const campuscareSlaAtRiskTotal = new promClient.Counter({
  name: 'campuscare_sla_at_risk_total',
  help: 'Total number of complaints transitioning into SLA AT_RISK state',
  labelNames: ['priority'],
});

// Counter: Total SLA Breaches
const campuscareSlaBreachedTotal = new promClient.Counter({
  name: 'campuscare_sla_breached_total',
  help: 'Total number of complaints breaching SLA deadlines',
  labelNames: ['priority'],
});

// Counter: Total Automated Escalations
const campuscareSlaEscalationsTotal = new promClient.Counter({
  name: 'campuscare_sla_escalations_total',
  help: 'Total number of automated complaint escalations triggered by SLA monitor',
  labelNames: ['level'],
});

// Batch 3: Socket.IO Active Connections Gauge
const campuscareSocketConnectionsActive = new promClient.Gauge({
  name: 'campuscare_socket_connections_active',
  help: 'Number of currently active Socket.IO connections',
});

// Batch 3: Socket.IO Events Counter
const campuscareSocketEventsTotal = new promClient.Counter({
  name: 'campuscare_socket_events_total',
  help: 'Total Socket.IO events dispatched or received',
  labelNames: ['event_type'],
});

// Batch 3: AI Classification Requests Counter
const campuscareAiClassificationRequestsTotal = new promClient.Counter({
  name: 'campuscare_ai_classification_requests_total',
  help: 'Total number of AI complaint classification requests',
  labelNames: ['provider', 'status'],
});

// Batch 3: Duplicate Complaint Detection Counter
const campuscareDuplicateChecksTotal = new promClient.Counter({
  name: 'campuscare_duplicate_checks_total',
  help: 'Total duplicate complaint checks performed',
  labelNames: ['result'],
});

// Batch 3: Staff Recommendation Requests Counter
const campuscareStaffRecommendationRequestsTotal = new promClient.Counter({
  name: 'campuscare_staff_recommendation_requests_total',
  help: 'Total requests for smart staff recommendations',
});

/**
 * Normalizes request paths to safe, low-cardinality route patterns.
 * Prevents URL parameter pollution (e.g. user IDs, complaint IDs, tokens) in Prometheus labels.
 */
function normalizeRoute(req) {
  if (req.route && req.route.path) {
    const basePath = req.baseUrl || '';
    const routePath = typeof req.route.path === 'string'
      ? req.route.path
      : req.route.path.toString();
    return `${basePath}${routePath}` || '/';
  }
  return 'unmatched';
}

/**
 * Express Middleware to track incoming HTTP requests, errors, and latencies.
 * Excludes /metrics itself to prevent scrape recursion and metric pollution.
 */
function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics' || req.originalUrl === '/metrics') {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const method = req.method ? req.method.toUpperCase() : 'UNKNOWN';
    const route = normalizeRoute(req);
    const statusCode = String(res.statusCode || 200);

    const labels = {
      method,
      route,
      status_code: statusCode,
    };

    campuscareHttpRequestsTotal.inc(labels);
    campuscareHttpRequestDurationSeconds.observe(labels, durationSeconds);

    if (res.statusCode >= 400) {
      campuscareHttpErrorsTotal.inc(labels);
    }
  });

  next();
}

/**
 * Express Route Handler for GET /metrics
 * Returns Prometheus-formatted text metrics with standard 0.0.4 content type.
 */
async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', promClient.register.contentType);
    const metricsData = await promClient.register.metrics();
    res.end(metricsData);
  } catch (err) {
    res.status(500).end(err.message);
  }
}

module.exports = {
  promClient,
  register: promClient.register,
  campuscareHttpRequestsTotal,
  campuscareHttpErrorsTotal,
  campuscareHttpRequestDurationSeconds,
  campuscareSlaAtRiskTotal,
  campuscareSlaBreachedTotal,
  campuscareSlaEscalationsTotal,
  campuscareSocketConnectionsActive,
  campuscareSocketEventsTotal,
  campuscareAiClassificationRequestsTotal,
  campuscareDuplicateChecksTotal,
  campuscareStaffRecommendationRequestsTotal,
  metricsMiddleware,
  metricsHandler,
  normalizeRoute,
};
