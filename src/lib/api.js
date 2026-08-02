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

export async function uploadLiveSessionAudio(file, token) {
  const formData = new FormData();
  formData.append('audio', file);

  const response = await fetch(`${API_BASE_URL}/live-sessions/upload-audio`, {
    method: 'POST',
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || 'Audio upload failed.');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function analyzeLiveSession(payload, token) {
  return request('/live-sessions/analyze', {
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

export function analyzeLiveRequest(payload) {
  return request('/live-requests/analyze', {
    method: 'POST',
    body: payload,
  });
}

export function searchYoutubeVideos(query) {
  return request(`/youtube/search?q=${encodeURIComponent(query)}`);
}

export async function convertYoutubeToWav(url, token) {
  const response = await fetch(`${API_BASE_URL}/youtube/to-wav`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'YouTube conversion failed.');
  }

  return response.blob();
}

export function createLiveRequest(payload) {
  return request('/live-requests', {
    method: 'POST',
    body: payload,
  });
}

export function fetchAdminLiveRequests(token) {
  return request('/live-requests/admin', {
    token,
  });
}

export function reviewLiveRequest(requestId, payload, token) {
  return request(`/live-requests/${requestId}/review`, {
    method: 'PATCH',
    body: payload,
    token,
  });
}

export function deleteLiveRequest(requestId, token) {
  return request(`/live-requests/${requestId}`, {
    method: 'DELETE',
    token,
  });
}

export function convertLiveRequestToWav(requestId, token) {
  return request(`/live-requests/${requestId}/to-wav`, {
    method: 'POST',
    token,
  });
}

export function createServiceRequest(payload, token) {
  return request('/service-requests', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function fetchMyServiceRequests(token) {
  return request('/service-requests/mine', { token });
}

export function fetchAdminServiceRequests(token) {
  return request('/service-requests/admin', { token });
}

export function publishServiceQuote(requestId, payload, token) {
  return request(`/service-requests/${requestId}/quote`, {
    method: 'PATCH',
    body: payload,
    token,
  });
}
