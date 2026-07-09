/**
 * Meeting routes.
 * Mounted at /api/meeting (see api/routes/index.js).
 *
 *   GET   /api/meeting        -> current meeting status (mocked)
 *   POST  /api/meeting/start  -> start a new meeting
 *   POST  /api/meeting/end    -> end the in-progress meeting
 */

const express = require('express');

const { getMeeting, startMeeting, endMeeting } = require('../controllers/meeting.controller');
const { validateStartMeeting } = require('../validators/meeting.validator');

const router = express.Router();

router.get('/', getMeeting);
router.post('/start', validateStartMeeting, startMeeting);
router.post('/end', endMeeting);

module.exports = router;
