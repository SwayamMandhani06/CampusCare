/**
 * CampusCare Backend Server
 * Express application entry point
 */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { metricsMiddleware, metricsHandler } = require('./metrics');
const { startSlaScheduler } = require('./services/slaScheduler');

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

// Start background SLA monitoring scheduler (multi-replica safe via Mongo lease)
if (process.env.ENABLE_SLA_SCHEDULER !== 'false' && process.env.NODE_ENV !== 'test') {
  startSlaScheduler();
}

const app = express();

// Core Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Body parser for incoming JSON payloads
app.use(express.urlencoded({ extended: true }));

// Prometheus Metrics Middleware
app.use(metricsMiddleware);

// Prometheus Scrape Endpoint (unauthenticated for internal Kubernetes cluster scraping)
app.get('/metrics', metricsHandler);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    project: 'CampusCare - Smart Campus Complaint & Facility Management System',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/notifications', notificationRoutes);

// Catch-all 404 handler for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Define Port and start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` CampusCare Backend Server running on port ${PORT}`);
  console.log(` API URL: http://localhost:${PORT}/api`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});

// Export server instance for testing
module.exports = { app, server };
