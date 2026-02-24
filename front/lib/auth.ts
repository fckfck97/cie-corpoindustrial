/**
 * Authentication Logic
 * Handles OTP request, verification, token management
 */

import { config } from './config';
import { apiClient } from './api-client';
import type {
  User,
  AuthTokens,
  OtpRequestPayload,
  OtpRequestResponse,
  OtpVerifyPayload,
} from '@/types/auth';

const mapBackendRole = (role?: string): User['role'] => {
  if (role === 'Admin') return 'admin';
  if (role === 'enterprise') return 'manager';
  return 'employee';
};

const normalizeUser = (raw: any): User => {
  const firstName = raw?.first_name || raw?.firstName || '';
  const lastName = raw?.last_name || raw?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    id: String(raw?.id ?? ''),
    email: raw?.email,
    username: raw?.username,
    phone: raw?.phone,
    firstName,
    lastName,
    name: raw?.name || fullName || raw?.email || 'Usuario',
    documentType: raw?.document_type,
    nuip: raw?.nuip,
    role: mapBackendRole(raw?.role),
    backendRole: raw?.role,
    companyId: raw?.enterprise || raw?.companyId || 'N/D',
    enterprise: raw?.enterprise,
    enterpriseProfileCompleted: raw?.enterprise_profile_completed,
    enterpriseProfileMissing: Array.isArray(raw?.enterprise_profile_missing)
      ? raw.enterprise_profile_missing
      : [],
    employeeProfileCompleted: raw?.employee_profile_completed,
    employeeProfileMissing: Array.isArray(raw?.employee_profile_missing)
      ? raw.employee_profile_missing
      : [],
    permissions: raw?.permissions ?? [],
    avatar: raw?.picture || raw?.avatar,
  };
};

function extractTokens(payload: any): AuthTokens {
  const access = payload?.access || payload?.token || payload?.accessToken;
  const refresh = payload?.refresh || payload?.refreshToken;

  if (!access) {
    throw new Error('Respuesta inválida: no llegó token de acceso.');
  }

  return { access, refresh, expiresIn: payload?.expiresIn };
}

/**
 * Request OTP for phone/email
 */
export async function requestOtp(payload: OtpRequestPayload): Promise<OtpRequestResponse> {
  return apiClient.post('/authentication/login/otp/request/web/', payload, { skipAuth: true });
}

/**
 * Verify OTP code and get tokens
 */
export async function verifyOtp(
  payload: OtpVerifyPayload
): Promise<{ user: User; tokens: AuthTokens }> {
  const response = await apiClient.post<any>('/authentication/login/otp/verify/', payload, {
    skipAuth: true,
  });

  const tokens = extractTokens(response);
  const user = normalizeUser(response?.user ?? {});

  // Store tokens
  setTokens(tokens);
  persistUser(user);

  return { user, tokens };
}

/**
 * Store tokens in localStorage
 */
export function setTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(config.auth.tokenKey, tokens.access);

  if (tokens.refresh) {
    localStorage.setItem(config.auth.refreshTokenKey, tokens.refresh);
  }

  if (tokens.expiresIn) {
    const expiresAt = new Date().getTime() + tokens.expiresIn * 1000;
    localStorage.setItem('__token_expires_at', expiresAt.toString());
  }
}

/**
 * Get stored access token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(config.auth.tokenKey);
}

/**
 * Clear all auth data
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;

  localStorage.clear();
  sessionStorage.clear();
}

export function persistUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(config.auth.sessionKey, JSON.stringify(user));
}

/**
 * Check if token is expired
 */
export function isTokenExpired(): boolean {
  if (typeof window === 'undefined') return true;

  const expiresAtStr = localStorage.getItem('__token_expires_at');
  if (!expiresAtStr) return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  return new Date().getTime() > expiresAt;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  return !!token && !isTokenExpired();
}

/**
 * Verify token with backend and get user
 */
export async function verifySession(): Promise<User | null> {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(config.auth.sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        const isEnterprise =
          parsed?.backendRole === 'enterprise' || parsed?.role === 'manager';
        const isEmployee =
          parsed?.backendRole === 'employees' || parsed?.role === 'employee';
        const hasCompletionFlag =
          typeof parsed?.enterpriseProfileCompleted === 'boolean';
        const hasEmployeeCompletionFlag =
          typeof parsed?.employeeProfileCompleted === 'boolean';
        if (
          (!isEnterprise && !isEmployee) ||
          (isEnterprise && hasCompletionFlag) ||
          (isEmployee && hasEmployeeCompletionFlag)
        ) {
          return parsed;
        }
      }
    }

    // Fallback: obtener usuario autenticado desde endpoints backend disponibles
    const endpoints = ['/authentication/users/me/', '/authentication/edit/'];
    for (const endpoint of endpoints) {
      try {
        const response: any = await apiClient.get(endpoint);
        const mapped = normalizeUser(response ?? {});
        persistUser(mapped);
        return mapped;
      } catch {
        // intenta el siguiente endpoint
      }
    }
    throw new Error('No se pudo restaurar la sesión desde el backend.');
  } catch (error) {
    console.error('[v0] Session verification failed:', error);
    clearAuth();
    return null;
  }
}
