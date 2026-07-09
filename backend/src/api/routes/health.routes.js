/**
 * Health check route.
 * Kept separate from the /api router since health checks are typically
 * probed at the service root (e.g. by load balancers / uptime monitors).
 */

const express = require('express');

const { getHealth } = require('../controllers/health.controller');

const router = express.Router();

router.get('/', getHealth);

module.exports = router;
