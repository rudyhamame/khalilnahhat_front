import { Mic, MicOff } from 'lucide-react';
import { useMicLevel } from '../hooks/useMicLevel';

// Vertical realtime voice level on the left edge of the preview; follows the live mic track.
export default function VoiceTestMeter({ track, deviceId, muted }) {
  const { level, error } = useMicLevel({ deviceId, track, enabled: Boolean(track) });
  const scale = muted || !track ? 0 : Math.max(0, Math.min(1, level));
  const off = muted || error || !track;
  return <div className="studio-voice-test" data-off={off} role="meter" aria-label="Voice level" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(scale * 100)} title={error || (track ? (muted ? 'Microphone muted' : 'Voice level') : 'Open the preview to test your voice')}>
    <div className="studio-voice-track"><div className="studio-voice-fill" style={{ transform: `scaleY(${scale})` }} /></div>
    {off ? <MicOff size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}
  </div>;
}
