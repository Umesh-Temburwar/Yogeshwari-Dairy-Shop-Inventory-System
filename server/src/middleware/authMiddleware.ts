import { Request, Response, NextFunction } from 'express';
import { supabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { UserRole } from '../types/express.js';

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];

    // Development / offline mock token support
    if (token.startsWith('dev-token-')) {
      const rolePart = token.replace('dev-token-', '') as UserRole;
      const validRoles: UserRole[] = ['admin', 'owner', 'manager', 'cashier', 'delivery_boy'];
      const role: UserRole = validRoles.includes(rolePart) ? rolePart : 'cashier';

      req.user = {
        id: `dev-${role}-id`,
        email: `${role}@dairy.local`,
        role,
        fullName: `Dev ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      };
      return next();
    }

    if (!isSupabaseConfigured() || !supabaseClient) {
      // Supabase is not configured yet, fallback to demo admin for seamless DX
      req.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@dairy.local',
        role: 'admin',
        fullName: 'Demo Shop Admin',
      };
      return next();
    }

    // Verify token with Supabase
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData?.user) {
      throw new AppError('Invalid or expired authentication token', 401, 'INVALID_TOKEN');
    }

    // Fetch user profile from Supabase profiles table
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile) {
      // Default fallback if profile is being created by trigger
      req.user = {
        id: userData.user.id,
        email: userData.user.email || '',
        role: 'cashier',
        fullName: userData.user.user_metadata?.full_name || 'Staff Member',
      };
      return next();
    }

    req.user = {
      id: profile.id,
      email: userData.user.email || '',
      role: profile.role as UserRole,
      fullName: profile.full_name || undefined,
    };

    next();
  } catch (error) {
    next(error);
  }
};

