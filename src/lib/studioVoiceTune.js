import {VocalCorrectionProcessor} from './VocalCorrectionProcessor.js';
import {normalizeVocalSettings} from './vocalPitch.js';

// Owns only the tuning graph; the microphone track belongs to the Studio.
export function createStudioVoiceTuner({workletUrl,onTrack=()=>{},onStatus=()=>{},onPitch=()=>{},AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,ProcessorClass=VocalCorrectionProcessor}={}){
 let raw=null,context=null,processor=null,ready=false,generation=0,settings=normalizeVocalSettings();
 const release=()=>{generation++;ready=false;const old=processor,oldContext=context;processor=null;context=null;void old?.destroy();void oldContext?.close().catch(()=>{});};
 const apply=async()=>{
  if(!raw||!settings.enabled){release();onTrack(raw);onStatus(settings.enabled?'Turn on the left microphone to use vocal tuning.':'Vocal tuning is off.');return;}
  if(processor){processor.configure(settings);return;}
  const request=++generation;
  try{
   if(!AudioContextClass)throw new Error('Audio processing is unavailable in this browser.');
   context=new AudioContextClass({latencyHint:0});const audioContext=context;
   const current=new ProcessorClass(settings,{workletUrl,onStatus:message=>{if(request===generation)onStatus(message);},onPitch:message=>{if(request===generation)onPitch(message);}});processor=current;
   onStatus('Loading vocal tuning…');await audioContext.resume();
   if(request!==generation)return;
   await current.init({audioContext,track:raw});
   if(request!==generation){await current.destroy();return;}
   ready=true;onTrack(current.processedTrack);
  }catch(error){if(request!==generation)return;release();onTrack(raw);onStatus(`Vocal tuning unavailable; your natural voice is still active. ${error.message||''}`);}
 };
 return {
  get track(){return ready?processor.processedTrack:raw;},
  configure:value=>{settings=normalizeVocalSettings(value);return apply();},
  setInput:track=>{release();raw=track||null;onTrack(raw);return apply();},
  stop:()=>{release();raw=null;onTrack(null);},
 };
}
