/**
 * Health controller.
 * Reports basic liveness info for the backend service.
 * Intentionally free of business logic — this is scaffolding only.
 */

function getHealth(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'sherlock-backend',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };
