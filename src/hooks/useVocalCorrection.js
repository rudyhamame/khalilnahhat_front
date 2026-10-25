import { useSyncExternalStore } from 'react';
import { VOCAL_DEFAULTS, normalizeVocalSettings } from '../lib/vocalPitch.js';

let state = { settings: VOCAL_DEFAULTS, status: '', pitch: null };
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const getSnapshot = () => state;
const update = patch => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
export const setVocalStatus = status => update({ status, pitch: null });
export const setVocalPitch = pitch => update({ pitch });
export const getVocalSettings = () => state.settings;
export const resetVocalLiveStatus = () => update({ status: '', pitch: null });
export function useVocalCorrection() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...snapshot, setSettings: patch => update({ settings: normalizeVocalSettings({ ...state.settings, ...patch }), pitch: null }) };
}
