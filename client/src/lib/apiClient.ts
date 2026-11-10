import { ApiResponse } from '../types/index.js';

const API_BASE_URL = '/api/v1';

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

