/**
 * API Client Layer
 * Handles all HTTP requests with auth headers, timeout, error handling
 */

import { config } from './config';
import {
  AppError,
  UnauthorizedError,
  NetworkError,
  ValidationError,
} from './errors';
import { ApiResponse } from '@/types/api';

interface RequestOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(config.auth.tokenKey);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    let data: any = null;

    try {
      data = await response.json();
    } catch {
      try {
        data = await response.text();
      } catch {
        data = null;
      }
    }

    // Handle error responses
    if (!response.ok) {
      console.error('[v0] API Error Response:', {
        status: response.status,
        data,
      });

      if (response.status === 401) {
        // Clear auth and redirect to login
        localStorage.clear();
        sessionStorage.clear();
        if (typeof window !== 'undefined') {
          const next = `${window.location.pathname}${window.location.search || ''}`;
          window.location.href = `/login?next=${encodeURIComponent(next)}`;
        }
        throw new UnauthorizedError('Authentication required');
      }

      if (response.status === 400) {
        const extractFirstError = (payload: any): string | null => {
          if (!payload || typeof payload !== 'object') return null;
          const keys = Object.keys(payload);
          if (!keys.length) return null;
          const firstValue = payload[keys[0]];
          if (typeof firstValue === 'string' && firstValue.trim()) return firstValue;
          if (Array.isArray(firstValue) && firstValue.length) {
            const first = firstValue[0];
            if (typeof first === 'string' && first.trim()) return first;
          }
          if (typeof firstValue === 'object') {
            return extractFirstError(firstValue);
          }
          return null;
        };

        const validationMessage =
          (typeof data === 'object' && (data?.detail || data?.error || data?.message)) ||
          extractFirstError(data) ||
          (typeof data === 'string' && data.trim()) ||
          'Validation failed';
        throw new ValidationError(
          String(validationMessage),
          typeof data === 'object' ? data : { raw: data }
        );
      }

      const errorMessage =
        typeof data === 'object'
          ? data?.detail || data?.error?.message || data?.error || data?.message
          : data;

      throw new AppError(
        (typeof errorMessage === 'string' && errorMessage.trim()) ? errorMessage : `HTTP ${response.status}`,
        `HTTP_${response.status}`,
        response.status
      );
    }

    if (response.status === 204 || data === '' || data == null) {
      return {} as T;
    }

    return data;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    const { timeout = this.timeout, skipAuth = false, ...fetchOptions } = options;

    const isFormData =
      typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
    const headers = new Headers(fetchOptions.headers || {});
    if (isFormData) {
      headers.delete('Content-Type');
    } else if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (!skipAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.set('Authorization', `JWT ${token}`);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(`Request timeout after ${timeout}ms`);
      }

      if (error instanceof Error) {
        throw new NetworkError(error.message);
      }

      throw new NetworkError('Unknown network error');
    }
  }

  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[v0] GET:', url);

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[v0] POST:', url, data);

    const body =
      typeof FormData !== 'undefined' && data instanceof FormData
        ? data
        : data
          ? JSON.stringify(data)
          : undefined;
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      body,
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[v0] PUT:', url, data);

    const body =
      typeof FormData !== 'undefined' && data instanceof FormData
        ? data
        : data
          ? JSON.stringify(data)
          : undefined;
    const response = await this.fetchWithTimeout(url, {
      method: 'PUT',
      body,
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[v0] PATCH:', url, data);

    const body =
      typeof FormData !== 'undefined' && data instanceof FormData
        ? data
        : data
          ? JSON.stringify(data)
          : undefined;
    const response = await this.fetchWithTimeout(url, {
      method: 'PATCH',
      body,
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[v0] DELETE:', url);

    const response = await this.fetchWithTimeout(url, {
      method: 'DELETE',
      ...options,
    });

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient(config.api.baseUrl, config.api.timeout);
