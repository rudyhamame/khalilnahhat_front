// One-time local import using the site's existing admin session and public APIs.
const api = '/api';
const button = document.querySelector('#import');
const status = document.querySelector('#status');
const grid = document.querySelector('#grid');
const stateKey = 'echo-equipment-artwork-import-20261105';
const manifest = await fetch('./manifest.json').then(response => {
  if (!response.ok) throw Error('Artwork manifest could not load.');
  return response.json();
});
let state;
try { state = JSON.parse(localStorage.getItem(stateKey) || '{}'); } catch { state = {}; }
const save = () => localStorage.setItem(stateKey, JSON.stringify(state));
const token = () => {
  try {
    const value = JSON.parse(localStorage.getItem('khalil-auth-token') || 'null');
    return typeof value === 'string' ? value : '';
  } catch { return ''; }
};
async function request(path, {body, form, method = 'GET'} = {}) {
  const response = await fetch(api + path, {
    method,
    signal: AbortSignal.timeout(120000),
    headers: {Authorization: 'Bearer ' + token(), ...(body ? {'Content-Type': 'application/json'} : {})},
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.message || `Request failed (${response.status}).`);
  return data;
}
const source = row => JSON.stringify([row.modelUrl || '', (row.modelParts || []).map(p =>
  [p.src, p.name || '', p.nameAr || '', p.x || 0, p.y || 0, p.z || 0, p.rotation || 0])]);
let ready = 0;
for (const row of manifest.items) {
  const figure = document.createElement('figure');
  const img = document.createElement('img');
  img.src = `./images/${encodeURIComponent(row.id)}.png`;
  img.alt = row.name;
  img.addEventListener('error', () => { setTimeout(() => { img.src = `./images/${encodeURIComponent(row.id)}.png?retry=${Date.now()}`; }, 5000); });
  const caption = document.createElement('figcaption');
  caption.textContent = row.name;
  figure.append(img, caption);
  grid.append(figure);
  img.addEventListener('load', () => {
    ready++;
    if (ready === manifest.items.length) {
      button.disabled = false;
      button.textContent = `Upload and apply ${ready} artworks`;
    }
  });
}
document.querySelector('#skipped').textContent = manifest.skipped.length
  ? 'No 3D model available: ' + manifest.skipped.map(row => row.name).join(', ') + '.' : '';
status.textContent = 'Uses your admin sign-in on localhost. The import can be resumed if interrupted.';
button.addEventListener('click', async () => {
  button.disabled = true;
  const results = [];
  try {
    if (!token()) throw Error('Sign in as admin at http://localhost:5176/login, then return here.');
    await request('/equipment/admin');
    for (const [index, row] of manifest.items.entries()) {
      status.textContent = `Processing ${index + 1}/${manifest.items.length}: ${row.name}\n` + results.join('\n');
      const current = (await request('/equipment/admin')).items.find(item => item.id === row.id);
      if (!current) { results.push(`Skipped ${row.name}: no longer in catalog.`); continue; }
      const signature = source({modelUrl: row.sourceModelUrl, modelParts: row.sourceParts});
      if (source(current) !== signature) { results.push(`Skipped ${row.name}: its model has changed.`); continue; }
      const previous = state[row.id]?.source === signature ? state[row.id] : {source: signature};
      if ((current.imageUrl || '') !== (row.oldImageUrl || '') && current.imageUrl !== previous.url) {
        results.push(`Skipped ${row.name}: its artwork has changed since preparation.`);
        continue;
      }
      if (!previous.url) {
        const image = await fetch(`./images/${encodeURIComponent(row.id)}.png`);
        if (!image.ok) throw Error('Image missing: ' + row.name);
        const blob = await image.blob();
        if (!blob.type.startsWith('image/')) throw Error('Invalid image: ' + row.name);
        const form = new FormData();
        form.append('file', blob, row.id + '-artwork.png');
        previous.url = (await request('/content/gallery/upload', {method: 'POST', form})).url;
        if (!previous.url?.startsWith('https://')) throw Error('Upload did not return an image URL.');
        state[row.id] = previous;
        save();
      }
      const gallery = await request('/content/media?kind=photo');
      let media = gallery.items.find(item => item.mediaUrl === previous.url);
      if (!media) media = (await request('/content/media', {method: 'POST', body: {
        kind: 'photo', category: 'equipment', title: `${row.name} — 3D artwork`.slice(0,160),
        mediaUrl: previous.url, isPublished: true,
      }})).item;
      if (!media?.id) throw Error('Gallery did not confirm the image: ' + row.name);
      previous.mediaId = media.id;
      save();
      // Recheck immediately before saving so an intervening edit is not replaced.
      const latest = (await request('/equipment/admin')).items.find(item => item.id === row.id);
      if (!latest || source(latest) !== signature ||
          ((latest.imageUrl || '') !== (row.oldImageUrl || '') && latest.imageUrl !== previous.url)) {
        results.push(`Gallery only: ${row.name}; equipment changed during import.`);
        continue;
      }
      const updated = await request('/equipment/' + encodeURIComponent(row.id), {
        method: 'PATCH', body: {imageUrl: previous.url},
      });
      if (updated.item?.imageUrl !== previous.url) throw Error('Artwork was not saved: ' + row.name);
      previous.applied = true;
      save();
      results.push(`Saved: ${row.name}`);
    }
    const equipment = await request('/equipment/admin');
    const photos = await request('/content/media?kind=photo');
    const confirmed = manifest.items.filter(row => state[row.id]?.applied &&
      equipment.items.some(item => item.id === row.id && item.imageUrl === state[row.id].url) &&
      photos.items.some(item => item.mediaUrl === state[row.id].url));
    status.textContent = `Confirmed ${confirmed.length}/${manifest.items.length} artworks in Gallery and equipment.\n` + results.join('\n');
    window.dispatchEvent(new Event('echo:setup-catalog-changed'));
    localStorage.setItem('echo:catalog-revision', String(Date.now()));
    button.textContent = confirmed.length === manifest.items.length ? 'All artworks saved' : 'Resume import';
  } catch (error) {
    status.textContent = error.message + '\n' + results.join('\n');
    button.textContent = 'Resume import';
  } finally { button.disabled = false; }
});
