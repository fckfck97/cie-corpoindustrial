import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { config } from '@/lib/config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getImageUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  // ensure baseurl doesn't have trailing slash if path has leading slash, or handle it
  const baseUrl = config.api.baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};
