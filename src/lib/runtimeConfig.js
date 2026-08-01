const REMOTE_API_BASE_URL = 'https://djkhalilnahhat-back.onrender.com/api';

function normalizeBaseUrl(value) {
  return value ? value.replace(/\/+$/, '') : '';
}

export function resolveApiBaseUrl() {
  const configuredApiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (typeof window === 'undefined') {
    return REMOTE_API_BASE_URL;
  }

  const { hostname, protocol } = window.location;
  const isLocalLikeHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

  if (isLocalLikeHost) {
    return `${protocol}//${hostname}:4000/api`;
  }

  return REMOTE_API_BASE_URL;
}

export function resolveBookingApiUrl() {
  const configuredBookingApiUrl = normalizeBaseUrl(import.meta.env.VITE_BOOKING_API_URL);

  if (configuredBookingApiUrl) {
    return configuredBookingApiUrl;
  }

  return `${resolveApiBaseUrl()}/bookings`;
}
