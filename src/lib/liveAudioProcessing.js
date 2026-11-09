export const LIVE_AUDIO_CONTROLS = [
  {key:'echoCancellation',label:'Echo cancellation',help:'Reduce speaker sound picked up by the microphone.'},
  {key:'noiseSuppression',label:'Noise suppression',help:'Reduce steady background noise; this can alter music.'},
  {key:'autoGainControl',label:'Automatic voice level',help:'Let the browser adjust microphone level; this can change music dynamics.'},
];
export function liveAudioProcessing(mode,overrides={}) {
  return Object.fromEntries(LIVE_AUDIO_CONTROLS.map(({key})=>[key,typeof overrides[key]==='boolean'?overrides[key]:mode==='voice']));
}
export function readLiveAudioProcessing(track) {
  const settings=track?.getSourceTrackSettings?.()||track?.getSettings?.()||{};
  return Object.fromEntries(LIVE_AUDIO_CONTROLS.map(({key})=>[key,typeof settings[key]==='boolean'?settings[key]:null]));
}
export function liveAudioConstraints(settings) {
  return Object.fromEntries(LIVE_AUDIO_CONTROLS.map(({key})=>[key,{exact:settings[key]===true}]));
}
export function supportedLiveAudioProcessing(track) {
  const capabilities=track?.getCapabilities?.()||{};
  return Object.fromEntries(LIVE_AUDIO_CONTROLS.map(({key})=>[key,Array.isArray(capabilities[key])&&capabilities[key].includes(true)&&capabilities[key].includes(false)]));
}
// LiveKit applies these constraints to the original capture track, even when its
// published track comes from a vocal processor. No second microphone is opened.
export async function applyLiveAudioProcessing(track,settings) {
  if(!track?.applyConstraints)throw new Error('This browser cannot change effects on the current audio input.');
  await track.applyConstraints(liveAudioConstraints(settings));
  return readLiveAudioProcessing(track);
}
