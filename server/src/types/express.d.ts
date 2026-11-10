export type UserRole = 'admin' | 'owner' | 'manager' | 'cashier' | 'delivery_boy';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

