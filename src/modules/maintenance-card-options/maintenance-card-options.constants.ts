export const OPTION_KIND_ROUTE_MAP = {
  'visit-reasons': 'visitReason',
  'vehicle-conditions': 'vehicleCondition',
  'vehicle-items': 'vehicleItem',
} as const;

export type OptionKind = (typeof OPTION_KIND_ROUTE_MAP)[keyof typeof OPTION_KIND_ROUTE_MAP];
