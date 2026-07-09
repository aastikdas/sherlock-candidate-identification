/**
 * generators/index.js
 * Barrel export so consumers can `require('./generators')` instead of
 * reaching into individual generator files.
 */

const { generateJoinEvent } = require('./join.generator');
const { generateLeaveEvent } = require('./leave.generator');
const { generateSpeakingEvent } = require('./speaking.generator');
const { generateConfidenceEvent } = require('./confidence.generator');
const { generateCameraEvent } = require('./camera.generator');

module.exports = {
  generateJoinEvent,
  generateLeaveEvent,
  generateSpeakingEvent,
  generateConfidenceEvent,
  generateCameraEvent,
};
