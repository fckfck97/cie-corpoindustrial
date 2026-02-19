/**
 * Authentication Types
 */

export interface User {
  id: string;
  email?: string;
  username?: string;
  phone?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  documentType?: string;
  nuip?: string;
  role: 'admin' | 'manager' | 'employee';
  backendRole?: 'Admin' | 'enterprise' | 'employees' | string;
  companyId: string;
  enterprise?: string;
  enterpriseProfileCompleted?: boolean;
  enterpriseProfileMissing?: string[];
  employeeProfileCompleted?: boolean;
  employeeProfileMissing?: string[];
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
  verifyOtp: (payload: OtpVerifyPayload) => Promise<User>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}
