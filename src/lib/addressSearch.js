// Free address lookup (OpenStreetMap data via Photon). Typed text is sent to photon.komoot.io; no key, no cost.
const ENDPOINT = 'https://photon.komoot.io/api/';
const ONTARIO_BBOX = '-95.2,41.6,-74.3,56.9';
const GTA = new Set(['toronto', 'etobicoke', 'scarborough', 'north york', 'east york', 'york', 'mississauga', 'brampton', 'caledon', 'markham', 'vaughan', 'richmond hill', 'aurora', 'newmarket', 'king', 'whitchurch-stouffville', 'stouffville', 'east gwillimbury', 'georgina', 'oakville', 'burlington', 'milton', 'halton hills', 'georgetown', 'acton', 'pickering', 'ajax', 'whitby', 'oshawa', 'clarington', 'bowmanville', 'scugog', 'uxbridge', 'brock']);

export const isGta = city => GTA.has(String(city || '').toLowerCase().trim());
export const formatPostal = code => { const clean = String(code || '').replace(/\s+/g, '').toUpperCase(); return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(clean) ? `${clean.slice(0, 3)} ${clean.slice(3)}` : String(code || ''); };

export async function searchAddresses(query, signal) {
  const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&limit=8&lang=en&lat=43.65&lon=-79.38&bbox=${ONTARIO_BBOX}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Address lookup failed');
  const seen = new Set();
  return (await response.json()).features.map(({ properties: p }) => {
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    // Everything else Photon knows about the place becomes the address details (neighbourhood, district, region).
    const details = [p.district || p.suburb || p.locality, p.county && p.county !== (p.city || p.town || p.village) ? p.county : '', p.state].filter(Boolean).filter((part, index, all) => all.indexOf(part) === index).join(', ');
    return { name: p.name && p.name !== p.street ? p.name : '', address: street || p.name || '', city: p.city || p.town || p.village || p.county || '', postal: formatPostal(p.postcode), province: p.state || '', country: p.countrycode, countryName: p.country || 'Canada', details };
  }).filter(item => item.country === 'CA' && item.address && !seen.has(item.address + item.city + item.postal) && seen.add(item.address + item.city + item.postal)).slice(0, 6);
}
