export function audioInputLevel(value){const level=Number(value);return Number.isFinite(level)?Math.max(0,Math.min(2,level)):1;}
export function createStudioAudioMixer({microphoneLevel=1,sourceLevel=1,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,MediaStreamClass=globalThis.MediaStream}={}){
  const context=new AudioContextClass({latencyHint:0});
  const destination=context.createMediaStreamDestination();
  const inputs=new Map(),levels={microphone:audioInputLevel(microphoneLevel),source:audioInputLevel(sourceLevel),portrait:1,voice:1};
  let stopped=false;
  const disconnect=kind=>{const input=inputs.get(kind);input?.source.disconnect();input?.gain.disconnect();inputs.delete(kind);};
  const connect=(kind,track)=>{
    disconnect(kind);if(!track)return;
    const source=context.createMediaStreamSource(new MediaStreamClass([track])),gain=context.createGain();
    gain.gain.setValueAtTime(levels[kind],context.currentTime);
    source.connect(gain);gain.connect(destination);inputs.set(kind,{source,gain});
  };
  const setLevel=(kind,value)=>{
    levels[kind]=audioInputLevel(value);const parameter=inputs.get(kind)?.gain.gain;
    if(parameter){parameter.cancelScheduledValues(context.currentTime);parameter.setTargetAtTime(levels[kind],context.currentTime,.01);}
  };
  const stop=()=>{if(stopped)return;stopped=true;disconnect('microphone');disconnect('source');disconnect('portrait');disconnect('voice');destination.stream.getTracks().forEach(track=>track.stop());void context.close().catch(()=>{});};
  let ready;
  try{ready=Promise.resolve(context.resume()).then(()=>{if(context.state&&context.state!=='running'&&!stopped)throw new Error('The browser paused audio. Retry private preview.');}).catch(error=>{stop();throw error;});}
  catch(error){stop();throw error;}
  return {
    track:destination.stream.getAudioTracks()[0],ready,
    connectMicrophone:track=>connect('microphone',track),disconnectMicrophone:()=>disconnect('microphone'),connectSource:track=>connect('source',track),connectPortrait:track=>connect('portrait',track),connectVoice:track=>connect('voice',track),disconnectVoice:()=>disconnect('voice'),setVoiceLevel:value=>setLevel('voice',value),disconnectPortrait:()=>disconnect('portrait'),setPortraitLevel:value=>setLevel('portrait',value),
    setMicrophoneLevel:value=>setLevel('microphone',value),setSourceLevel:value=>setLevel('source',value),
    stop,
  };
}
