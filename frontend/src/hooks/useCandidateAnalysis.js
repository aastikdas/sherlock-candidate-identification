import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchMergedCandidateAnalysis } from '../services/candidateAnalysis.service.js';

/**
 * Mirrors `useParticipants.js`'s error-message extraction so every
 * data hook on this dashboard surfaces backend/AI-service failures the
 * same way.
 */
function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Failed to load candidate analysis.';
}

/**
 * Fetches the merged Candidate Confidence Engine + Gemini Candidate
 * Identification result (`POST /api/candidate/merged`, via
 * `candidateAnalysis.service.js`) and exposes
 * `{ data, loading, error, refetch }`.
 *
 * REST-only for now -- unlike `useCandidate`/`useParticipants`, this
 * result isn't pushed over the realtime socket channel (the mock
 * activity generators only ever touch the plain confidence score, not
 * the LLM explanation or evidence trail), so there's no live-patch
 * effect here; `refetch` is exposed for callers that want to pull a
 * fresh read on demand.
 */
function useCandidateAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchMergedCandidateAnalysis();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();

    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { data, loading, error, refetch: load };
}

export default useCandidateAnalysis;
