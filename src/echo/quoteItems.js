// Services and equipment are separate quote lines; neither replaces the other.
export function buildQuoteItems(cart, services, serviceNames, fallbackName) {
  const lines = Object.values(cart).map(({ id, name, category, quantity }) => ({ serviceId: id, name, category, quantity }));
  lines.push(...services.map((s) => ({ serviceId: `svc-${s}`, name: serviceNames[s], category: 'service', quantity: 1 })));
  return lines.length ? lines : [{ serviceId: 'svc-general', name: fallbackName, category: 'service', quantity: 1 }];
}
