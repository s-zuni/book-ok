import { Capacitor } from '@capacitor/core';
import { supabaseAnonKey } from './supabase';

/**
 * API Base URL for native/web environments.
 * - Native (Capacitor): Points to the deployed Vercel server
 * - Web (Browser): Uses relative paths (same origin)
 */
const API_BASE_URL = Capacitor.isNativePlatform()
  ? 'https://www.bookok.kr'
  : '';

/**
 * Prepends the correct base URL for API calls and normalizes trailing slashes
 * to avoid 308 permanent redirect issues on native WebViews.
 *
 * @example
 * fetch(apiUrl('/api/recommendations?query=test'))
 * // Native: 'https://www.bookok.kr/api/recommendations/?query=test'
 * // Web:    '/api/recommendations/?query=test'
 */
export function apiUrl(path: string): string {
  if (!path) return path;
  
  const [pathname, search] = path.split('?');
  let normalizedPath = pathname;
  
  // Append trailing slash if missing and not a file path
  if (normalizedPath && !normalizedPath.endsWith('/') && !normalizedPath.split('/').pop()?.includes('.')) {
    normalizedPath = `${normalizedPath}/`;
  }
  
  const queryString = search ? `?${search}` : '';
  return `${API_BASE_URL}${normalizedPath}${queryString}`;
}

/**
 * CORS-safe fetch helper that transparently uses CapacitorHttp for Native Mobile,
 * and standard fetch for Web Browsers. Automatically injects required Supabase
 * authorization headers for Edge Function calls to prevent 401 Unauthorized errors.
 */
export async function safeFetch(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  const headers = { ...(options.headers || {}) };

  // If calling Supabase Edge Functions, automatically ensure Authorization and apikey headers are present
  if (url.includes('/functions/v1/')) {
    if (!headers['apikey']) {
      headers['apikey'] = supabaseAnonKey;
    }
    if (!headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const { CapacitorHttp } = await import('@capacitor/core');
      
      const response = await CapacitorHttp.request({
        url: url,
        method: options.method || 'GET',
        headers: headers,
        data: options.body ? JSON.parse(options.body) : undefined,
      });

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => response.data,
      };
    } catch (err) {
      console.warn("CapacitorHttp failed, falling back to standard fetch:", err);
    }
  }

  return fetch(url, { ...options, headers });
}
