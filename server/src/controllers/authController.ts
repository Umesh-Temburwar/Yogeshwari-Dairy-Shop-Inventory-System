import { Request, Response, NextFunction } from 'express';
import { supabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { LoginInput, RegisterInput, ForgotPasswordInput } from '../schemas/authSchemas.js';
import { AppError } from '../utils/AppError.js';
import { UserRole } from '../types/express.js';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    // Check dev quick logins
    if (email.endsWith('@dairy.local') || !isSupabaseConfigured()) {
      let role: UserRole = 'admin';
      let fullName = 'Shop Admin';
      if (email.startsWith('cashier')) {
        role = 'cashier';
        fullName = 'Counter Cashier';
      } else if (email.startsWith('manager')) {
        role = 'manager';
        fullName = 'Stock Manager';
      } else if (email.startsWith('owner')) {
        role = 'owner';
        fullName = 'Shop Owner';
      } else if (email.startsWith('delivery')) {
        role = 'delivery_boy';
        fullName = 'Delivery Partner';
      }

      sendSuccess(res, {
        user: {
          id: `dev-${role}-id`,
          email,
          fullName,
          role,
        },
        token: `dev-token-${role}`,
      }, 'Login successful');
      return;
    }

    if (!supabaseClient) {
      throw new AppError('Supabase client not initialized', 500);
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      throw new AppError(error?.message || 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Fetch user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', data.user.id)
      .single();

    sendSuccess(res, {
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: profile?.full_name || data.user.user_metadata?.full_name || 'Staff User',
        role: profile?.role || 'cashier',
      },
      token: data.session.access_token,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, fullName, role } = req.body as RegisterInput;

    if (!isSupabaseConfigured() || !supabaseClient) {
      sendSuccess(res, {
        user: {
          id: `dev-${role}-id`,
          email,
          fullName,
          role,
        },
        token: `dev-token-${role}`,
      }, 'User registered (Dev Mode)', 201);
      return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error || !data.user) {
      throw new AppError(error?.message || 'Registration failed', 400, 'REGISTRATION_FAILED');
    }

    sendSuccess(res, {
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName,
        role,
      },
      token: data.session?.access_token || null,
    }, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    sendSuccess(res, { user: req.user });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body as ForgotPasswordInput;

    if (!isSupabaseConfigured() || !supabaseClient) {
      sendSuccess(res, null, `Password reset email sent to ${email} (Dev Mode)`);
      return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
    if (error) {
      throw new AppError(error.message, 400, 'PASSWORD_RESET_FAILED');
    }

    sendSuccess(res, null, `Password reset email sent to ${email}`);
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, null, 'Logged out successfully');
};

