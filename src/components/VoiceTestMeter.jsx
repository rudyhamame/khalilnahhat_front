import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMicLevel } from '../hooks/useMicLevel';
import { createMicrophoneMonitor } from '../lib/microphoneMonitor';

// Observe the existing input; the meter never changes the audio signal.
export default function VoiceTestMeter({ track, deviceId, muted, onToggle, source = false, canEnable = false }) {
  const monitor = useRef(null);
  const [monitoring,setMonitoring] = useState(false);
  const [monitorError,setMonitorError] = useState('');
  useEffect(()=>{
    setMonitoring(false);
    const ended=()=>{monitor.current?.stop();monitor.current=null;setMonitoring(false);};
    track?.addEventListener('ended',ended);
    return()=>{track?.removeEventListener('ended',ended);monitor.current?.stop();monitor.current=null;};
  },[track]);
  const toggleMonitor=()=>{
    setMonitorError('');
    if(monitor.current){monitor.current.stop();monitor.current=null;setMonitoring(false);return;}
    try{
      const current=createMicrophoneMonitor(track);monitor.current=current;setMonitoring(true);
      current.ready.catch(error=>{
        if(monitor.current!==current)return;
        monitor.current=null;setMonitoring(false);setMonitorError(error.message||'Microphone monitoring could not start. Try again.');
      });
    }catch(error){setMonitoring(false);setMonitorError(error.message||'Microphone monitoring could not start.');}
  };
  const label=source?'Source audio':'Microphone';
  const OnIcon=source?Volume2:Mic,OffIcon=source?VolumeX:MicOff;
  const action=`${!track&&canEnable?'Enable':muted?'Unmute':'Mute'} ${label.toLowerCase()}`;
  const { level, error } = useMicLevel({ deviceId, track, enabled: Boolean(track) });
  const scale = muted || !track ? 0 : Math.max(0, Math.min(1, level));
  const off = muted || error || !track;
  return <div className={`studio-voice-test${source?' studio-source-audio-test':' has-microphone-monitor'}`} data-off={off} role="meter" aria-label={source?'Source audio level':'Voice level'} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(scale * 100)} title={error || (track ? `${label}${muted?' muted':' level'}` : source?'This source has no shared audio':canEnable?'Enable microphone':'Open the preview to test your voice')}>
    <span className="studio-voice-label">{label}</span>
    <div className="studio-voice-track"><div className="studio-voice-fill" style={{ transform: `scaleX(${scale})` }} /></div>
    <button type="button" className="studio-voice-toggle" disabled={(!track&&!canEnable) || !onToggle} aria-pressed={Boolean(muted)} aria-label={action} title={action} onClick={onToggle}>
      {off ? <OffIcon size={14} aria-hidden="true" /> : <OnIcon size={14} aria-hidden="true" />}
    </button>
    {!source&&<>
      <button type="button" className="studio-voice-toggle studio-microphone-monitor" disabled={!track} aria-pressed={monitoring} aria-label={monitoring?'Mute microphone monitor':'Unmute microphone monitor'} title={monitoring?'Mute microphone monitor':'Unmute microphone monitor · low latency'} onClick={toggleMonitor}>
        {monitoring?<Volume2 size={14} aria-hidden="true"/>:<VolumeX size={14} aria-hidden="true"/>}
      </button>
      {monitorError&&<span className="studio-monitor-error" role="status">{monitorError}</span>}
    </>}
  </div>;
}
