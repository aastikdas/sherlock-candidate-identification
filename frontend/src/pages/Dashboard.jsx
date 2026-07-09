import CandidateCard from '../components/CandidateCard.jsx';
import EvidencePanel from '../components/EvidencePanel.jsx';
import MeetingStatusCard from '../components/MeetingStatusCard.jsx';
import ParticipantsCard from '../components/ParticipantsCard.jsx';
import TimelineCard from '../components/TimelineCard.jsx';
import useMeetingRoom from '../hooks/useMeetingRoom.js';
import MainLayout from '../layouts/MainLayout.jsx';

/**
 * Dashboard page.
 * Arranges dashboard cards inside the shared app shell. Every card is
 * wired to the live backend -- REST for initial hydration, Socket.IO
 * for realtime updates after that (confidence, participant activity,
 * and the normalized timeline feed), with no page refresh required.
 * (A placeholder "Reasons" card with hardcoded flagged-reason strings
 * used to live here; it duplicated `EvidencePanel`'s real `reason` /
 * `llmExplanation` fields with fabricated data and was removed rather
 * than kept as misleading UI.)
 *
 * `useMeetingRoom` joins the mock meeting's socket room once the
 * connection is up. It has to run somewhere above (or alongside) the
 * cards that depend on that room's broadcasts -- `CandidateCard`,
 * `ParticipantsCard`, `MeetingStatusCard`, and `TimelineCard` all do,
 * via `useCandidate`, `useParticipants`, and `useTimelineEvents`
 * respectively -- since a socket that never joins a meeting room never
 * receives its events.
 */
function Dashboard() {
  useMeetingRoom();

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MeetingStatusCard />
        <CandidateCard />
        <ParticipantsCard />
        <TimelineCard />
        <EvidencePanel />
      </div>
    </MainLayout>
  );
}

export default Dashboard;
