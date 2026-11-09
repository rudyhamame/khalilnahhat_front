import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMicLevel } from '../hooks/useMicLevel';
import { createMicrophoneMonitor } from '../lib/microphoneMonitor';

// Observe the existing input; the meter never changes the audio signal.
export default function VoiceTestMeter({ track, deviceId, muted, onToggle, source = false, canEnable = false, inputLevel=1,onLevelChange }) {
  const monitor = useRef(null);
  const [monitoring,setMonitoring] = useState(false);
  const [monitorError,setMonitorError] = useState('');
  useEffect(()=>{
    setMonitoring(false);
    const ended=()=>{monitor.current?.stop();monitor.current=null;setMonitoring(false);};
    track?.addEventListener('ended',ended);
    return()=>{track?.removeEventListener('ended',ended);monitor.current?.stop();monitor.current=null;};
  },[track]);
  useEffect(()=>{monitor.current?.setLevel(inputLevel);},[inputLevel]);
  const toggleMonitor=()=>{
    setMonitorError('');
    if(monitor.current){monitor.current.stop();monitor.current=null;setMonitoring(false);return;}
    try{
      const current=createMicrophoneMonitor(track,{level:inputLevel});monitor.current=current;setMonitoring(true);
      current.ready.catch(error=>{
        if(monitor.current!==current)return;
        monitor.current=null;setMonitoring(false);setMonitorError(error.message||'Microphone monitoring could not start. Try again.');
      });
    }catch(error){setMonitoring(false);setMonitorError(error.message||'Microphone monitoring could not start.');}
  };
  const label=source?'Source audio':'Microphone';
  const OnIcon=source?Volume2:Mic,OffIcon=source?VolumeX:MicOff;
  const action=`${!track&&canEnable?'Enable':muted?'Unmute':'Mute'} ${label.toLowerCase()}`;
  const { level, rms, error } = useMicLevel({ deviceId, track, enabled: Boolean(track) });
  const scale = muted || !track ? 0 : Math.max(0, Math.min(1, level*inputLevel));
  const amplitude=muted||!track?0:rms*inputLevel;
  const decibels=amplitude>0?Math.max(-96,20*Math.log10(amplitude)):null;
  const off = muted || error || !track;
  return <div className={`studio-voice-test${source?' studio-source-audio-test':' has-microphone-monitor'}${onLevelChange?' has-input-level':''}`} data-off={off} title={error || (track ? `${label}${muted?' muted':' level'}` : source?'This source has no shared audio':canEnable?'Enable microphone':'Open the preview to test your voice')}>
    <span className="studio-voice-label">{label}</span>
    <div className="studio-voice-track" role="meter" aria-label={source?'Source audio level':'Voice level'} aria-valuemin={-96} aria-valuemax={6} aria-valuenow={decibels??-96} aria-valuetext={decibels===null?'Silence':`${decibels.toFixed(1)} dBFS`}><div className="studio-voice-fill" style={{ transform: `scaleX(${scale})` }} /></div>
    {onLevelChange&&<label className="studio-input-level"><span className="sr-only">{label} volume</span><input type="range" min="0" max="200" step="1" value={Math.round(inputLevel*100)} aria-label={`${label} volume`} disabled={!track&&!canEnable} onChange={event=>onLevelChange(Number(event.target.value)/100)}/><output>{Math.round(inputLevel*100)}%</output></label>}
    <output className="studio-input-db" title="Digital signal level in dBFS">{decibels===null?'−∞':decibels.toFixed(1)} dB</output>
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
