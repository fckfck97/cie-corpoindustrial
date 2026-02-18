'use client';

/**
 * Authentication Context
 * Provides auth state and methods to entire app
 */

import React, { createContext, useCallback, useEffect, useState } from 'react';
import { requestOtp, verifyOtp as verifyOtpLib, verifySession, clearAuth } from '@/lib/auth';
import type {
  User,
  AuthContextType,
  OtpRequestPayload,
  OtpRequestResponse,
  OtpVerifyPayload,
} from '@/types/auth';
import { config } from '@/lib/config';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const restoredUser = await verifySession();
        if (restoredUser) {
          setUser(restoredUser);
        }
      } catch (err) {
        console.error('[v0] Session restore failed:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restore();
  }, []);

  const handleRequestOtp = useCallback(
    async (payload: OtpRequestPayload): Promise<OtpRequestResponse> => {
      try {
        setError(null);
        const response = await requestOtp(payload);

        // In dev mode, show debug code if available
        const debugCode = response.otp_debug_code || response.debugCode;
        if (config.app.isDev && debugCode) {
          console.log('[v0] OTP Debug Code:', debugCode);
        }

        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to request OTP';
        setError(message);
        throw err;
      }
    },
    []
  );

  const handleVerifyOtp = useCallback(
    async (payload: OtpVerifyPayload): Promise<void> => {
      try {
        setError(null);
        const { user: newUser } = await verifyOtpLib(payload);
        setUser(newUser);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to verify OTP';
        setError(message);
        throw err;
      }
    },
    []
  );

  const handleLogout = useCallback(() => {
    clearAuth();
    setUser(null);
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    requestOtp: handleRequestOtp,
    verifyOtp: handleVerifyOtp,
    logout: handleLogout,
    restoreSession: async () => {
      try {
        setIsLoading(true);
        const restoredUser = await verifySession();
        setUser(restoredUser);
      } catch (err) {
        console.error('[v0] Session restore failed:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
