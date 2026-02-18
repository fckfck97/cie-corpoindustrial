/**
 * Application Configuration
 * Centralized config management for environment variables and app settings
 */

export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    timeout: 30000,
  },
  app: {
    env: (process.env.NEXT_PUBLIC_APP_ENV || 'development') as
      | 'development'
      | 'staging'
      | 'production',
    isDev: process.env.NEXT_PUBLIC_APP_ENV === 'development',
    isStaging: process.env.NEXT_PUBLIC_APP_ENV === 'staging',
    isProd: process.env.NEXT_PUBLIC_APP_ENV === 'production',
  },
  auth: {
    tokenKey: '__auth_token',
    refreshTokenKey: '__refresh_token',
    sessionKey: '__session_id',
  },
} as const;
