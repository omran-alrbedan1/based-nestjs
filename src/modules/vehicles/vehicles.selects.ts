export const vehicleSelect = {
  id: true,
  make: true,
  model: true,
  manufactureYear: true,
  plateNumber: true,
  vin: true,
  color: true,
  transmission: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const customerSummarySelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  isActive: true,
} as const;
