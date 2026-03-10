import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { config } from '@/lib/config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getImageUrl = (path?: string | null) => {
  if (!path) return undefined;
  const rawPath = String(path).trim();

  if (/^https?:\/\//i.test(rawPath)) {
    try {
      const parsed = new URL(rawPath);
      parsed.pathname = parsed.pathname.replace(/\/media\/media\//g, '/media/');
      return parsed.toString();
    } catch {
      return rawPath;
    }
  }

  // Build image URLs against API origin and normalize exactly one "/media/" segment.
  let apiOrigin = config.api.baseUrl.trim().replace(/\/+$/, '');
  apiOrigin = apiOrigin.replace(/\/api$/i, '').replace(/\/media$/i, '');

  const normalizedPath = rawPath
    .replace(/^\/+/, '')
    .replace(/^api\/media\//i, 'media/')
    .replace(/^media\/media\//i, 'media/');

  const mediaRelativePath = normalizedPath.startsWith('media/')
    ? normalizedPath.slice('media/'.length)
    : normalizedPath;

  return `${apiOrigin}/media/${mediaRelativePath}`;
};
