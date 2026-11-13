export function audioInputLevel(value){const level=Number(value);return Number.isFinite(level)?Math.max(0,Math.min(2,level)):1;}
export function createStudioAudioMixer({microphoneLevel=1,sourceLevel=1,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,MediaStreamClass=globalThis.MediaStream}={}){
  const context=new AudioContextClass({latencyHint:0});
  const destination=context.createMediaStreamDestination();
  // The final fader controls everything clients hear, after the independent input channels.
  const output=context.createGain();output.gain.setValueAtTime(1,context.currentTime);output.connect(destination);
  let outputLevel=1,outputMuted=false;
  const applyOutput=()=>{for(const node of [output,monitorOutput]){node.gain.cancelScheduledValues(context.currentTime);node.gain.setTargetAtTime(outputMuted?0:outputLevel,context.currentTime,.02);}};
  // A tap of the audio input only (no voice microphone), for the IN meter. It is never published.
  const meterTap=context.createMediaStreamDestination();
  // The voice microphone has its own tap, so its meter shows the level AFTER its fader, like the audio input meter.
  const voiceTap=context.createMediaStreamDestination();
  // Private headphones mix. Its channel mutes never touch the client mix or its meters.
  const monitorDestination=context.createMediaStreamDestination(),monitorOutput=context.createGain();
  monitorOutput.gain.setValueAtTime(1,context.currentTime);monitorOutput.connect(monitorDestination);
  const monitorMuted={voice:false,input:false};
  const inputs=new Map(),levels={microphone:audioInputLevel(microphoneLevel),source:audioInputLevel(sourceLevel),portrait:1,voice:1,pause:1};
  // master: the manual level of the whole audio input (microphone, tab/file sound, portrait sound); duck: the automatic level applied on top
  // while the voice microphone speaks. The voice microphone itself is never scaled by either.
  const bus={master:1,duck:1,mute:1};
  const scaled=kind=>kind==='voice'||kind==='pause'?levels.voice:levels[kind]*bus.master*bus.duck*bus.mute;
  let stopped=false;
  let voiceClarity=false;
  const routeVoice=input=>{
    input.source.disconnect();input.effects?.forEach(node=>node.disconnect());input.effects=[];
    if(!voiceClarity){input.source.connect(input.gain);return;}
    const lowCut=context.createBiquadFilter();lowCut.type='highpass';lowCut.frequency.value=90;lowCut.Q.value=.707;
    const compressor=context.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=12;compressor.ratio.value=3;compressor.attack.value=.005;compressor.release.value=.18;
    input.source.connect(lowCut);lowCut.connect(compressor);compressor.connect(input.gain);input.effects=[lowCut,compressor];
  };
  const disconnect=kind=>{const input=inputs.get(kind);input?.source.disconnect();input?.effects?.forEach(node=>node.disconnect());input?.gain.disconnect();input?.monitorGain.disconnect();inputs.delete(kind);};
  const connect=(kind,track)=>{
    disconnect(kind);if(!track)return;
    const source=context.createMediaStreamSource(new MediaStreamClass([track])),gain=context.createGain();
    gain.gain.setValueAtTime(scaled(kind),context.currentTime);
    const monitorGain=context.createGain();monitorGain.gain.setValueAtTime(monitorMuted[kind==='voice'?'voice':'input']?0:1,context.currentTime);
    const input={source,gain,monitorGain};if(kind==='voice')routeVoice(input);else source.connect(gain);
    gain.connect(output);gain.connect(monitorGain);monitorGain.connect(monitorOutput);if(kind==='voice')gain.connect(voiceTap);else if(kind!=='pause')gain.connect(meterTap);inputs.set(kind,input);
  };
  const setLevel=(kind,value)=>{
    levels[kind]=audioInputLevel(value);apply(kind,.01);
  };
  const apply=(kind,smoothing)=>{const parameter=inputs.get(kind)?.gain.gain;if(parameter){parameter.cancelScheduledValues(context.currentTime);parameter.setTargetAtTime(scaled(kind),context.currentTime,smoothing);}};
  const applyBus=smoothing=>{for(const kind of ['microphone','source','portrait'])apply(kind,smoothing);};
  const stop=()=>{if(stopped)return;stopped=true;disconnect('microphone');disconnect('source');disconnect('portrait');disconnect('voice');disconnect('pause');output.disconnect();monitorOutput.disconnect();for(const tap of [destination,monitorDestination,meterTap,voiceTap])tap.stream.getTracks?.().forEach(track=>track.stop());void context.close().catch(()=>{});};
  let ready;
  try{ready=Promise.resolve(context.resume()).then(()=>{if(context.state&&context.state!=='running'&&!stopped)throw new Error('The browser paused audio. Retry private preview.');}).catch(error=>{stop();throw error;});}
  catch(error){stop();throw error;}
  return {
    track:destination.stream.getAudioTracks()[0],ready,meterStream:meterTap.stream,voiceMeterStream:voiceTap.stream,outputMeterStream:destination.stream,monitorStream:monitorDestination.stream,
    setMonitorMuted:(kind,on)=>{if(!(kind in monitorMuted))return;monitorMuted[kind]=Boolean(on);for(const [inputKind,input] of inputs)if((inputKind==='voice'?'voice':'input')===kind){input.monitorGain.gain.cancelScheduledValues(context.currentTime);input.monitorGain.gain.setTargetAtTime(on?0:1,context.currentTime,.01);}},
    setOutputLevel:value=>{outputLevel=audioInputLevel(value);applyOutput();},setOutputMuted:on=>{outputMuted=Boolean(on);applyOutput();},
    setVoiceClarity:on=>{if(voiceClarity===Boolean(on))return;voiceClarity=Boolean(on);const voice=inputs.get('voice');if(voice)routeVoice(voice);},
    connectMicrophone:track=>connect('microphone',track),disconnectMicrophone:()=>disconnect('microphone'),connectSource:track=>connect('source',track),connectPortrait:track=>connect('portrait',track),connectVoice:track=>connect('voice',track),connectPause:track=>connect('pause',track),disconnectVoice:()=>disconnect('voice'),setVoiceLevel:value=>setLevel('voice',value),disconnectPortrait:()=>disconnect('portrait'),setPortraitLevel:value=>setLevel('portrait',value),
    // Muting the audio input keeps its level setting; the voice microphone is not affected.
    setMuted:on=>{bus.mute=on?0:1;applyBus(.01);},
    setMasterLevel:value=>{bus.master=audioInputLevel(value);applyBus(.02);},
    // factor 1 = untouched, lower = ducked; attack/release smoothing comes from the time constant
    setDuck:(factor,smoothing=.08)=>{bus.duck=Math.max(0,Math.min(1,Number(factor)));applyBus(smoothing);},
    setMicrophoneLevel:value=>setLevel('microphone',value),setSourceLevel:value=>setLevel('source',value),
    stop,
  };
}
