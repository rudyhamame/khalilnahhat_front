import { useSyncExternalStore } from 'react';
import { VOCAL_DEFAULTS, normalizeVocalSettings, resolveVocalSettings } from '../lib/vocalPitch.js';

let state = { settings: VOCAL_DEFAULTS, effectiveSettings:resolveVocalSettings(VOCAL_DEFAULTS,null), detectedKey:null, status: '', pitch: null };
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const getSnapshot = () => state;
const update = patch => { state = { ...state, ...patch }; if('settings' in patch||'detectedKey' in patch)state.effectiveSettings=resolveVocalSettings(state.settings,state.detectedKey);listeners.forEach(listener => listener()); };
export const setVocalStatus = status => update({ status, pitch: null });
export const setVocalPitch = pitch => update({ pitch });
export const setVocalAutoKey = detectedKey => {if(state.detectedKey?.key===detectedKey?.key)return;update({detectedKey});};
export const getVocalSettings = () => state.effectiveSettings;
export const resetVocalLiveStatus = () => update({ status: '', pitch: null });
export function useVocalCorrection() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...snapshot, setSettings: patch => update({ settings: normalizeVocalSettings({ ...state.settings, ...patch }), pitch: null }) };
}

// Publishers configure DSP only when settings change, never on pitch-meter ticks.
export function useVocalSettings(){return useSyncExternalStore(subscribe,()=>state.effectiveSettings,()=>state.effectiveSettings);}
