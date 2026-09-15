import { MaintenanceCardStatus, MaintenanceWorkEventType } from 'generated/prisma/client';

export interface ActivityActor {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export type ActivityEventType =
  | 'CARD_CREATED'
  | 'CARD_CLOSED'
  | 'CARD_REOPENED'
  | 'WORK_CREATED'
  | 'WORK_UPDATED'
  | 'WORK_STARTED'
  | 'WORK_COMPLETED'
  | 'WORK_CANCELLED'
  | 'WORK_REOPENED'
  | 'WORK_REMOVED';

export interface ActivityItem {
  id: string;
  type: ActivityEventType;
  occurredAt: Date;
  actor: ActivityActor;
  /** Present for work events; null for card status events. */
  work: { id: number; description: string } | null;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
}

type CardStatusEventRow = {
  id: number;
  fromStatus: MaintenanceCardStatus | null;
  toStatus: MaintenanceCardStatus;
  createdAt: Date;
  changedBy: ActivityActor;
};

type WorkEventRow = {
  id: number;
  requiredWorkId: number | null;
  eventType: MaintenanceWorkEventType;
  fromStatus: string | null;
  toStatus: string | null;
  workDescriptionSnapshot: string;
  reason: string | null;
  createdAt: Date;
  changedBy: ActivityActor;
};

const WORK_EVENT_TYPE_MAP: Record<MaintenanceWorkEventType, ActivityEventType> = {
  CREATED: 'WORK_CREATED',
  UPDATED: 'WORK_UPDATED',
  STARTED: 'WORK_STARTED',
  COMPLETED: 'WORK_COMPLETED',
  CANCELLED: 'WORK_CANCELLED',
  REOPENED: 'WORK_REOPENED',
  REMOVED: 'WORK_REMOVED',
};

export function toCardActivityItem(event: CardStatusEventRow): ActivityItem {
  return {
    id: `card-event-${event.id}`,
    type: cardEventType(event.fromStatus, event.toStatus),
    occurredAt: event.createdAt,
    actor: event.changedBy,
    work: null,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    reason: null,
  };
}

export function toWorkActivityItem(event: WorkEventRow): ActivityItem {
  return {
    id: `work-event-${event.id}`,
    type: WORK_EVENT_TYPE_MAP[event.eventType],
    occurredAt: event.createdAt,
    actor: event.changedBy,
    work:
      event.requiredWorkId == null
        ? null
        : { id: event.requiredWorkId, description: event.workDescriptionSnapshot },
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    reason: event.reason,
  };
}

function cardEventType(
  from: MaintenanceCardStatus | null,
  to: MaintenanceCardStatus,
): ActivityEventType {
  if (from === null) return 'CARD_CREATED';
  if (from === MaintenanceCardStatus.OPEN && to === MaintenanceCardStatus.CLOSED) {
    return 'CARD_CLOSED';
  }
  return 'CARD_REOPENED';
}
