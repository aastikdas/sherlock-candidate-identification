/**
 * Centralized configuration module.
 * All environment-driven values should be read from here rather than
 * accessing process.env directly throughout the codebase.
 *
 * NOTE: No business logic lives here. This is scaffolding only.
 */

require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',

  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
  },

  cors: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  },

  aiService: {
    baseUrl: process.env.AI_SERVICE_URL || 'http://localhost:8001',
    timeoutMs: parseInt(process.env.AI_SERVICE_TIMEOUT_MS, 10) || 5000,
  },

  uploads: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 10,
  },

  // Timing for the mock realtime participant-activity generator
  // (Task 15A). Values are in milliseconds and intentionally staggered
  // so the different event types don't all fire on the same tick.
  mockRealtime: {
    joinIntervalMs: parseInt(process.env.MOCK_JOIN_INTERVAL_MS, 10) || 3000,
    speakingIntervalMs: parseInt(process.env.MOCK_SPEAKING_INTERVAL_MS, 10) || 4000,
    confidenceIntervalMs: parseInt(process.env.MOCK_CONFIDENCE_INTERVAL_MS, 10) || 6000,
    cameraIntervalMs: parseInt(process.env.MOCK_CAMERA_INTERVAL_MS, 10) || 9000,
    leaveIntervalMs: parseInt(process.env.MOCK_LEAVE_INTERVAL_MS, 10) || 15000,
  },
};


module.exports = config;
