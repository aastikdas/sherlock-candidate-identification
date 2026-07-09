/**
 * Candidate routes.
 * Mounted at /api/candidate (see api/routes/index.js).
 *
 *   POST /api/candidate         -> run the AI service's Gemini-backed
 *                                  Candidate Identification for a
 *                                  meeting and return the candidate +
 *                                  explanation + alternatives +
 *                                  uncertainty.
 *   POST /api/candidate/merged  -> run the Candidate Confidence Engine
 *                                  and Gemini Candidate Identification
 *                                  together and return the merged
 *                                  shape: candidate, confidence,
 *                                  reason, evidence, llmExplanation.
 */

const express = require('express');

const { identifyCandidate, getMergedCandidate } = require('../controllers/candidate.controller');

const router = express.Router();

router.post('/merged', getMergedCandidate);
router.post('/', identifyCandidate);

module.exports = router;
