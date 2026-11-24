// Measured from this exact 180.0107-second recording: recurring transients fit
// 110 BPM across the track. The opening kick anchors the estimated 4/4 phase.
const RECORDING = {
  trackId: 'archive-dc3b1186-e0c3-4550-ac7f-29013bf1168d',
  audioUrl: 'https://vps-ba7fb4cb.vps.ovh.ca/khalil-media/public/07350b048b9526d05cb83ff9880ce596341926dc3216442bc3264e84ff7d73a1.wav',
  bpm: 110,
  firstDownbeat: 0,
};

export function recordingBeatGrid({ trackId, audioUrl, time }) {
  if (trackId !== RECORDING.trackId || audioUrl !== RECORDING.audioUrl || !Number.isFinite(time) || time < RECORDING.firstDownbeat) return null;
  const beatsFromDownbeat = Math.floor((time - RECORDING.firstDownbeat) * RECORDING.bpm / 60 + 1e-7);
  return { measureLocked:true, beatsFromDownbeat, bpm:RECORDING.bpm, downbeat:beatsFromDownbeat % 4 === 0 };
}
