import { MaintenanceWorkStatus } from 'generated/prisma/client';

/**
 * Central state machine for required-work status transitions.
 *
 * Allowed transitions are documented below. Repeating an action that the work
 * is already in is treated as a no-op so the same action never overwrites
 * timestamps or creates duplicate timeline events.
 *
 * | Current      | Action   | New                         |
 * | ------------ | -------- | --------------------------- |
 * | PENDING      | start    | IN_PROGRESS                 |
 * | PENDING      | complete | COMPLETED                   |
 * | IN_PROGRESS  | complete | COMPLETED                   |
 * | PENDING      | cancel   | CANCELLED                   |
 * | IN_PROGRESS  | cancel   | CANCELLED                   |
 * | COMPLETED    | reopen   | PENDING (or IN_PROGRESS)    |
 * | CANCELLED    | reopen   | PENDING                     |
 */

export type WorkStateAction = 'start' | 'complete' | 'cancel' | 'reopen';

export interface WorkTransitionResult {
  changed: boolean;
  from: MaintenanceWorkStatus;
  to: MaintenanceWorkStatus;
}

const COMPLETE_TRANSITIONS: ReadonlyMap<MaintenanceWorkStatus, MaintenanceWorkStatus> = new Map([
  [MaintenanceWorkStatus.PENDING, MaintenanceWorkStatus.COMPLETED],
  [MaintenanceWorkStatus.IN_PROGRESS, MaintenanceWorkStatus.COMPLETED],
  [MaintenanceWorkStatus.COMPLETED, MaintenanceWorkStatus.COMPLETED],
]);

const CANCEL_TRANSITIONS: ReadonlyMap<MaintenanceWorkStatus, MaintenanceWorkStatus> = new Map([
  [MaintenanceWorkStatus.PENDING, MaintenanceWorkStatus.CANCELLED],
  [MaintenanceWorkStatus.IN_PROGRESS, MaintenanceWorkStatus.CANCELLED],
  [MaintenanceWorkStatus.CANCELLED, MaintenanceWorkStatus.CANCELLED],
]);

export function resolveWorkTransition(
  current: MaintenanceWorkStatus,
  action: WorkStateAction,
): WorkTransitionResult | null {
  switch (action) {
    case 'start': {
      if (current === MaintenanceWorkStatus.PENDING) {
        return { changed: true, from: current, to: MaintenanceWorkStatus.IN_PROGRESS };
      }
      if (current === MaintenanceWorkStatus.IN_PROGRESS) {
        return { changed: false, from: current, to: MaintenanceWorkStatus.IN_PROGRESS };
      }
      return null;
    }
    case 'complete': {
      const to = COMPLETE_TRANSITIONS.get(current);
      if (to === undefined) return null;
      return { changed: current !== to, from: current, to };
    }
    case 'cancel': {
      const to = CANCEL_TRANSITIONS.get(current);
      if (to === undefined) return null;
      return { changed: current !== to, from: current, to };
    }
    case 'reopen':
      return resolveReopen(current);
    default:
      return null;
  }
}

function resolveReopen(current: MaintenanceWorkStatus): WorkTransitionResult | null {
  if (current === MaintenanceWorkStatus.COMPLETED) {
    return { changed: true, from: current, to: MaintenanceWorkStatus.PENDING };
  }
  if (current === MaintenanceWorkStatus.CANCELLED) {
    return { changed: true, from: current, to: MaintenanceWorkStatus.PENDING };
  }
  return null;
}

/**
 * Resolves a reopen targeting a specific status. Only COMPLETED work may be
 * reopened back to IN_PROGRESS. CANCELLED work always returns to PENDING.
 */
export function resolveReopenTo(
  current: MaintenanceWorkStatus,
  targetStatus: MaintenanceWorkStatus,
): WorkTransitionResult | null {
  if (current === MaintenanceWorkStatus.COMPLETED) {
    if (targetStatus === MaintenanceWorkStatus.PENDING) {
      return { changed: true, from: current, to: MaintenanceWorkStatus.PENDING };
    }
    if (targetStatus === MaintenanceWorkStatus.IN_PROGRESS) {
      return { changed: true, from: current, to: MaintenanceWorkStatus.IN_PROGRESS };
    }
    return null;
  }
  if (current === MaintenanceWorkStatus.CANCELLED) {
    if (targetStatus === MaintenanceWorkStatus.PENDING) {
      return { changed: true, from: current, to: MaintenanceWorkStatus.PENDING };
    }
    return null;
  }
  return null;
}

/** Tells whether a work item has entered a terminal state (completed or cancelled). */
export function isWorkTerminal(status: MaintenanceWorkStatus): boolean {
  return status === MaintenanceWorkStatus.COMPLETED || status === MaintenanceWorkStatus.CANCELLED;
}
