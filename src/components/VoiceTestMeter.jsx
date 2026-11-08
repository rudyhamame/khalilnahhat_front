import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useMicLevel } from '../hooks/useMicLevel';

// Vertical realtime voice level on the left edge of the preview; follows the live mic track.
export default function VoiceTestMeter({ track, deviceId, muted, onToggle, source = false }) {
  const label=source?'Source audio':'Microphone';
  const OnIcon=source?Volume2:Mic,OffIcon=source?VolumeX:MicOff;
  const action=`${muted?'Unmute':'Mute'} ${label.toLowerCase()}`;
  const { level, error } = useMicLevel({ deviceId, track, enabled: Boolean(track) });
  const scale = muted || !track ? 0 : Math.max(0, Math.min(1, level));
  const off = muted || error || !track;
  return <div className={`studio-voice-test${source?' studio-source-audio-test':''}`} data-off={off} role="meter" aria-label={source?'Source audio level':'Voice level'} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(scale * 100)} title={error || (track ? `${label}${muted?' muted':' level'}` : source?'This source has no shared audio':'Open the preview to test your voice')}>
    <div className="studio-voice-track"><div className="studio-voice-fill" style={{ transform: `scaleY(${scale})` }} /></div>
    <button type="button" className="studio-voice-toggle" disabled={!track || !onToggle} aria-pressed={Boolean(muted)} aria-label={action} title={action} onClick={onToggle}>
      {off ? <OffIcon size={14} aria-hidden="true" /> : <OnIcon size={14} aria-hidden="true" />}
    </button>
  </div>;
}
