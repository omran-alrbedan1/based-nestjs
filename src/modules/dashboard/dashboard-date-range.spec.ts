import { getUtcDayRange } from './dashboard-date-range';

describe('getUtcDayRange', () => {
  it('converts an Asia/Amman calendar day to an exclusive UTC range', () => {
    const range = getUtcDayRange(new Date('2026-09-04T00:30:00.000Z'), 'Asia/Amman');

    expect(range.start.toISOString()).toBe('2026-09-03T21:00:00.000Z');
    expect(range.endExclusive.toISOString()).toBe('2026-09-04T21:00:00.000Z');
  });

  it('selects the local calendar date rather than the UTC date', () => {
    const range = getUtcDayRange(new Date('2026-09-03T22:00:00.000Z'), 'Asia/Amman');

    expect(range.start.toISOString()).toBe('2026-09-03T21:00:00.000Z');
  });
});
