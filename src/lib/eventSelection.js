export const EVENT_SELECTION_STORAGE_KEY = 'djKhalilEventSelection';

export function minimumQuantityFor(service) {
  return Math.max(1, Number(service?.minimumQuantity || 1));
}

export function defaultQuantityFor(service) {
  return Math.max(minimumQuantityFor(service), Number(service?.defaultQuantity || 1));
}

export function normalizeSelection(value, servicesById) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((selection, [serviceId, quantity]) => {
    const service = servicesById[serviceId];

    if (!service) {
      return selection;
    }

    const parsedQuantity = Number.parseInt(quantity, 10);
    selection[serviceId] = Number.isFinite(parsedQuantity)
      ? Math.max(minimumQuantityFor(service), parsedQuantity)
      : defaultQuantityFor(service);
    return selection;
  }, {});
}

export function addSelectionItem(selection, service) {
  if (selection[service.id]) {
    return selection;
  }

  return {
    ...selection,
    [service.id]: defaultQuantityFor(service),
  };
}

export function removeSelectionItem(selection, serviceId) {
  const nextSelection = { ...selection };
  delete nextSelection[serviceId];
  return nextSelection;
}

export function updateSelectionQuantity(selection, service, quantity) {
  if (!selection[service.id]) {
    return selection;
  }

  const parsedQuantity = Number.parseInt(quantity, 10);
  return {
    ...selection,
    [service.id]: Number.isFinite(parsedQuantity)
      ? Math.max(minimumQuantityFor(service), parsedQuantity)
      : minimumQuantityFor(service),
  };
}

export function countSelectedUnits(selection) {
  return Object.values(selection).reduce((total, quantity) => total + Number(quantity || 0), 0);
}
