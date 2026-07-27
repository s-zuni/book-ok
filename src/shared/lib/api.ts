import { Capacitor } from '@capacitor/core';

/**
 * API Base URL for native/web environments.
 * - Native (Capacitor): Points to the deployed Vercel server
 * - Web (Browser): Uses relative paths (same origin)
 */
const API_BASE_URL = Capacitor.isNativePlatform()
  ? 'https://bookok.kr'
  : '';

/**
 * Prepends the correct base URL for API calls.
 * On native apps, API routes don't exist locally so we call the Vercel server.
 * On web, relative paths work as expected.
 *
 * @example
 * fetch(apiUrl('/api/recommendations?query=test'))
 * // Native: 'https://bookok.kr/api/recommendations?query=test'
 * // Web:    '/api/recommendations?query=test'
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
