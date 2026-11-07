import { trackPreflightRequest } from './preflightReadiness';
import { resolveApiBaseUrl } from './runtimeConfig';

const API_BASE_URL = resolveApiBaseUrl();

async function request(path, options = {}) {
  const complete = trackPreflightRequest(path, options);
  const isRead = (options.method || 'GET').toUpperCase() === 'GET';
  const controller = isRead ? new AbortController() : null;
  const abort = () => controller?.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener('abort', abort, {once:true});
  let timedOut = false;
  const timer = controller ? setTimeout(() => { timedOut = true; controller.abort(); }, 15000) : null;
  try {
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
      signal: controller?.signal || options.signal,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = await response.json().catch(error => {
      if (complete && response.ok && response.status !== 204) throw new Error('Page content could not be read. Please retry.', {cause:error});
      return {};
    });

    if (!response.ok) {
      const fallback=response.status===413?'This request is too large. Reduce the lyric rows or recording details and try again.':response.status===429?'Too many requests. Wait before trying again.':response.status===401?'Your session has expired. Sign in again.':response.status>=500?'The API server could not complete this request (HTTP '+response.status+'). Your changes have been kept in the editor.':'Request failed (HTTP '+response.status+').';
      // An expired or revoked sign-in on a signed-in area sends the person to the login page, then back here after signing in.
      if (response.status === 401 && options.token && /^\/(admin|dashboard)(\/|$)/.test(window.location.pathname)) {
        try {
          window.localStorage.removeItem('khalil-auth-token');
          window.localStorage.setItem('khalil-auth-return', window.location.pathname + window.location.search);
        } catch { /* Storage may be disabled. */ }
        window.location.replace('/login');
      }
      const error = new Error(payload.message || fallback);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    complete?.(null, payload);
    return payload;
  } catch (error) {
    const failure = timedOut ? new Error('Content loading timed out. Please retry.') : error;
    complete?.(failure);
    throw failure;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

export const apiBaseUrl = API_BASE_URL;
export const apiRequest = request;

export function fetchBootstrap() {
  return request('/bootstrap');
}

export function fetchEchoProjectChat(token,topicId='general') {
  return request('/echo-project-chat?topicId='+encodeURIComponent(topicId), { token });
}
export function fetchEchoProjectChatTopics(token){return request('/echo-project-chat/topics',{token});}
export function createEchoProjectChatTopic(title,token){return request('/echo-project-chat/topics',{method:'POST',body:{title},token});}

export function prepareEchoProjectChatVoiceNote(attachment, token, signal) {
  return request('/echo-project-chat/voice-note/prepare', { method: 'POST', body: {attachment}, token, signal });
}

export function sendEchoProjectChat(payload, token) {
  return request('/echo-project-chat', { method: 'POST', body: payload, token });
}

export function updateEchoProjectChatPresence(payload, token) {
  return request('/echo-project-chat/presence', { method: 'POST', body: payload, token });
}

export function markEchoProjectChatRead(messageId, token,topicId='general') {
  return request('/echo-project-chat/read', { method: 'POST', body: { messageId,topicId }, token });
}

export function acknowledgeEchoProjectChatMessages(messageIds, seen, token) {
  return request('/echo-project-chat/receipts', { method: 'POST', body: {messageIds, seen}, token });
}

export function deleteEchoProjectChatMessage(id, token) {
  return request('/echo-project-chat/' + encodeURIComponent(id), { method: 'DELETE', token });
}

export function editEchoProjectChatMessage(id, payload, token) {
  return request('/echo-project-chat/' + encodeURIComponent(id), { method: 'PATCH', body: payload, token });
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

export async function uploadLiveSessionCover(file, token) {
  const formData = new FormData();
  formData.append('cover', file);

  const response = await fetch(`${API_BASE_URL}/live-sessions/upload-cover`, {
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
    const error = new Error(payload.message || 'Cover image upload failed.');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function uploadLiveStreamPoster(file, token) {
  const formData = new FormData();
  formData.append('poster', file);

  const response = await fetch(`${API_BASE_URL}/live-stream/upload-poster`, {
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
    const error = new Error(payload.message || 'Poster image upload failed.');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
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

export function setLiveStreamGoal(goal, token) {
  return request('/live-stream/goal', { method: 'PUT', body: { goal }, token });
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

export function goLiveWebrtc(payload, token) {
  return request('/live-stream/webrtc/go-live', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function endLiveWebrtc(token, roomName) {
  return request('/live-stream/webrtc/end', {
    method: 'POST',
    body: {roomName},
    token,
  });
}

export function fetchWebrtcViewerToken(token, session) {
  return request('/live-stream/playback', {method:'POST',token,body:{session}});
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

export function analyzeLiveRequest(payload, token) {
  return request('/live-requests/analyze', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function searchYoutubeVideos(query, token) {
  return request(`/youtube/search?q=${encodeURIComponent(query)}`,{token});
}

export function createLiveRequest(payload, token) {
  return request('/live-requests/checkout', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function fetchAdminLiveRequests(token) {
  return request('/live-requests/admin?broadcast=current', {
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

export function fetchEquipment() {
  return request('/equipment');
}

export function createServiceRequest(payload, token) {
  return request('/service-requests', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function serviceRequestAction(id, action, body, token, method = 'POST') {
  return request(`/service-requests/${encodeURIComponent(id)}/${action}`, { method, body: body || {}, token });
}

export function fetchConfirmedBookings(token) {
  return request('/bookings/confirmed', { token });
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

export function fetchAdminPrices(token) {
  return request('/prices', { token });
}

export function updateAdminPrice(priceId, payload, token) {
  return request(`/prices/${priceId}`, {
    method: 'PATCH',
    body: payload,
    token,
  });
}

export function fetchAdminTransactions(token) {
  return request('/transactions', { token });
}

export function googleLogin(payload) {
  return request('/auth/google', { method: 'POST', body: payload });
}
