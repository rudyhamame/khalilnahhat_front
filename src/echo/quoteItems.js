// Services and equipment are separate quote lines; neither replaces the other.
export function buildQuoteItems(cart, services, serviceNames, fallbackName) {
  // An item saved by an older version can lack a name or category; the server needs both as text (it takes the real ones from the catalogue).
  const lines = Object.values(cart).map(({ id, name, category, quantity }) => ({ serviceId: id, name: name || String(id).replaceAll('-', ' '), category: category || 'equipment', quantity }));
  lines.push(...services.map((s) => ({ serviceId: `svc-${s}`, name: serviceNames[s] || s.replaceAll('-', ' '), category: 'service', quantity: 1 })));
  return lines.length ? lines : [{ serviceId: 'svc-general', name: fallbackName, category: 'service', quantity: 1 }];
}
