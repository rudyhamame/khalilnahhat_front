import { useEffect, useMemo, useState } from 'react';
import { servicesById } from '../data/services';
import {
  EVENT_SELECTION_STORAGE_KEY,
  addSelectionItem,
  countSelectedUnits,
  normalizeSelection,
  removeSelectionItem,
  updateSelectionQuantity,
} from '../lib/eventSelection';

function readStoredSelection() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return normalizeSelection(
      JSON.parse(window.localStorage.getItem(EVENT_SELECTION_STORAGE_KEY) || '{}'),
      servicesById,
    );
  } catch {
    return {};
  }
}

export function useEventSelection() {
  const [selection, setSelection] = useState(readStoredSelection);

  useEffect(() => {
    window.localStorage.setItem(EVENT_SELECTION_STORAGE_KEY, JSON.stringify(selection));
  }, [selection]);

  const selectedItems = useMemo(
    () =>
      Object.entries(selection)
        .map(([serviceId, quantity]) => ({ ...servicesById[serviceId], quantity }))
        .filter((item) => item.id),
    [selection],
  );

  return {
    selectedItems,
    totalSelectedUnits: countSelectedUnits(selection),
    addItem: (service) => setSelection((current) => addSelectionItem(current, service)),
    removeItem: (serviceId) => setSelection((current) => removeSelectionItem(current, serviceId)),
    updateQuantity: (service, quantity) =>
      setSelection((current) => updateSelectionQuantity(current, service, quantity)),
    clearSelection: () => setSelection({}),
    isSelected: (serviceId) => Boolean(selection[serviceId]),
  };
}
