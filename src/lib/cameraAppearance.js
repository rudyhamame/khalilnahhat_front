export const CAMERA_APPEARANCE_DEFAULTS = { strength: 0, smoothing: 20, brightness: 0, contrast: 0, warmth: 0, tone: 15 };
export const CAMERA_APPEARANCE_CONTROLS = [
  { key: 'strength', label: 'Filter strength', min: 0, max: 100 },
  { key: 'smoothing', label: 'Smoothing', min: 0, max: 100 },
  { key: 'brightness', label: 'Lighting · brightness', min: -30, max: 40 },
  { key: 'contrast', label: 'Lighting · contrast', min: -30, max: 30 },
  { key: 'warmth', label: 'Warmth', min: -50, max: 50 },
  { key: 'tone', label: 'Tone enhancement', min: 0, max: 100 },
];
export const CAMERA_APPEARANCE_PRESETS = {
  off: { ...CAMERA_APPEARANCE_DEFAULTS },
  natural: { strength: 65, smoothing: 25, brightness: 5, contrast: 3, warmth: 5, tone: 20 },
  lowLight: { strength: 80, smoothing: 15, brightness: 25, contrast: -10, warmth: 3, tone: 12 },
};
export function normalizeCameraAppearance(value = {}) {
  return Object.fromEntries(CAMERA_APPEARANCE_CONTROLS.map(({ key, min, max }) => [key, Number.isFinite(value[key]) ? Math.max(min, Math.min(max, value[key])) : CAMERA_APPEARANCE_DEFAULTS[key]]));
}
export function cameraAppearanceFilter(value) {
  const s = normalizeCameraAppearance(value), amount = s.strength / 100;
  return `brightness(${1 + s.brightness / 100 * amount}) contrast(${1 + s.contrast / 100 * amount}) saturate(${1 + s.tone / 500 * amount})`;
}
