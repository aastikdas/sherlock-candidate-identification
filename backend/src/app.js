/**
 * Express application setup.
 * Responsible for wiring global middleware and mounting API routes.
 * No business logic lives here — routes/controllers/services will be
 * implemented in a future milestone.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const apiRoutes = require('./api/routes');
const healthRoutes = require('./api/routes/health.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ---- Global middleware ----
app.use(
  cors({
    origin: config.cors.clientUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

// ---- Health check ----
app.use('/health', healthRoutes);

// ---- API routes ----
app.use('/api', apiRoutes);

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ---- Centralized error handler (must be last) ----
app.use(errorHandler);

module.exports = app;
