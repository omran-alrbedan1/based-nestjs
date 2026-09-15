import { MaintenanceWorkStatus } from 'generated/prisma/client';

/**
 * Persisted actor relation limited to the fields exposed on state responses.
 */
export interface WorkActorRecord {
  id: number;
  firstName: string | null;
  lastName: string | null;
}

export interface WorkStateResponse {
  id: number;
  status: MaintenanceWorkStatus;
  startedAt: Date | null;
  startedBy: WorkActorRecord | null;
  completedAt: Date | null;
  completedBy: WorkActorRecord | null;
  cancelledAt: Date | null;
  cancelledBy: WorkActorRecord | null;
  cancellationReason: string | null;
}

type WorkWithActors = {
  id: number;
  status: MaintenanceWorkStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  startedBy: WorkActorRecord | null;
  completedBy: WorkActorRecord | null;
  cancelledBy: WorkActorRecord | null;
};

export function toWorkStateResponse(work: WorkWithActors): WorkStateResponse {
  return {
    id: work.id,
    status: work.status,
    startedAt: work.startedAt,
    startedBy: work.startedBy,
    completedAt: work.completedAt,
    completedBy: work.completedBy,
    cancelledAt: work.cancelledAt,
    cancelledBy: work.cancelledBy,
    cancellationReason: work.cancellationReason,
  };
}
