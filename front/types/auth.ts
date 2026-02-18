/**
 * Authentication Types
 */

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'manager' | 'employee';
  backendRole?: 'Admin' | 'enterprise' | 'employees' | string;
  companyId: string;
  enterprise?: string;
  permissions?: string[];
  avatar?: string;
}

export interface AuthTokens {
  access: string;
  refresh?: string;
  expiresIn?: number;
}

export interface OtpRequestPayload {
  email?: string;
  phone?: string;
}

export interface OtpRequestResponse {
  detail?: string;
  success?: string;
  is_new_user?: boolean;
  otp_debug_code?: string;
  debugCode?: string;
}

export interface OtpVerifyPayload {
  identifier: string;
  otp: string;
  source?: 'web' | string;
}

export interface OtpVerifyResponse {
  user: User;
  tokens: AuthTokens;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requestOtp: (payload: OtpRequestPayload) => Promise<OtpRequestResponse>;
  verifyOtp: (payload: OtpVerifyPayload) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}
