const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export interface UtcDateRange {
  start: Date;
  endExclusive: Date;
}

export function getUtcDayRange(now: Date, timeZone: string): UtcDateRange {
  const date = dateInTimeZone(now, timeZone);
  const nextDate = dateInTimeZone(
    new Date(Date.UTC(date.year, date.month - 1, date.day) + DAY_IN_MILLISECONDS),
    'UTC',
  );

  return {
    start: localMidnightToUtc(date, timeZone),
    endExclusive: localMidnightToUtc(nextDate, timeZone),
  };
}

function dateInTimeZone(date: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return {
    year: Number(parts.find(({ type }) => type === 'year')?.value),
    month: Number(parts.find(({ type }) => type === 'month')?.value),
    day: Number(parts.find(({ type }) => type === 'day')?.value),
  };
}

function localMidnightToUtc(date: CalendarDate, timeZone: string): Date {
  const assumedUtc = Date.UTC(date.year, date.month - 1, date.day);
  let result = assumedUtc;

  // A second pass covers timezone-offset changes near a local day boundary.
  for (let pass = 0; pass < 2; pass += 1) {
    result = assumedUtc - offsetAt(new Date(result), timeZone);
  }

  return new Date(result);
}

function offsetAt(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const representedAsUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  );

  return representedAsUtc - date.getTime();
}
