import { resolveApiBaseUrl } from './runtimeConfig';

const API_BASE_URL = resolveApiBaseUrl();

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token
        ? {
            Authorization: `Bearer ${options.token}`,
          }
        : {}),
      ...options.headers,
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || 'Request failed.');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const apiBaseUrl = API_BASE_URL;

export function fetchBootstrap() {
  return request('/bootstrap');
}

export function fetchCurrentUser(token) {
  return request('/auth/me', { token });
}

export function login(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export function signup(payload) {
  return request('/auth/signup', {
    method: 'POST',
    body: payload,
  });
}

export function logout(token) {
  return request('/auth/logout', {
    method: 'POST',
    token,
  });
}

export function createLiveSession(payload, token) {
  return request('/live-sessions', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function updateLiveSession(sessionId, payload, token) {
  return request(`/live-sessions/${sessionId}`, {
    method: 'PATCH',
    body: payload,
    token,
  });
}

export function deleteLiveSession(sessionId, token) {
  return request(`/live-sessions/${sessionId}`, {
    method: 'DELETE',
    token,
  });
}

export function updateLiveStream(payload, token) {
  return request('/live-stream', {
    method: 'PATCH',
    body: payload,
    token,
  });
}

export function fetchAdminLiveStream(token) {
  return request('/live-stream/admin', {
    token,
  });
}

export function createMuxLiveStream(payload, token) {
  return request('/live-stream/mux', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function createArchiveItem(payload, token) {
  return request('/archive-items', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function updateArchiveItem(itemId, payload, token) {
  return request(`/archive-items/${itemId}`, {
    method: 'PATCH',
    body: payload,
    token,
  });
}

export function deleteArchiveItem(itemId, token) {
  return request(`/archive-items/${itemId}`, {
    method: 'DELETE',
    token,
  });
}

export function createAnamSessionToken() {
  return request('/session-token', {
    method: 'POST',
  });
}
