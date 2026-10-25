export function archiveResults(data, { query = '', category = '', year = '', sort = 'newest', albumId = '' } = {}) {
  const q = query.trim().toLocaleLowerCase();
  const names = new Map(data.categories.map(c => [c.id, c.title]));
  const albumsById = new Map(data.albums.map(a => [a.id, a]));
  const includes = (...values) => !q || values.some(value => String(value || '').toLocaleLowerCase().includes(q));
  const songs = data.songs.filter(s => {
    const album = albumsById.get(s.albumId);
    return (!albumId || s.albumId === albumId) && (!category || album?.categoryId === category)
      && (!year || String(album?.year || s.date?.slice(0, 4)) === year)
      && includes(s.title, s.artist, album?.title, names.get(album?.categoryId), album?.year, s.date);
  });
  const albums = data.albums.filter(a => (!category || a.categoryId === category) && (!year || String(a.year) === year)
    && (includes(a.title, names.get(a.categoryId), a.year) || songs.some(s => s.albumId === a.id)));
  const date = row => row.categoryId ? `${row.year || ''}-${row.createdAt || ''}` : row.date || row.createdAt || '';
  const order = (a, b) => sort === 'alphabetical' ? a.title.localeCompare(b.title) : sort === 'curated' ? (a.sortOrder || 0) - (b.sortOrder || 0)
    : (sort === 'oldest' ? 1 : -1) * date(a).localeCompare(date(b));
  return { albums: [...albums].sort(order), songs: [...songs].sort(order) };
}
