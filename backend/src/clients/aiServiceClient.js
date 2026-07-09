/**
 * AI Service Client.
 * Reusable, dependency-injectable HTTP client for talking to the
 * FastAPI AI microservice. Centralizes the base URL, timeout, and error
 * classification in one place so callers (services/controllers) never
 * touch axios directly and always get back a consistent `ApiError` --
 * regardless of whether the AI service timed out, was unreachable, or
 * returned something malformed.
 *
 * Usage:
 *
 *   const { aiServiceClient } = require('../clients/aiServiceClient');
 *   const data = await aiServiceClient.post('/api/analyze', payload);
 *
 * A fresh instance can also be constructed (e.g. for tests, or to point
 * at a different AI-service deployment) via `new AiServiceClient({ ... })`.
 */

const axios = require('axios');

const config = require('../config');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

const SCOPE = 'ai-client';

// Error codes surfaced by Node's networking stack when a connection
// never gets established (as opposed to a timeout, which axios reports
// via `ECONNABORTED`).
const CONNECTION_FAILURE_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET']);

class AiServiceClient {
  constructor({ baseURL, timeoutMs } = {}) {
    this.http = axios.create({
      baseURL: baseURL || config.aiService.baseUrl,
      timeout: timeoutMs || config.aiService.timeoutMs,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * POSTs a JSON payload to `path` on the AI service.
   *
   * @param {string} path - endpoint path, e.g. '/api/analyze'
   * @param {object} payload - JSON-serializable request body
   * @param {object} [options]
   * @param {(data: unknown) => boolean} [options.validate] - optional
   *   shape check run against the response body; a `false` result is
   *   treated as an "invalid response" failure (ApiError 502).
   * @returns {Promise<any>} the AI service's response body
   * @throws {ApiError} on timeout, connection failure, a non-2xx
   *   response, or a response that fails `validate`.
   */
  async post(path, payload, { validate } = {}) {
    let response;

    try {
      response = await this.http.post(path, payload);
    } catch (err) {
      throw this._toApiError(err, path);
    }

    if (validate && !validate(response.data)) {
      logger.error(SCOPE, 'AI service returned a malformed response', { path });
      throw new ApiError(502, 'AI service returned an invalid response.');
    }

    return response.data;
  }

  /**
   * Maps an axios error into a single, well-understood `ApiError` so
   * downstream error handling never has to know about axios internals.
   */
  _toApiError(err, path) {
    // Timeout: the request was sent but no response arrived in time.
    if (err.code === 'ECONNABORTED') {
      logger.error(SCOPE, 'AI service request timed out', {
        path,
        timeoutMs: this.http.defaults.timeout,
      });
      return new ApiError(504, 'AI service timed out. Please try again.');
    }

    // Connection failure: the service is down, unreachable, or DNS failed.
    if (err.code && CONNECTION_FAILURE_CODES.has(err.code)) {
      logger.error(SCOPE, 'Could not connect to AI service', { path, code: err.code });
      return new ApiError(503, 'AI service is unavailable. Please try again later.');
    }

    // The AI service responded, but with a non-2xx status.
    if (err.response) {
      const { status, data } = err.response;
      const detail = (data && (data.detail || data.message)) || 'AI service returned an error.';
      logger.error(SCOPE, 'AI service responded with an error status', { path, status });

      // AI-side internal failures (5xx) vs. a request we sent it that it
      // rejected (4xx, e.g. a schema validation error) get distinct
      // status classes so callers can tell them apart.
      if (status >= 500) {
        return new ApiError(502, 'AI service failed to process the request.');
      }
      return new ApiError(
        422,
        typeof detail === 'string' ? detail : 'AI service rejected the request as invalid.'
      );
    }

    // The request was made and no response was received, but it wasn't
    // caught by one of the specific connection-failure codes above.
    if (err.request) {
      logger.error(SCOPE, 'No response received from AI service', { path });
      return new ApiError(503, 'AI service is unavailable. Please try again later.');
    }

    // Something failed before the request could even be sent.
    logger.error(SCOPE, 'Unexpected error calling AI service', { path, message: err.message });
    return new ApiError(500, 'Unexpected error while contacting the AI service.');
  }
}

module.exports = AiServiceClient;
module.exports.aiServiceClient = new AiServiceClient();
