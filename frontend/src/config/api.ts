const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || '';
const RAW_SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || '';

const PRODUCTION_BACKEND_ORIGIN = 'https://app360-50047570620.development.catalystappsail.in';
const LOCAL_DEV_ORIGIN = 'http://localhost:9000';

const stripTrailingSlashes = (url: string): string => url.replace(/\/+$/, '');

/**
 * Centralized API Base URL resolution.
 * - Uses NEXT_PUBLIC_API_URL when configured (normalized to include /api).
 * - In production, falls back to the deployed Catalyst AppSail backend URL.
 * - In local development only, falls back to http://localhost:9000/api.
 */
export const resolveApiBaseUrl = (): string => {
  if (RAW_API_URL) {
    const cleaned = stripTrailingSlashes(RAW_API_URL);
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  }

  if (process.env.NODE_ENV === 'development') {
    return `${LOCAL_DEV_ORIGIN}/api`;
  }

  return `${PRODUCTION_BACKEND_ORIGIN}/api`;
};

/**
 * Centralized Socket.IO Base URL resolution.
 * - Uses NEXT_PUBLIC_SOCKET_URL if explicitly provided.
 * - Otherwise derives the origin from NEXT_PUBLIC_API_URL by stripping /api.
 * - In production, falls back to the deployed Catalyst AppSail backend origin.
 * - In local development only, falls back to http://localhost:9000.
 */
export const resolveSocketBaseUrl = (): string => {
  if (RAW_SOCKET_URL) {
    return stripTrailingSlashes(RAW_SOCKET_URL);
  }

  if (RAW_API_URL) {
    return stripTrailingSlashes(RAW_API_URL).replace(/\/api$/i, '');
  }

  if (process.env.NODE_ENV === 'development') {
    return LOCAL_DEV_ORIGIN;
  }

  return PRODUCTION_BACKEND_ORIGIN;
};

export const API_BASE_URL = resolveApiBaseUrl();
export const SOCKET_BASE_URL = resolveSocketBaseUrl();

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  socketURL: SOCKET_BASE_URL,
  timeout: 15000,
  isConfigured: Boolean(RAW_API_URL) || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production',
};

export default API_CONFIG;
