export function apiErrorMessage(payload, fallback) {
  const fields = payload?.errors;
  const details = fields && typeof fields === 'object' && !Array.isArray(fields)
    ? Object.values(fields).flatMap(value => Array.isArray(value) ? value : [value])
      .filter(value => typeof value === 'string' && value.trim())
    : [];
  if (details.length) return [...new Set(details)].join(' ');
  return typeof payload?.message === 'string' && payload.message.trim() ? payload.message : fallback;
}

export function retryAfterSeconds(value, now = Date.now()) {
  if (!value || !String(value).trim()) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - now) / 1000)) : 0;
}
