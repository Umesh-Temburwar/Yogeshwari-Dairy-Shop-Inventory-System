export type UserRole = 'admin' | 'owner' | 'manager' | 'cashier' | 'delivery_boy' | 'customer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  phone?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

