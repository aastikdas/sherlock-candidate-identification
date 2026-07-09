/**
 * Small display-formatting helpers shared by every component that
 * renders a participant (`CandidateCard`, `ParticipantsCard`, ...).
 * Pulled out here so the two cards don't maintain their own copies of
 * the same logic.
 */

/**
 * Initials for an avatar fallback, e.g. "Jane Doe" -> "JD".
 * @param {string|null|undefined} name
 * @returns {string} up to 2 uppercase initials, or `?` when there's no name.
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Capitalizes a participant role for display, e.g. "candidate" -> "Candidate".
 * @param {string|null|undefined} role
 * @returns {string}
 */
export function formatRole(role) {
  if (!role) return 'Unknown';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
