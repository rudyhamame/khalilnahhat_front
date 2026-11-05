// One-time local import using the site's existing admin session and public APIs.
const api = '/api';
const button = document.querySelector('#import');
const status = document.querySelector('#status');
const grid = document.querySelector('#grid');
const stateKey = 'echo-equipment-artwork-import-20261105';
const manifest = await fetch('./manifest.json', {cache: 'no-store'}).then(response => {
  if (!response.ok) throw Error('Artwork manifest could not load.');
  return response.json();
});
const selectedEquipment = new URLSearchParams(location.search).get('equipment');
if (selectedEquipment) manifest.items = manifest.items.filter(row => selectedEquipment.split(',').includes(row.id));
const modelUpdate = manifest.items.some(row => row.replacementModelFile);
const allModelsUpdate = manifest.items.every(row => row.replacementModelFile);
if (manifest.items.some(row => row.createEquipment)) {
  document.querySelector('main > p').textContent = 'Upload adds the images to Gallery, applies the prepared 3D models, and creates Shure Wireless Receiver as a separate Sound equipment item.';
}
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
  if (!response.ok) {
    const error = Error(data.message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}
const source = row => JSON.stringify([row.modelUrl || '', (row.modelParts || []).map(p =>
  [p.src, p.name || '', p.nameAr || '', p.x || 0, p.y || 0, p.z || 0, p.rotation || 0])]);
let ready = 0;
for (const row of manifest.items) {
  const figure = document.createElement('figure');
  const img = document.createElement('img');
  img.src = `./images/${encodeURIComponent(row.id)}.png?revision=${encodeURIComponent(row.revision || '')}`;
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
      button.textContent = modelUpdate && ready === 1 && manifest.items[0].id === 'trussing'
        ? 'Apply truss model and artwork'
        : allModelsUpdate ? `Apply ${ready} equipment model${ready === 1 ? '' : 's'} and artwork` : `Upload and apply ${ready} artworks`;
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
    let equipmentAlbumId;
    try {
      const list = await request('/content/gallery/albums/admin');
      let album = list.items.find(row => row.id === 'equipment-artwork') || list.items.find(row => row.name === 'Equipment');
      if (!album) album = (await request('/content/gallery/albums', {method: 'POST', body: {
        name: 'Equipment', nameAr: 'المعدات', description: 'Equipment artwork and product images.',
      }})).item;
      equipmentAlbumId = album.id;
    } catch (error) {
      if (error.status !== 404) throw error;
      results.push('Albums require the backend update. Equipment artwork will be grouped when that update is deployed.');
    }
    for (const [index, row] of manifest.items.entries()) {
      status.textContent = `Processing ${index + 1}/${manifest.items.length}: ${row.name}\n` + results.join('\n');
      const current = (await request('/equipment/admin')).items.find(item => item.id === row.id);
      if (!current && !row.createEquipment) { results.push(`Skipped ${row.name}: no longer in catalog.`); continue; }
      const signature = source({modelUrl: row.sourceModelUrl, modelParts: row.sourceParts});
      const previous = state[row.id]?.source === signature &&
        (state[row.id]?.revision || '') === (row.revision || '')
        ? state[row.id] : {source: signature, revision: row.revision || ''};
      const matchesModel = item => source(item) === signature || Boolean(row.replacementModelFile && previous.modelUrl &&
        source(item) === source({modelUrl: previous.modelUrl, modelParts: row.sourceParts}));
      if (row.createEquipment && current && current.modelUrl !== previous.modelUrl) {
        results.push(`Skipped ${row.name}: an equipment entry with this ID already exists.`);
        continue;
      }
      if (current && !matchesModel(current)) { results.push(`Skipped ${row.name}: its model has changed.`); continue; }
      if (current && (current.imageUrl || '') !== (row.oldImageUrl || '') && current.imageUrl !== previous.url) {
        results.push(`Skipped ${row.name}: its artwork has changed since preparation.`);
        continue;
      }
      if (row.replacementModelFile && !previous.modelJobId) {
        const model = await fetch(row.replacementModelFile, {cache: 'no-store'});
        if (!model.ok) throw Error('Replacement model missing: ' + row.name);
        const form = new FormData();
        form.append('model', await model.blob(), row.id + '.glb');
        const uploaded = await request('/admin/equipment-3d/upload', {method: 'POST', form});
        if (!uploaded.item?.id || !uploaded.item.modelUrl) throw Error('Model upload was not confirmed.');
        previous.modelJobId = uploaded.item.id;
        previous.modelUrl = uploaded.item.modelUrl;
        state[row.id] = previous;
        save();
      }
      if (!previous.url) {
        const image = await fetch(`./images/${encodeURIComponent(row.id)}.png`, {cache: 'no-store'});
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
      if (equipmentAlbumId) await request('/content/gallery/albums/' + encodeURIComponent(equipmentAlbumId) + '/items', {
        method: 'POST', body: {itemIds: [media.id]},
      });
      // Recheck immediately before saving so an intervening edit is not replaced.
      const latest = (await request('/equipment/admin')).items.find(item => item.id === row.id);
      if ((row.createEquipment && latest && latest.modelUrl !== previous.modelUrl) ||
          (!latest && !row.createEquipment) || (latest && (!matchesModel(latest) ||
          ((latest.imageUrl || '') !== (row.oldImageUrl || '') && latest.imageUrl !== previous.url)))) {
        results.push(`Gallery only: ${row.name}; equipment changed during import.`);
        continue;
      }
      const updated = await request(latest ? '/equipment/' + encodeURIComponent(row.id) : '/equipment', {
        method: latest ? 'PATCH' : 'POST', body: {...(!latest ? row.createEquipment : {}),
          imageUrl: previous.url, ...(row.replacementModelFile ? {modelJobId: previous.modelJobId} : {})},
      });
      if (updated.item?.imageUrl !== previous.url) throw Error('Artwork was not saved: ' + row.name);
      if (row.replacementModelFile && updated.item?.modelUrl !== previous.modelUrl) throw Error('Model was not saved: ' + row.name);
      previous.applied = true;
      save();
      results.push(`Saved: ${row.name}`);
    }
    const equipment = await request('/equipment/admin');
    const photos = await request('/content/media?kind=photo');
    const confirmed = manifest.items.filter(row => state[row.id]?.applied &&
      equipment.items.some(item => item.id === row.id && item.imageUrl === state[row.id].url &&
        (!row.replacementModelFile || item.modelUrl === state[row.id].modelUrl)) &&
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
