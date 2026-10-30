import { apiBaseUrl, apiRequest } from './api';

// Shared by the Gallery tab and the Gallery picker: the Gallery is the one place assets are added.
export const GALLERY_MAX_BYTES = 200 * 1024 * 1024; // same limit as the server

export async function fetchGallery(kinds = ['photo', 'video']) {
  const lists = await Promise.all(kinds.map((kind) => apiRequest(`/content/media?kind=${kind}`)));
  // Ids are Mongo ObjectIds, so sorting them descending puts the newest first.
  return lists.flatMap((list) => list.items || []).sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

// Uploads one image/video into the Cloudinary "Gallery" folder and registers it as a gallery item. Returns the item.
export async function addToGallery(file, token) {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${apiBaseUrl}/content/gallery/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  const out = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(out.message || 'Upload failed.');
  const created = await apiRequest('/content/media', { method: 'POST', token, body: { kind: file.type.startsWith('video/') ? 'video' : 'photo', title: file.name.replace(/\.[^.]+$/, '').slice(0, 160) || 'Untitled', mediaUrl: out.url, durationSec: out.durationSec || 0, isPublished: true } });
  return created.item;
}
