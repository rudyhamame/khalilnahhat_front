import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {speechFeatures,speechMorphs,isAssistantAudible,handleAvatarVoiceEvent,conversationGesture} from './voiceAvatarMotion.js';

const pcm=Float32Array.from({length:1024},(_,i)=>Math.sin(i*.11)*.16);
const spectrum=new Uint8Array(512).fill(70);
test('silence, muted playback and missing audio cannot produce a talking mouth',()=>{
  assert.equal(speechFeatures(new Float32Array(1024),spectrum).level,0);
  assert.equal(speechFeatures(pcm,spectrum,48000,false).open,0);
  assert.equal(speechFeatures(null,null).open,0);
  for(const value of Object.values(speechMorphs(speechFeatures(pcm,spectrum,48000,false))))assert.equal(value,0);
});
test('speech mouth shapes follow actual sampled energy, not a timer',()=>{
  const quiet=speechFeatures(Float32Array.from(pcm,value=>value*.2),spectrum);
  const loud=speechFeatures(pcm,spectrum);
  assert.ok(loud.level>quiet.level);assert.ok(loud.open>quiet.open);
  for(const value of Object.values(speechMorphs(loud)))assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
});
test('spectral changes distinguish rounded vowels from high-frequency articulation estimates',()=>{
  const bass=new Uint8Array(512);bass.fill(220,4,14);
  const treble=new Uint8Array(512);treble.fill(220,45,120);
  assert.ok(speechFeatures(pcm,bass).round>speechFeatures(pcm,treble).round);
  assert.ok(speechFeatures(pcm,treble).fricative>speechFeatures(pcm,bass).fricative);
});
test('the avatar is gated by assistant playback, not microphone activity',()=>{
  const state={outputPlaying:true,listening:false,analyser:{},audio:{paused:false,muted:false,volume:1}};
  assert.equal(isAssistantAudible(state,'active'),true);
  for(const patch of [{listening:true},{outputPlaying:false},{audio:{paused:true,volume:1}},{audio:{paused:false,muted:true,volume:1}},{audio:{paused:false,muted:false,volume:0}},{analyser:null}])assert.equal(isAssistantAudible({...state,...patch},'active'),false);
  assert.equal(isAssistantAudible(state,'idle'),false);
});
test('interruptions and audio-buffer completion stop speech until playback resumes',()=>{
  const state={};handleAvatarVoiceEvent(state,{type:'output_audio_buffer.started'});assert.equal(state.outputPlaying,true);
  handleAvatarVoiceEvent(state,{type:'input_audio_buffer.speech_started'});assert.equal(state.listening,true);assert.equal(state.outputPlaying,false);
  handleAvatarVoiceEvent(state,{type:'output_audio_buffer.started'});assert.equal(state.listening,false);assert.equal(state.outputPlaying,true);
  for(const type of ['output_audio_buffer.cleared','output_audio_buffer.stopped']){handleAvatarVoiceEvent(state,{type});assert.equal(state.outputPlaying,false);}
});
test('English and Arabic utterances select modest conversational cues',()=>{
  assert.equal(conversationGesture('What date are you considering?'),'question');assert.equal(conversationGesture('ما تاريخ الفعالية؟'),'question');assert.equal(conversationGesture('Hello, welcome!'),'welcome');
});
test('the Cloudinary avatar asset used by the UI retains the verified speech model contract',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../data/cloudinaryAssets.json',import.meta.url),'utf8'));
  const contract=JSON.parse(readFileSync(new URL('./voiceAvatarAssetContract.json',import.meta.url),'utf8'));
  const component=readFileSync(new URL('../echo/EchoVoiceAvatar.jsx',import.meta.url),'utf8');
  assert.equal(manifest['/echo/models/echo-assistant-v1.glb'],contract.url);
  assert.ok(component.includes(`const MODEL='${contract.url}'`));
  assert.match(contract.sha256,/^[a-f0-9]{64}$/);
  assert.equal(contract.joints,102);
  for(const name of ['V_Open','V_Wide','V_Tight_O','Eye_Blink_L','Eye_Blink_R','Jaw_Open'])assert.ok(contract.morphTargets.includes(name),name);
  assert.equal(contract.animations,0);
});
