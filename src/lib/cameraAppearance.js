export const CAMERA_APPEARANCE_DEFAULTS = { strength: 0, smoothing: 20, brightness: 0, contrast: 0, warmth: 0, tone: 15, sideLight: 0 };
// Non-numeric background settings live beside the numeric controls.
export const CAMERA_BACKGROUND_MODES = ['off', 'blur', 'color', 'image'];
export const CAMERA_BACKGROUND_DEFAULTS = { background: 'off', bgBlur: 60, bgColor: '#101214', bgImage: '', bgQuality: 'fast' };
export const CAMERA_APPEARANCE_CONTROLS = [
  { key: 'strength', label: 'Filter strength', min: 0, max: 100 },
  { key: 'smoothing', label: 'Smoothing', min: 0, max: 100 },
  { key: 'brightness', label: 'Lighting · brightness', min: -30, max: 40 },
  { key: 'contrast', label: 'Lighting · contrast', min: -30, max: 30 },
  { key: 'warmth', label: 'Warmth', min: -50, max: 50 },
  { key: 'tone', label: 'Tone enhancement', min: 0, max: 100 },
  { key: 'sideLight', label: 'Side light balance (negative: light from left)', min: -100, max: 100 },
];
export const CAMERA_APPEARANCE_PRESETS = {
  off: { ...CAMERA_APPEARANCE_DEFAULTS },
  natural: { strength: 65, smoothing: 25, brightness: 5, contrast: 3, warmth: 5, tone: 20 },
  lowLight: { strength: 80, smoothing: 15, brightness: 25, contrast: -10, warmth: 3, tone: 12 },
};
export function normalizeCameraAppearance(value = {}) {
  const d = CAMERA_BACKGROUND_DEFAULTS;
  return {
    ...Object.fromEntries(CAMERA_APPEARANCE_CONTROLS.map(({ key, min, max }) => [key, Number.isFinite(value[key]) ? Math.max(min, Math.min(max, value[key])) : CAMERA_APPEARANCE_DEFAULTS[key]])),
    background: CAMERA_BACKGROUND_MODES.includes(value.background) ? value.background : d.background,
    bgBlur: Number.isFinite(value.bgBlur) ? Math.max(0, Math.min(100, value.bgBlur)) : d.bgBlur,
    bgColor: /^#[0-9a-f]{6}$/i.test(value.bgColor) ? value.bgColor : d.bgColor,
    bgQuality: value.bgQuality === 'high' ? 'high' : 'fast',
    bgImage: typeof value.bgImage === 'string' ? value.bgImage : d.bgImage,
  };
}
export function cameraAppearanceFilter(value) {
  const s = normalizeCameraAppearance(value), amount = s.strength / 100;
  return `brightness(${1 + s.brightness / 100 * amount}) contrast(${1 + s.contrast / 100 * amount}) saturate(${1 + s.tone / 500 * amount})`;
}
