import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchParticipants } from '../services/participant.service.js';
import useSocket from './useSocket.js';
import { PARTICIPANT_ACTIVITY_EVENTS } from '../constants/socketEvents.js';

/**
 * Extracts a human-readable message from a failed `fetchParticipants`
 * call. Backend errors (including AI-service failures bubbled up as
 * 502/503/504 -- see `backend/src/clients/aiServiceClient.js`) arrive
 * as `{ success: false, message }` bodies; anything else (the request
 * never reaching the server at all) falls back to axios's own message.
 */
function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Failed to load participants.';
}

/**
 * Applies one participant-activity socket payload onto the matching
 * roster entry, if present. Returns the same array reference when
 * nothing matched, so callers can skip a re-render via `Object.is`.
 */
function patchParticipant(participants, participantId, patch) {
  let changed = false;

  const next = participants.map((participant) => {
    if (participant.participantId !== participantId) {
      return participant;
    }
    changed = true;
    return patch(participant);
  });

  return changed ? next : participants;
}

/**
 * Fetches the participant roster (merged with meeting metadata + AI
 * confidence) and exposes `{ data, loading, error, refetch }` so
 * components can render loading/error states without owning any fetch
 * logic themselves.
 *
 * REST handles the initial hydration; after that, two socket
 * broadcasts (see `backend/src/sockets/services/realtimeMock.service.js`)
 * patch matching rows in place with no re-fetch and no page refresh:
 *   - `participant:confidence-updated` -> `aiConfidence.confidenceScore`
 *   - `participant:camera-status-changed` -> `webcamStatus`
 * Both require the socket to have already joined the meeting room
 * (see `useMeetingRoom`) -- broadcasts for a room this client hasn't
 * joined are never received.
 *
 * Guards against setting state after unmount (e.g. the component
 * unmounts while a request is still in flight).
 */
function useParticipants() {
  const { socket } = useSocket();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchParticipants();
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
    function handleConfidenceUpdated(payload) {
      if (!payload) return;

      setData((prev) => {
        if (!prev?.participants) return prev;
        const participants = patchParticipant(prev.participants, payload.participantId, (p) => ({
          ...p,
          aiConfidence: { ...p.aiConfidence, confidenceScore: payload.confidenceScore },
        }));
        return participants === prev.participants ? prev : { ...prev, participants };
      });
    }

    function handleCameraStatusChanged(payload) {
      if (!payload) return;

      setData((prev) => {
        if (!prev?.participants) return prev;
        const participants = patchParticipant(prev.participants, payload.participantId, (p) => ({
          ...p,
          webcamStatus: payload.webcamStatus,
        }));
        return participants === prev.participants ? prev : { ...prev, participants };
      });
    }

    socket.on(PARTICIPANT_ACTIVITY_EVENTS.CONFIDENCE_UPDATED, handleConfidenceUpdated);
    socket.on(PARTICIPANT_ACTIVITY_EVENTS.CAMERA_STATUS_CHANGED, handleCameraStatusChanged);

    return () => {
      socket.off(PARTICIPANT_ACTIVITY_EVENTS.CONFIDENCE_UPDATED, handleConfidenceUpdated);
      socket.off(PARTICIPANT_ACTIVITY_EVENTS.CAMERA_STATUS_CHANGED, handleCameraStatusChanged);
    };
  }, [socket]);

  return { data, loading, error, refetch: load };
}

export default useParticipants;
