import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
