import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useMicLevel } from '../hooks/useMicLevel';

// Observe the existing input; the meter never changes the audio signal.
export default function VoiceTestMeter({ track, deviceId, muted, onToggle, source = false, canEnable = false }) {
  const label=source?'Source audio':'Microphone';
  const OnIcon=source?Volume2:Mic,OffIcon=source?VolumeX:MicOff;
  const action=`${!track&&canEnable?'Enable':muted?'Unmute':'Mute'} ${label.toLowerCase()}`;
  const { level, error } = useMicLevel({ deviceId, track, enabled: Boolean(track) });
  const scale = muted || !track ? 0 : Math.max(0, Math.min(1, level));
  const off = muted || error || !track;
  return <div className={`studio-voice-test${source?' studio-source-audio-test':''}`} data-off={off} role="meter" aria-label={source?'Source audio level':'Voice level'} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(scale * 100)} title={error || (track ? `${label}${muted?' muted':' level'}` : source?'This source has no shared audio':canEnable?'Enable microphone':'Open the preview to test your voice')}>
    <span className="studio-voice-label">{label}</span>
    <div className="studio-voice-track"><div className="studio-voice-fill" style={{ transform: `scaleX(${scale})` }} /></div>
    <button type="button" className="studio-voice-toggle" disabled={(!track&&!canEnable) || !onToggle} aria-pressed={Boolean(muted)} aria-label={action} title={action} onClick={onToggle}>
      {off ? <OffIcon size={14} aria-hidden="true" /> : <OnIcon size={14} aria-hidden="true" />}
    </button>
  </div>;
}
