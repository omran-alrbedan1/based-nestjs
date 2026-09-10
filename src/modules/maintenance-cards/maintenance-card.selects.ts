export const customerCardSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  isActive: true,
} as const;

export const vehicleCardSelect = {
  id: true,
  make: true,
  model: true,
  manufactureYear: true,
  plateNumber: true,
  vin: true,
  color: true,
  transmission: true,
  isActive: true,
} as const;

export const userCardSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

export const maintenanceCardDetailInclude = {
  customer: { select: customerCardSelect },
  vehicleOwnership: {
    include: {
      vehicle: { select: vehicleCardSelect },
      customer: { select: customerCardSelect },
    },
  },
  createdBy: { select: userCardSelect },
  closedBy: { select: userCardSelect },
  visitReasons: {
    orderBy: { selectedAt: 'asc' },
    include: { visitReason: true },
  },
  conditionOptions: {
    orderBy: { selectedAt: 'asc' },
    include: { conditionOption: true },
  },
  itemOptions: {
    orderBy: { selectedAt: 'asc' },
    include: { itemOption: true },
  },
  requiredWorks: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
  statusEvents: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { changedBy: { select: userCardSelect } },
  },
} satisfies Prisma.MaintenanceCardInclude;
import { Prisma } from 'generated/prisma/client';
