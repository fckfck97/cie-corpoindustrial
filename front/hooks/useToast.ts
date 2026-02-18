/**
 * Toast Notifications Hook
 * Wrapper around sonner for consistent toast handling
 */

import { toast as sonerToast } from 'sonner';

export function useToast() {
  return {
    success: (message: string) => sonerToast.success(message),
    error: (message: string) => sonerToast.error(message),
    info: (message: string) => sonerToast.info(message),
    warning: (message: string) => sonerToast.warning(message),
    loading: (message: string) => sonerToast.loading(message),
    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      }
    ) => sonerToast.promise(promise, messages),
  };
}
