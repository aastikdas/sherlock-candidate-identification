import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchMergedCandidateAnalysis } from '../services/candidateAnalysis.service.js';
import useSocket from './useSocket.js';
import { PARTICIPANT_ACTIVITY_EVENTS } from '../constants/socketEvents.js';

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
 * Listens to `candidate:analysis-updated` socket broadcasts for live updates.
 */
function useCandidateAnalysis() {
  const { socket } = useSocket();
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

  useEffect(() => {
    function handleAnalysisUpdated(payload) {
      if (!payload) return;
      setData(payload);
    }

    socket.on(PARTICIPANT_ACTIVITY_EVENTS.ANALYSIS_UPDATED, handleAnalysisUpdated);

    return () => {
      socket.off(PARTICIPANT_ACTIVITY_EVENTS.ANALYSIS_UPDATED, handleAnalysisUpdated);
    };
  }, [socket]);

  return { data, loading, error, refetch: load };
}

export default useCandidateAnalysis;
