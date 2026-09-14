export interface OptionListFilters {
  search?: string;
  isActive?: boolean | string;
}

export function buildOptionWhereInput(filters: OptionListFilters): Record<string, unknown> {
  const { search } = filters;
  const isActive = toBoolean(filters.isActive);

  return {
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { labelEn: { contains: search, mode: 'insensitive' } },
            { labelAr: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function toBoolean(value: boolean | string | undefined): boolean | undefined {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}
