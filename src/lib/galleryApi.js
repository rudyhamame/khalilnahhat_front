import { apiBaseUrl, apiRequest } from './api';

// Shared by the Gallery tab and the Gallery picker: the Gallery is the one place assets are added.
export const GALLERY_MAX_BYTES = 200 * 1024 * 1024; // same limit as the server

export async function fetchGallery(kinds = ['photo', 'video'], {token} = {}) {
  const lists = token ? [await apiRequest('/content/media/admin', {token})]
    : await Promise.all(kinds.map((kind) => apiRequest(`/content/media?kind=${kind}`)));
  // Ids are Mongo ObjectIds, so sorting them descending puts the newest first.
  return lists.flatMap((list) => list.items || []).filter(item => kinds.includes(item.kind)).sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

const albumsPath = '/content/gallery/albums';
export async function fetchGalleryAlbums({token} = {}) {
  const result=await apiRequest(albumsPath + (token ? '/admin' : ''), {token});
  if(!Array.isArray(result.items)||result.items.some(album=>!album.id||!Array.isArray(album.itemIds)))throw new Error('Invalid Gallery albums response.');
  return result.items;
}
export const saveGalleryAlbum = (album, token) => apiRequest(albumsPath + (album.id ? '/' + encodeURIComponent(album.id) : ''), {
  token, method: album.id ? 'PATCH' : 'POST', body: {name: album.name, nameAr: album.nameAr || '', description: album.description || ''},
});
export const deleteGalleryAlbum = (id, token) => apiRequest(albumsPath + '/' + encodeURIComponent(id), {token, method: 'DELETE'});
export const addGalleryAlbumItems = (albumId, itemIds, token) => apiRequest(albumsPath + '/' + encodeURIComponent(albumId) + '/items', {token, method: 'POST', body: {itemIds}});
export const removeGalleryAlbumItem = (albumId, itemId, token) => apiRequest(albumsPath + '/' + encodeURIComponent(albumId) + '/items/' + encodeURIComponent(itemId), {token, method: 'DELETE'});

export function galleryItemsForAlbum(items, albums, id) {
  if (!id || id === 'all') return items;
  const ids = new Set(id === 'unfiled' ? albums.flatMap(album => album.itemIds) : albums.find(album => album.id === id)?.itemIds || []);
  return items.filter(item => id === 'unfiled' ? !ids.has(item.id) : ids.has(item.id));
}

// Uploads one image/video into the Cloudinary "Gallery" folder and registers it as a gallery item. Returns the item.
export async function addToGallery(file, token, {albumId} = {}) {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${apiBaseUrl}/content/gallery/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  const out = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(out.message || 'Upload failed.');
  const created = await apiRequest('/content/media', { method: 'POST', token, body: { kind: file.type.startsWith('video/') ? 'video' : 'photo', title: file.name.replace(/\.[^.]+$/, '').slice(0, 160) || 'Untitled', mediaUrl: out.url, durationSec: out.durationSec || 0, isPublished: true } });
  if (albumId) await addGalleryAlbumItems(albumId, [created.item.id], token);
  return created.item;
}
