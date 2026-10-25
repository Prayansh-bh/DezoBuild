/**
 * DEZOBUILD Project Core Constants & Lifecycle State Machine
 *
 * Authoritative project statuses and transition rules for Phase 06.1.
 */

export const PROJECT_STATUSES = [
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const VALID_STATUS_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  PLANNING: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['ON_HOLD', 'COMPLETED', 'ARCHIVED'],
  ON_HOLD: ['ACTIVE', 'ARCHIVED'],
  COMPLETED: ['ACTIVE', 'ARCHIVED'], // Reactivation/reopening moves back to ACTIVE (requires capacity check)
  ARCHIVED: [],                      // Terminal state
};

/**
 * Returns true if moving from currentStatus to targetStatus is an allowed lifecycle transition.
 */
export function isValidProjectTransition(
  currentStatus: ProjectStatus,
  targetStatus: ProjectStatus
): boolean {
  if (currentStatus === targetStatus) return false;
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

/**
 * Returns true if the target status requires an active project quota capacity check.
 */
export function requiresCapacityCheck(targetStatus: ProjectStatus): boolean {
  return targetStatus === 'ACTIVE';
}
