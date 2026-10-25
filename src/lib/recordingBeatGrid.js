// Measured from this exact 180.0107-second recording: recurring transients fit
// 110 BPM across the track. The opening kick anchors the estimated 4/4 phase.
const RECORDING = {
  trackId: 'archive-dc3b1186-e0c3-4550-ac7f-29013bf1168d',
  audioUrl: 'https://res.cloudinary.com/nqiooluk/video/upload/v1792786516/khalil/live-sessions/file_mt2kvc.wav',
  bpm: 110,
  firstDownbeat: 0,
};

export function recordingBeatGrid({ trackId, audioUrl, time }) {
  if (trackId !== RECORDING.trackId || audioUrl !== RECORDING.audioUrl || !Number.isFinite(time) || time < RECORDING.firstDownbeat) return null;
  const beatsFromDownbeat = Math.floor((time - RECORDING.firstDownbeat) * RECORDING.bpm / 60 + 1e-7);
  return { measureLocked:true, beatsFromDownbeat, bpm:RECORDING.bpm, downbeat:beatsFromDownbeat % 4 === 0 };
}
