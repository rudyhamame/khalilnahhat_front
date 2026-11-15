export function apiErrorMessage(payload, fallback) {
  const fields = payload?.errors;
  const details = fields && typeof fields === 'object' && !Array.isArray(fields)
    ? Object.values(fields).flatMap(value => Array.isArray(value) ? value : [value])
      .filter(value => typeof value === 'string' && value.trim())
    : [];
  if (details.length) return [...new Set(details)].join(' ');
  return typeof payload?.message === 'string' && payload.message.trim() ? payload.message : fallback;
}
