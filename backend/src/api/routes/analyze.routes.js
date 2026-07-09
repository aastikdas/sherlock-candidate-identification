/**
 * Analyze routes.
 * Mounted at /api/analyze (see api/routes/index.js).
 *
 *   POST /api/analyze  -> run the AI service's confidence analysis for
 *                         a meeting and return the confidence result.
 */

const express = require('express');

const { analyzeMeeting } = require('../controllers/analyze.controller');

const router = express.Router();

router.post('/', analyzeMeeting);

module.exports = router;
