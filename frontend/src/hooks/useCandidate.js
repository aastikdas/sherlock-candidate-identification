import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchParticipants } from '../services/participant.service.js';
import useSocket from './useSocket.js';
import { PARTICIPANT_ACTIVITY_EVENTS } from '../constants/socketEvents.js';

/**
 * `CandidateCard` cares about exactly one participant: the one with
 * `role === 'candidate'` (see `backend/src/services/participant.service.js`'s
 * mock roster). Falls back to the first participant if, for some
 * reason, none is explicitly flagged as the candidate, so the card
 * degrades gracefully instead of rendering nothing.
 */
const CANDIDATE_ROLE = 'candidate';

/**
 * REST is only responsible for the *initial* hydration (name, id,
 * role, starting confidence) plus a slow reconciliation fallback in
 * case the socket connection is ever down for a while. Live confidence
 * movement itself comes from `participant:confidence-updated` socket
 * broadcasts (see `useMeetingRoom` for the room join those broadcasts
 * depend on), so this interval is intentionally long rather than the
 * primary update mechanism.
 */
const RECONCILE_INTERVAL_MS = 20000;

/**
 * Mirrors `useParticipants.js`'s error-message extraction so both
 * hooks surface backend/AI-service failures identically.
 */
function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Failed to load candidate.';
}

function pickCandidate(participants) {
  if (!Array.isArray(participants) || participants.length === 0) {
    return null;
  }
  return participants.find((p) => p.role === CANDIDATE_ROLE) || participants[0];
}

/**
 * Hydrates the candidate from `/api/participants`, then keeps them
 * live via two channels:
 *
 * 1. `participant:confidence-updated` socket broadcasts -- applied the
 *    instant they arrive, no polling delay. Requires the socket to have
 *    joined the meeting room first (see `useMeetingRoom`); events for
 *    a room this client hasn't joined are never received.
 * 2. A slow REST reconciliation poll (`RECONCILE_INTERVAL_MS`) as a
 *    fallback for whatever the socket channel doesn't cover (e.g. a
 *    dropped connection, or fields the mock activity generators don't
 *    touch).
 *
 * Either channel updates `confidenceTrend`, a signed delta in
 * confidence *points* (0-100 scale) matching what `TrendIndicator`
 * expects, by comparing against the last-seen score in `prevConfidenceRef`.
 *
 * `isLive` reflects actual socket connectivity rather than the
 * backend's separate (and, in this mock setup, never-started)
 * `meeting.service.js` lifecycle -- it's a more honest signal of
 * whether this card is actually receiving live updates right now.
 */
function useCandidate() {
  const { socket, isConnected } = useSocket();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confidenceTrend, setConfidenceTrend] = useState(0);

  const mountedRef = useRef(true);
  const prevConfidenceRef = useRef(null);
  const candidateIdRef = useRef(null);

  const applyConfidence = useCallback((nextScore) => {
    const prevScore = prevConfidenceRef.current;

    if (typeof nextScore === 'number' && typeof prevScore === 'number') {
      setConfidenceTrend(Math.round((nextScore - prevScore) * 100));
    } else {
      setConfidenceTrend(0);
    }

    if (typeof nextScore === 'number') {
      prevConfidenceRef.current = nextScore;
    }
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const result = await fetchParticipants();
        const nextCandidate = pickCandidate(result?.participants);

        if (!mountedRef.current) {
          return;
        }

        applyConfidence(nextCandidate?.aiConfidence?.confidenceScore);
        candidateIdRef.current = nextCandidate?.participantId ?? null;
        setCandidate(nextCandidate);
        setError(null);
      } catch (err) {
        if (mountedRef.current) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (mountedRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [applyConfidence]
  );

  // Initial hydration + slow reconciliation poll.
  useEffect(() => {
    mountedRef.current = true;
    load();

    const intervalId = setInterval(() => load({ silent: true }), RECONCILE_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [load]);

  // Live confidence updates -- the primary update path once connected.
  useEffect(() => {
    function handleConfidenceUpdated(payload) {
      if (!payload || payload.participantId !== candidateIdRef.current) {
        return;
      }

      applyConfidence(payload.confidenceScore);

      setCandidate((prev) => {
        if (!prev || prev.participantId !== payload.participantId) {
          return prev;
        }
        return {
          ...prev,
          aiConfidence: {
            ...prev.aiConfidence,
            confidenceScore: payload.confidenceScore,
          },
        };
      });
    }

    socket.on(PARTICIPANT_ACTIVITY_EVENTS.CONFIDENCE_UPDATED, handleConfidenceUpdated);

    return () => {
      socket.off(PARTICIPANT_ACTIVITY_EVENTS.CONFIDENCE_UPDATED, handleConfidenceUpdated);
    };
  }, [socket, applyConfidence]);

  return {
    candidate,
    loading,
    error,
    confidenceTrend,
    isLive: isConnected,
    refetch: () => load(),
  };
}

export default useCandidate;
