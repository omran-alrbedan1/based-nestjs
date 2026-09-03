import { Throttle } from '@nestjs/throttler';

// Strict rate for auth and similarly sensitive endpoints.
export const strictThrottle = () =>
  Throttle({
    default: {
      ttl: 60000,
      limit: 5,
    },
  });

// Moderate rate for business workflows such as orders.
export const moderateThrottle = () =>
  Throttle({
    default: {
      ttl: 60000,
      limit: 15,
    },
  });
