// Browser capture requests are preferences: hardware/browser support may differ.
export const speechCapture = {
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
export const speechPublish = {
  audioPreset: { maxBitrate: 48000, priority: 'high' },
  forceStereo: false,
  dtx: true,
  red: true,
};
export const voiceNoteBitrate = 48000;
export const maxVoiceNoteMs = 5 * 60 * 1000;
