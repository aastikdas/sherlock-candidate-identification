/**
 * Participant routes.
 * Mounted at /api/participants (see api/routes/index.js).
 *
 *   GET /api/participants     -> list all (mocked) participants
 *   GET /api/participants/:id -> a single participant by participantId
 */

const express = require('express');

const { getParticipants, getParticipantById } = require('../controllers/participant.controller');
const { validateParticipantId } = require('../validators/participant.validator');

const router = express.Router();

router.get('/', getParticipants);
router.get('/:id', validateParticipantId, getParticipantById);

module.exports = router;
