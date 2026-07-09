import axiosClient from '../api/axiosClient.js';

/**
 * Participant service (frontend).
 * Thin wrapper around the backend's `/api/participants` resource --
 * mirrors `backend/src/services/participant.service.js` in spirit:
 * callers get back the already-merged shape (roster + live meeting
 * metadata + AI confidence) without needing to know anything about
 * the underlying HTTP call or the `{ success, message, data }`
 * envelope every backend response is wrapped in.
 */

/**
 * Fetches the full participant roster, each participant merged with
 * the current meeting metadata and their AI-derived confidence.
 *
 * @returns {Promise<{ meeting: object, participants: object[] }>}
 * @throws {Error} the underlying axios error on network failure or a
 *   non-2xx response (e.g. the AI service being unavailable, surfaced
 *   by the backend as a 502/503/504) -- callers are expected to catch
 *   this and present it as a loading/error state.
 */
async function fetchParticipants() {
  const response = await axiosClient.get('/api/participants');
  return response.data.data;
}

export default { fetchParticipants };
export { fetchParticipants };
