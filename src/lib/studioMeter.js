// Signal readings are sample peaks in dBFS; gain settings are separate dB values.
export const METER_FLOOR=-60;
export const MAX_GAIN_DB=20*Math.log10(2);
export const amplitudeToDb=value=>value>0?20*Math.log10(value):-Infinity;
export const meterPosition=db=>Math.max(0,Math.min(1,(db-METER_FLOOR)/-METER_FLOOR));
export const gainToDb=amplitudeToDb;
export const formatDb=gain=>{const db=gainToDb(gain);return db===-Infinity?'−∞':`${db>0?'+':''}${db.toFixed(1)}`;};
export const snapGain=value=>{const gain=Number(value);return Math.abs(gain-1)<.04?1:gain;};
export const gainToFader=gain=>gain<=0?0:Math.max(0,Math.min(1000,(gainToDb(gain)-METER_FLOOR)/(MAX_GAIN_DB-METER_FLOOR)*1000));
export const faderToGain=value=>Number(value)<=0?0:Number(value)>=1000?2:snapGain(10**((METER_FLOOR+Number(value)/1000*(MAX_GAIN_DB-METER_FLOOR))/20));
export function samplePeak(channels){
 let peak=0;
 for(const samples of channels)for(const sample of samples)if(Number.isFinite(sample))peak=Math.max(peak,Math.abs(sample));
 return amplitudeToDb(peak);
}
export function advanceMeter(previous,db,seconds){
 const dt=Math.max(0,Math.min(.25,seconds)),bounded=Math.max(METER_FLOOR,Math.min(0,db));
 const levelDb=Math.max(bounded,previous.levelDb-24*dt);
 const newPeak=bounded>=previous.peakDb;
 const hold=newPeak?1.5:Math.max(0,previous.hold-dt);
 const peakDb=newPeak?bounded:Math.max(bounded,previous.peakDb-12*Math.max(0,dt-previous.hold));
 return {levelDb,peakDb,hold,clip:previous.clip||db>=0};
}
export const emptyMeter=()=>({levelDb:METER_FLOOR,peakDb:METER_FLOOR,hold:0,clip:false});

// Split before analysing: downmixing L/R first would cancel opposite-phase audio.
// The zero-gain sink makes the graph run without playing sound or altering capture.
export function createStudioMeter(stream,{AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext}={}){
 if(!AudioContextClass)throw new Error('Audio metering is unavailable.');
 const context=new AudioContextClass();
 let source,splitter,sink,analysers=[],closed=false;
 const stop=()=>{if(closed)return;closed=true;for(const node of [source,splitter,...analysers,sink])node?.disconnect();void context.close().catch(()=>{});};
 try{
  source=context.createMediaStreamSource(stream);splitter=context.createChannelSplitter(2);sink=context.createGain();sink.gain.value=0;sink.connect(context.destination);source.connect(splitter);
  analysers=Array.from({length:2},(_,channel)=>{const analyser=context.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0;splitter.connect(analyser,channel);analyser.connect(sink);return analyser;});
  const samples=analysers.map(analyser=>new Float32Array(analyser.fftSize));
  return {
   resume:()=>closed||context.state==='running'?Promise.resolve():context.resume(),
   read:()=>{
    if(closed)return {db:-Infinity,status:'idle'};
    const track=stream.getAudioTracks()[0];
    if(!track||track.readyState==='ended'||!track.enabled||track.muted)return {db:-Infinity,status:'idle'};
    if(context.state!=='running')return {db:-Infinity,status:'waiting'};
    analysers.forEach((analyser,index)=>analyser.getFloatTimeDomainData(samples[index]));
    return {db:samplePeak(samples),status:'running'};
   },stop,
  };
 }catch(error){stop();throw error;}
}
