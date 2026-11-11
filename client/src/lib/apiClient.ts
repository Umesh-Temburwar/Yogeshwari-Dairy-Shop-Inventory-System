import { ApiResponse } from '../types/index.js';

// Resolve API base URL dynamically:
// 1. In Node / runtime environments with service binding: reads process.env.SERVER_URL
// 2. In Vite browser environments with explicit env: reads import.meta.env.VITE_API_BASE_URL
// 3. Fallback: '/api/v1' (same-origin relative path routed via Vercel rewrites or local proxy)
const getApiBaseUrl = (): string => {
  if (typeof process !== 'undefined' && process.env && process.env.SERVER_URL) {
    return `${process.env.SERVER_URL.replace(/\/$/, '')}/api/v1`;
  }
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  if (metaEnv?.VITE_API_BASE_URL) {
    return metaEnv.VITE_API_BASE_URL;
  }
  return '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  public code: string;
  public details?: unknown;
  public statusCode: number;

  constructor(message: string, code = 'API_ERROR', statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const apiClient = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = localStorage.getItem('dairy_auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let responseData: ApiResponse<T>;
  try {
    responseData = await response.json();
  } catch {
    throw new ApiError(
      `Failed to parse server response (${response.status})`,
      'SERVER_PARSE_ERROR',
      response.status
    );
  }

  if (!response.ok || !responseData.success) {
    const error = responseData.error;
    throw new ApiError(
      error?.message || 'Request failed',
      error?.code || 'REQUEST_FAILED',
      response.status,
      error?.details
    );
  }

  return responseData.data as T;
};

