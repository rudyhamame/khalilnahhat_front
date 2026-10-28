import catalog from './dialectCatalog.json';

export const dialects = catalog.items;
const byId = new Map(dialects.map(item => [item.id, item]));

// Arabic-safe, accent-insensitive key: drops tashkeel/tatweel, unifies alef/ya/ta-marbuta forms.
export const normalizeSearch = text => String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ًͯ-ٟـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();

const keyed = dialects.map(item => ({
  item,
  key: normalizeSearch([item.display_name, item.display_name_ar, item.dialect_family, item.dialect_family_ar, item.country, item.country_ar, item.regional_dialect, item.regional_dialect_ar, item.language, ...item.aliases].join(' ')),
}));

export const searchDialects = query => {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  return words.length ? keyed.filter(({ key }) => words.every(word => key.includes(word))).map(({ item }) => item) : dialects;
};

// Structured record for a stored id (language / family / country / region plus both display names).
export const dialectRecord = id => byId.get(id) || null;
