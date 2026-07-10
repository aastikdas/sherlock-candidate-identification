/**
 * Meeting controller.
 * Thin HTTP layer — delegates all business logic to `meeting.service.js`
 * and formats responses via the shared `apiResponse` helper.
 */

const meetingService = require('../../services/meeting.service');
const { sendSuccess } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getMeeting = asyncHandler(async (req, res) => {
  const meetingId = req.headers['x-meeting-id'] || req.query.meetingId;
  const data = meetingService.getMeeting(meetingId);
  sendSuccess(res, { message: 'Meeting status retrieved successfully.', data });
});

const startMeeting = asyncHandler(async (req, res) => {
  const { meetingId, candidateName, participants } = req.body;
  const data = meetingService.startMeeting({ meetingId, candidateName, participants });
  sendSuccess(res, { statusCode: 201, message: 'Meeting started successfully.', data });
});

const endMeeting = asyncHandler(async (req, res) => {
  const meetingId = req.body?.meetingId || req.headers['x-meeting-id'] || req.query.meetingId;
  const data = meetingService.endMeeting(meetingId);
  sendSuccess(res, { message: 'Meeting ended successfully.', data });
});

module.exports = { getMeeting, startMeeting, endMeeting };
