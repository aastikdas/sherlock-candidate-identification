const logger = require('../../utils/logger');
const config = require('../../config');
const participantService = require('../../services/participant.service');
const candidateService = require('../../services/candidate.service');
const meetingService = require('../../services/meeting.service');
const { PARTICIPANT_ACTIVITY_EVENTS, TIMELINE_EVENTS } = require('../events');
const { mapToTimelineEntry } = require('./timelineMapper');
const {
  generateJoinEvent,
  generateLeaveEvent,
  generateSpeakingEvent,
  generateCameraEvent,
  generateConfidenceEvent,
} = require('./generators');

const SCOPE = 'realtime-mock';
const sessions = new Map();

function createInitialState(meetingId) {
  return {
    joinedIds: new Set(),
    leftIds: new Set(),
    speakingId: null,
    confidenceScores: new Map(),
    webcamStatuses: new Map(),
    telemetry: {
      meetingId: meetingId,
      scheduledStartTime: new Date(Date.now() - 60000).toISOString(),
      meetingStartTime: new Date().toISOString(),
      meetingDurationSeconds: 0,
      participants: []
    },
    lastAnalysis: null
  };
}

async function runAiAnalysis(io, meetingId, state) {
  try {
    const analysis = await candidateService.getMergedCandidate(state.telemetry);
    io.to(meetingId).emit(PARTICIPANT_ACTIVITY_EVENTS.ANALYSIS_UPDATED, analysis);

    const candidatesToEmit = [];
    if (analysis.candidate) {
      candidatesToEmit.push({
        participantId: analysis.candidate.participantId,
        displayName: analysis.candidate.displayName,
        confidenceScore: analysis.confidence
      });
    }
    (analysis.alternativeCandidates || []).forEach((alt) => {
      candidatesToEmit.push({
        participantId: alt.participantId,
        displayName: alt.displayName,
        confidenceScore: alt.likelihood
      });
    });

    state.telemetry.participants.forEach((p) => {
      const alreadyAdded = candidatesToEmit.some((c) => c.participantId === p.participantId);
      if (!alreadyAdded) {
        candidatesToEmit.push({
          participantId: p.participantId,
          displayName: p.observedIdentity.displayName,
          confidenceScore: 0.0
        });
      }
    });

    candidatesToEmit.forEach((c) => {
      io.to(meetingId).emit(PARTICIPANT_ACTIVITY_EVENTS.CONFIDENCE_UPDATED, {
        meetingId,
        participantId: c.participantId,
        displayName: c.displayName,
        confidenceScore: c.confidenceScore,
        timestamp: new Date().toISOString()
      });
    });

    generateReasoningTimelineEvents(io, meetingId, state, analysis);
    state.lastAnalysis = analysis;
  } catch (err) {
    logger.error(SCOPE, 'AI service analysis failed', {
      meetingId,
      message: err.message
    });
  }
}

function generateReasoningTimelineEvents(io, meetingId, state, analysis) {
  const prev = state.lastAnalysis;
  const current = analysis;

  if (!prev) {
    if (current.candidate) {
      emitTimelineEvent(io, meetingId, {
        type: 'candidate_selected',
        title: 'Candidate Identified',
        detail: `AI selected ${current.candidate.displayName} as the candidate (Confidence: ${Math.round(current.confidence * 100)}%)`
      });
    }
    return;
  }

  if (prev.candidate?.participantId !== current.candidate?.participantId) {
    emitTimelineEvent(io, meetingId, {
      type: 'candidate_selected',
      title: 'Candidate Selection Switched',
      detail: `AI shifted candidate selection from ${prev.candidate?.displayName || 'None'} to ${current.candidate?.displayName} (Uncertainty: ${Math.round(current.uncertainty * 100)}%)`
    });
  } else if (prev.confidence !== current.confidence) {
    const diff = Math.round((current.confidence - prev.confidence) * 100);
    if (Math.abs(diff) >= 2) {
      const direction = diff > 0 ? 'increased' : 'decreased';
      emitTimelineEvent(io, meetingId, {
        type: 'confidence_updated',
        title: 'Confidence Updated',
        detail: `Confidence in ${current.candidate.displayName} ${direction} by ${Math.abs(diff)}% to ${Math.round(current.confidence * 100)}% (due to ${current.reason.toLowerCase()})`
      });
    }
  }

  current.evidence.forEach((item) => {
    const prevItem = prev.evidence.find((e) => e.feature === item.feature);
    if (!prevItem) return;

    if (item.feature === 'displayNameSimilarity' && prevItem.rawScore === 0 && item.rawScore > 0) {
      emitTimelineEvent(io, meetingId, {
        type: 'participant_joined',
        title: 'Display Name Similarity',
        detail: `Observed display name similarity is ${Math.round(item.rawScore * 100)}% for candidate`
      });
    }

    if (item.feature === 'emailSimilarity' && prevItem.rawScore === 0 && item.rawScore > 0) {
      emitTimelineEvent(io, meetingId, {
        type: 'participant_joined',
        title: 'Email Similarity',
        detail: `Email matches the expected calendar invite profile`
      });
    }

    if (item.feature === 'facePresenceScore' && item.rawScore > prevItem.rawScore + 0.1) {
      emitTimelineEvent(io, meetingId, {
        type: 'camera_enabled',
        title: 'Face Detected',
        detail: `Face detected and verified on active webcam stream`
      });
    }

    if (item.feature === 'transcriptScore' && item.rawScore > prevItem.rawScore + 0.05) {
      emitTimelineEvent(io, meetingId, {
        type: 'started_speaking',
        title: 'Transcript Quality',
        detail: `Speaking patterns and vocabulary similarity updated`
      });
    }
  });
}

function emitTimelineEvent(io, meetingId, { type, title, detail }) {
  const timelineEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    meetingId,
    type,
    title,
    detail,
    timestamp: new Date().toISOString()
  };
  io.to(meetingId).emit(TIMELINE_EVENTS.EVENT, timelineEntry);
}

function getActiveTelemetry(meetingId) {
  if (meetingId && sessions.has(meetingId)) {
    const session = sessions.get(meetingId);
    if (session && session.state && session.state.telemetry) {
      return session.state.telemetry;
    }
  }
  for (const session of sessions.values()) {
    if (session && session.state && session.state.telemetry) {
      return session.state.telemetry;
    }
  }
  return null;
}

async function runTick({ io, meetingId, participants, state, generatorFn, eventName, eventKey, timerRef }) {
  const payload = generatorFn({ meetingId, participants, state });

  if (!payload) {
    if (timerRef && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return;
  }

  io.to(meetingId).emit(eventName, payload);
  const timelineEntry = mapToTimelineEntry(eventKey, payload);
  if (timelineEntry) {
    io.to(meetingId).emit(TIMELINE_EVENTS.EVENT, timelineEntry);
  }

  await runAiAnalysis(io, meetingId, state);
}

function toGeneratorParticipant(participant) {
  return {
    ...participant,
    confidenceScore: participant.aiConfidence?.confidenceScore ?? 0.5,
  };
}

async function startMockActivity(io, meetingId) {
  if (sessions.has(meetingId)) {
    return;
  }

  sessions.set(meetingId, { starting: true });

  let participants;
  try {
    const result = await participantService.getParticipants();
    participants = (result.participants || []).map(toGeneratorParticipant);
  } catch (err) {
    sessions.delete(meetingId);
    logger.error(SCOPE, 'Failed to start mock realtime activity', {
      meetingId,
      message: err.message,
    });
    return;
  }

  const placeholder = sessions.get(meetingId);
  if (!placeholder || !placeholder.starting) {
    return;
  }

  const state = createInitialState(meetingId);
  try {
    if (meetingService.getMeeting(meetingId).status === meetingService.STATUS.IN_PROGRESS) {
      meetingService.endMeeting(meetingId);
    }
  } catch (e) {
    // ignore
  }
  try {
    meetingService.startMeeting({
      meetingId,
      candidateName: 'Jane Doe',
      participants: participants || [],
    });
  } catch (e) {
    logger.error(SCOPE, 'Failed to start meeting in meetingService', { message: e.message });
  }

  const timers = [];
  const joinTimerRef = { current: null };

  const DEMO_JOIN_INTERVAL_MS = config.mockRealtime.joinIntervalMs || 3000;
  const DEMO_SPEAKING_INTERVAL_MS = config.mockRealtime.speakingIntervalMs || 4000;
  const DEMO_CAMERA_INTERVAL_MS = config.mockRealtime.cameraIntervalMs || 9000;
  const DEMO_LEAVE_INTERVAL_MS = config.mockRealtime.leaveIntervalMs || 15000;
  const DEMO_CONFIDENCE_INTERVAL_MS = config.mockRealtime.confidenceIntervalMs || 6000;

  runTick({
    io,
    meetingId,
    participants,
    state,
    generatorFn: generateJoinEvent,
    eventName: PARTICIPANT_ACTIVITY_EVENTS.JOINED,
    eventKey: 'join',
    timerRef: joinTimerRef,
  });

  joinTimerRef.current = setInterval(() => {
    runTick({
      io,
      meetingId,
      participants,
      state,
      generatorFn: generateJoinEvent,
      eventName: PARTICIPANT_ACTIVITY_EVENTS.JOINED,
      eventKey: 'join',
      timerRef: joinTimerRef,
    });
  }, DEMO_JOIN_INTERVAL_MS);
  timers.push(joinTimerRef);

  const leaveTimer = setInterval(() => {
    runTick({
      io,
      meetingId,
      participants,
      state,
      generatorFn: generateLeaveEvent,
      eventName: PARTICIPANT_ACTIVITY_EVENTS.LEFT,
      eventKey: 'leave',
    });
  }, DEMO_LEAVE_INTERVAL_MS);
  timers.push({ current: leaveTimer });

  const speakingTimer = setInterval(() => {
    runTick({
      io,
      meetingId,
      participants,
      state,
      generatorFn: generateSpeakingEvent,
      eventName: PARTICIPANT_ACTIVITY_EVENTS.SPEAKING_CHANGED,
      eventKey: 'speaking',
    });
  }, DEMO_SPEAKING_INTERVAL_MS);
  timers.push({ current: speakingTimer });

  const cameraTimer = setInterval(() => {
    runTick({
      io,
      meetingId,
      participants,
      state,
      generatorFn: generateCameraEvent,
      eventName: PARTICIPANT_ACTIVITY_EVENTS.CAMERA_STATUS_CHANGED,
      eventKey: 'camera',
    });
  }, DEMO_CAMERA_INTERVAL_MS);
  timers.push({ current: cameraTimer });

  const confidenceTimer = setInterval(() => {
    runTick({
      io,
      meetingId,
      participants,
      state,
      generatorFn: generateConfidenceEvent,
      eventName: PARTICIPANT_ACTIVITY_EVENTS.CONFIDENCE_UPDATED,
      eventKey: 'confidence',
    });
  }, DEMO_CONFIDENCE_INTERVAL_MS);
  timers.push({ current: confidenceTimer });

  let tickCount = 0;
  const heartbeatTimer = setInterval(async () => {
    state.telemetry.meetingDurationSeconds += 1;
    tickCount += 1;

    state.telemetry.participants.forEach((p) => {
      const isCamOn = state.webcamStatuses.get(p.participantId) === 'on';
      p.webcamStatus = isCamOn ? 'on' : 'off';
      if (isCamOn) {
        p.camera.cameraOnSeconds += 1;
        p.faceDetection.totalFramesSampled += 1;
        if (p.participantId === 'p-001' || p.participantId === 'p-002') {
          if (Math.random() < 0.95) p.faceDetection.framesWithFace += 1;
        } else if (p.participantId === 'p-004') {
          if (Math.random() < 0.90) p.faceDetection.framesWithFace += 1;
        }
      }

      const isSpeaking = state.speakingId === p.participantId;
      if (isSpeaking) {
        p.speaking.totalSpeakingSeconds += 1;
        p.transcript.wordCount += Math.floor(Math.random() * 3) + 1;
        if (Math.random() < 0.1) {
          p.transcript.fillerWordCount += 1;
        }
        if (Math.random() < 0.2) {
          p.transcript.totalSpeakingSegments += 1;
          p.transcript.segmentsTranscribed += 1;
        }
      }
      p.speakingDuration = p.speaking.totalSpeakingSeconds;
    });

    if (tickCount % 15 === 0 && state.telemetry.participants.length > 0) {
      await runAiAnalysis(io, meetingId, state);
    }
  }, 1000);
  timers.push({ current: heartbeatTimer });

  sessions.set(meetingId, { timers, state });
}

function stopMockActivity(meetingId) {
  const session = sessions.get(meetingId);

  if (!session) {
    return;
  }

  if (session.timers) {
    session.timers.forEach((timerRef) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    });
  }

  try {
    const meetingState = meetingService.getMeeting(meetingId);
    if (meetingState.status === meetingService.STATUS.IN_PROGRESS && meetingState.meetingId === meetingId) {
      meetingService.endMeeting(meetingId);
    }
  } catch (e) {
    // ignore
  }

  sessions.delete(meetingId);
}

function isRunning(meetingId) {
  return sessions.has(meetingId);
}

module.exports = { startMockActivity, stopMockActivity, isRunning, getActiveTelemetry };
