import {uuid} from '../lib/uuid.js';
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
  }
  return value;
}

export function getBookingSubmissionIdentity(payload, previous, createId = () => uuid()) {
  const signature = JSON.stringify(stableValue(payload));
  if (previous?.signature === signature && previous.id) return previous;
  return { signature, id: createId() };
}

export function bookingSubmissionReceipt(result) {
  if (!result?.item?.id || !result.item.requestNumber) return null;
  return result.item.requestNumber;
}

export function loadBookingSubmissionIdentity(key, storage) {
  try {
    const value=JSON.parse((storage || globalThis.sessionStorage)?.getItem(key) || 'null');
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value?.id || '') && typeof value.signature==='string' ? value : null;
  } catch { return null; }
}

export function storeBookingSubmissionIdentity(key, identity, storage) {
  try {
    const target=storage || globalThis.sessionStorage;
    if(identity)target?.setItem(key,JSON.stringify(identity));
    else target?.removeItem(key);
  } catch { /* Retry safety in the current form still works without browser storage. */ }
}
