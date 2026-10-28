// Collections are hand-built sets: `recordingIds` is both the membership and the playing order.
export function archiveResults(data, { query = '', sort = 'newest', collectionId = '' } = {}) {
  const q = query.trim().toLocaleLowerCase();
  const includes = (...values) => !q || values.some(value => String(value || '').toLocaleLowerCase().includes(q));
  const chosen = data.collections.find(c => c.id === collectionId);
  const position = new Map((chosen?.recordingIds || []).map((id, index) => [id, index]));
  const titlesOf = new Map();
  for (const c of data.collections) for (const id of c.recordingIds || []) titlesOf.set(id, [...(titlesOf.get(id) || []), c.title]);
  const songs = data.songs.filter(s => (!collectionId || position.has(s.id)) && includes(s.title, s.artist, s.date, ...(titlesOf.get(s.id) || [])));
  const collections = data.collections.filter(c => includes(c.title, c.description) || songs.some(s => (c.recordingIds || []).includes(s.id)));
  const date = row => row.date || row.createdAt || '';
  const order = (a, b) => sort === 'alphabetical' ? a.title.localeCompare(b.title)
    : sort === 'curated' ? (collectionId && position.has(a.id) ? position.get(a.id) - position.get(b.id) : (a.sortOrder || 0) - (b.sortOrder || 0))
    : (sort === 'oldest' ? 1 : -1) * date(a).localeCompare(date(b));
  return { collections: sort === 'curated' ? [...collections] : [...collections].sort(order), songs: [...songs].sort(order) };
}
