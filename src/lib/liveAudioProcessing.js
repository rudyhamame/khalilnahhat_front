export const LIVE_AUDIO_CONTROLS = [
  {key:'echoCancellation',label:'Echo cancellation',help:'Reduce speaker sound picked up by the microphone.'},
  {key:'noiseSuppression',label:'Noise suppression',help:'Reduce steady background noise; this can alter music.'},
  {key:'autoGainControl',label:'Automatic voice level',help:'Let the browser adjust microphone level; this can change music dynamics.'},
];
export function liveAudioProcessing(mode,overrides={}) {
  return Object.fromEntries(LIVE_AUDIO_CONTROLS.map(({key})=>[key,typeof overrides[key]==='boolean'?overrides[key]:mode==='voice']));
}
export function readLiveAudioProcessing(track) {
  const settings=track?.getSourceTrackSettings?.()||{};
  return Object.fromEntries(LIVE_AUDIO_CONTROLS.map(({key})=>[key,typeof settings[key]==='boolean'?settings[key]:null]));
}
// LiveKit applies these constraints to the original capture track, even when its
// published track comes from a vocal processor. No second microphone is opened.
export async function applyLiveAudioProcessing(track,settings) {
  if(!track?.applyConstraints)throw new Error('This browser cannot change audio processing on the current input. Close preview and choose Voice mode before starting again.');
  await track.applyConstraints(settings);
  return readLiveAudioProcessing(track);
}
