// Services and equipment are separate quote lines; neither replaces the other.
export function buildQuoteItems(cart, services, serviceNames, fallbackName) {
  // An item saved by an older version can lack a name or category; the server needs both as text (it takes the real ones from the catalogue).
  const lines = Object.values(cart).map(({ id, name, category, quantity }) => ({ serviceId: id, name: name || String(id).replaceAll('-', ' '), category: category || 'equipment', quantity }));
  lines.push(...services.filter((s) => s === 'dj' || s === 'mc').map((s) => ({ serviceId: `svc-${s}`, name: serviceNames[s] || s.replaceAll('-', ' '), category: 'service', quantity: 1 })));
  // Rental groups (sound, lighting, effects) are equipment groupings, not services: only DJ and MC are service lines.
  return lines.length ? lines : [{ serviceId: 'svc-general', name: fallbackName, category: 'service', quantity: 1 }];
}
