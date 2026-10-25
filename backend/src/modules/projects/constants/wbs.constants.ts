/**
 * DEZOBUILD Work Breakdown Structure (WBS) Constants
 */

export const WBS_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'] as const;
export type WbsStatus = (typeof WBS_STATUSES)[number];
