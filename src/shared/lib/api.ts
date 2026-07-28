import { Capacitor } from '@capacitor/core';

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
