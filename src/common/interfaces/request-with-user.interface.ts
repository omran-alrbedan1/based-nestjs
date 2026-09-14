import { Request } from 'express';
import { Role } from 'generated/prisma/client';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: Role;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
