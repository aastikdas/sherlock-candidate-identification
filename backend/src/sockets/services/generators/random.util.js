/**
 * random.util.js
 * Small, dependency-free random-value helpers shared by every mock
 * activity generator. Kept separate so each generator file stays focused
 * on "what event am I producing" rather than re-implementing basic
 * randomness helpers.
 */

/** Random integer in [min, max], inclusive. */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Picks a random element from a non-empty array. */
function pickRandom(list) {
  return list[randomInt(0, list.length - 1)];
}

/** Clamps a number between min and max. */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

module.exports = { randomInt, pickRandom, clamp };
