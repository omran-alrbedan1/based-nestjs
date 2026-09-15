import { MaintenanceWorkStatus } from 'generated/prisma/client';
import {
  isWorkTerminal,
  resolveReopenTo,
  resolveWorkTransition,
} from './maintenance-work-transition';

describe('resolveWorkTransition', () => {
  it('starts only PENDING work', () => {
    expect(resolveWorkTransition(MaintenanceWorkStatus.PENDING, 'start')).toEqual({
      changed: true,
      from: MaintenanceWorkStatus.PENDING,
      to: MaintenanceWorkStatus.IN_PROGRESS,
    });
  });

  it('treats starting already running work as a no-op', () => {
    expect(resolveWorkTransition(MaintenanceWorkStatus.IN_PROGRESS, 'start')).toEqual({
      changed: false,
      from: MaintenanceWorkStatus.IN_PROGRESS,
      to: MaintenanceWorkStatus.IN_PROGRESS,
    });
  });

  it('completes PENDING or IN_PROGRESS work', () => {
    expect(resolveWorkTransition(MaintenanceWorkStatus.PENDING, 'complete')?.to).toBe(
      MaintenanceWorkStatus.COMPLETED,
    );
    expect(resolveWorkTransition(MaintenanceWorkStatus.IN_PROGRESS, 'complete')?.to).toBe(
      MaintenanceWorkStatus.COMPLETED,
    );
  });

  it('completing/completing already-completed work is a no-op', () => {
    const result = resolveWorkTransition(MaintenanceWorkStatus.COMPLETED, 'complete');
    expect(result?.changed).toBe(false);
    expect(result?.to).toBe(MaintenanceWorkStatus.COMPLETED);
  });

  it('cancels PENDING or IN_PROGRESS work', () => {
    expect(resolveWorkTransition(MaintenanceWorkStatus.PENDING, 'cancel')?.to).toBe(
      MaintenanceWorkStatus.CANCELLED,
    );
    expect(resolveWorkTransition(MaintenanceWorkStatus.IN_PROGRESS, 'cancel')?.to).toBe(
      MaintenanceWorkStatus.CANCELLED,
    );
  });

  it('rejects starting or cancelling terminal work', () => {
    expect(resolveWorkTransition(MaintenanceWorkStatus.COMPLETED, 'start')).toBeNull();
    expect(resolveWorkTransition(MaintenanceWorkStatus.CANCELLED, 'start')).toBeNull();
    expect(resolveWorkTransition(MaintenanceWorkStatus.COMPLETED, 'cancel')).toBeNull();
  });
});

describe('resolveReopenTo', () => {
  it('reopens COMPLETED work back to PENDING or IN_PROGRESS', () => {
    expect(
      resolveReopenTo(MaintenanceWorkStatus.COMPLETED, MaintenanceWorkStatus.PENDING)?.to,
    ).toBe(MaintenanceWorkStatus.PENDING);
    expect(
      resolveReopenTo(MaintenanceWorkStatus.COMPLETED, MaintenanceWorkStatus.IN_PROGRESS)?.to,
    ).toBe(MaintenanceWorkStatus.IN_PROGRESS);
  });

  it('reopens CANCELLED work only to PENDING', () => {
    expect(
      resolveReopenTo(MaintenanceWorkStatus.CANCELLED, MaintenanceWorkStatus.PENDING)?.to,
    ).toBe(MaintenanceWorkStatus.PENDING);
    expect(
      resolveReopenTo(MaintenanceWorkStatus.CANCELLED, MaintenanceWorkStatus.IN_PROGRESS),
    ).toBeNull();
  });

  it('rejects reopening non-terminal work', () => {
    expect(
      resolveReopenTo(MaintenanceWorkStatus.PENDING, MaintenanceWorkStatus.PENDING),
    ).toBeNull();
    expect(
      resolveReopenTo(MaintenanceWorkStatus.IN_PROGRESS, MaintenanceWorkStatus.PENDING),
    ).toBeNull();
  });
});

describe('isWorkTerminal', () => {
  it('flags COMPLETED and CANCELLED as terminal', () => {
    expect(isWorkTerminal(MaintenanceWorkStatus.COMPLETED)).toBe(true);
    expect(isWorkTerminal(MaintenanceWorkStatus.CANCELLED)).toBe(true);
  });

  it('treats PENDING and IN_PROGRESS as active', () => {
    expect(isWorkTerminal(MaintenanceWorkStatus.PENDING)).toBe(false);
    expect(isWorkTerminal(MaintenanceWorkStatus.IN_PROGRESS)).toBe(false);
  });
});
