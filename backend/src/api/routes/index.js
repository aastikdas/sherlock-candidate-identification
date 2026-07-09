/**
 * Root API router.
 * Aggregates all resource-specific routers under /api.
 */

const express = require('express');

const meetingRoutes = require('./meeting.routes');
const participantRoutes = require('./participant.routes');
const analyzeRoutes = require('./analyze.routes');
const candidateRoutes = require('./candidate.routes');

const router = express.Router();

// Placeholder root endpoint to confirm the API namespace is wired up.
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Sherlock API is alive' });
});

router.use('/meeting', meetingRoutes);
router.use('/participants', participantRoutes);
router.use('/analyze', analyzeRoutes);
router.use('/candidate', candidateRoutes);

// Future resource routers will be mounted here, e.g.:
// const uploadRoutes = require('./upload.routes');
// router.use('/upload', uploadRoutes);

module.exports = router;
