import {test} from 'node:test';import assert from 'node:assert/strict';
import {createStudioAudioMixer,audioInputLevel} from './studioAudioMixer.js';
function fixture(){
 const inputs=[],gains=[];let closes=0,outputStops=0;
 const output={kind:'audio',stop(){outputStops++;}},destination={stream:{getAudioTracks:()=>[output],getTracks:()=>[output]}};
 const delays=[];
 class AudioContextClass{
  constructor(options){assert.equal(options.latencyHint,0);this.currentTime=1;}
  resume(){return Promise.resolve();}close(){closes++;return Promise.resolve();}
  createMediaStreamDestination(){return destination;}
  createMediaStreamSource(stream){const node={stream,connect(target){this.target=target;},disconnect(){this.disconnected=true;}};inputs.push(node);return node;}
  createGain(){const node={gain:{value:1,setValueAtTime(value){this.value=value;},cancelScheduledValues(){},setTargetAtTime(value){this.value=value;}},connect(target){assert.equal(target,destination);},disconnect(){this.disconnected=true;}};gains.push(node);return node;}
 }
 class MediaStreamClass{constructor(tracks){this.tracks=tracks;}}
 const mixer=createStudioAudioMixer({AudioContextClass,MediaStreamClass});
 return {mixer,inputs,gains,delays,output,counts:()=>({closes,outputStops})};
}
test('independent faders update the same outgoing track at unity by default',async()=>{
 const f=fixture(),mic={kind:'audio'},source={kind:'audio'};await f.mixer.ready;
 f.mixer.connectMicrophone(mic);f.mixer.connectSource(source);assert.equal(f.mixer.track,f.output);
 assert.deepEqual(f.inputs.map(input=>input.stream.tracks),[[mic],[source]]);assert.deepEqual(f.gains.map(node=>node.gain.value),[1,1]);
 f.mixer.setMicrophoneLevel(.5);assert.deepEqual(f.gains.map(node=>node.gain.value),[.5,1]);
 f.mixer.setSourceLevel(0);assert.deepEqual(f.gains.map(node=>node.gain.value),[.5,0]);assert.equal(f.mixer.track,f.output);
 f.mixer.disconnectMicrophone();assert.equal(f.inputs[0].disconnected,true);assert.equal(f.inputs[1].disconnected,undefined);
 f.mixer.connectMicrophone(mic);assert.equal(f.gains[2].gain.value,.5);
 f.mixer.stop();f.mixer.stop();assert.deepEqual(f.counts(),{closes:1,outputStops:1});assert.equal(f.inputs[1].disconnected,true);
});
test('input levels are bounded without silently enabling compression or gain automation',()=>{
 assert.equal(audioInputLevel(-1),0);assert.equal(audioInputLevel(3),2);assert.equal(audioInputLevel('oops'),1);assert.equal(audioInputLevel(1),1);
});
test('the portrait source has its own channel, mixed with the microphone and source and released with the mixer',async()=>{
 const f=fixture(),mic={kind:'audio'},portrait={kind:'audio'};await f.mixer.ready;
 f.mixer.connectMicrophone(mic);f.mixer.connectPortrait(portrait);
 assert.deepEqual(f.inputs.map(input=>input.stream.tracks),[[mic],[portrait]]);assert.deepEqual(f.gains.map(node=>node.gain.value),[1,1]);
 f.mixer.setPortraitLevel(.25);assert.deepEqual(f.gains.map(node=>node.gain.value),[1,.25]);
 f.mixer.disconnectPortrait();assert.equal(f.inputs[1].disconnected,true);
 f.mixer.connectPortrait(portrait);f.mixer.stop();assert.equal(f.inputs[2].disconnected,true);
});

test('the voice microphone is its own isolated channel: its own track, level and release',async()=>{
 const f=fixture(),mic={kind:'audio'},voice={kind:'audio'};await f.mixer.ready;
 f.mixer.connectMicrophone(mic);f.mixer.connectVoice(voice);
 assert.deepEqual(f.inputs.map(input=>input.stream.tracks),[[mic],[voice]]);
 f.mixer.setVoiceLevel(.5);assert.deepEqual(f.gains.map(node=>node.gain.value),[1,.5]);
 f.mixer.setMicrophoneLevel(0);assert.deepEqual(f.gains.map(node=>node.gain.value),[0,.5]);
 f.mixer.disconnectVoice();assert.equal(f.inputs[1].disconnected,true);assert.equal(f.inputs[0].disconnected,undefined);
});

test('master level scales the whole audio input but never the voice microphone; ducking is applied on top and the voice stays clear',async()=>{
 const f=fixture(),mic={kind:'audio'},source={kind:'audio'},voice={kind:'audio'};await f.mixer.ready;
 f.mixer.connectMicrophone(mic);f.mixer.connectSource(source);f.mixer.connectVoice(voice);
 f.mixer.setMasterLevel(.5);assert.deepEqual(f.gains.map(node=>node.gain.value),[.5,.5,1]);
 f.mixer.setDuck(.25);assert.deepEqual(f.gains.map(node=>node.gain.value),[.125,.125,1]);
 f.mixer.setDuck(1);f.mixer.setSourceLevel(.8);assert.deepEqual(f.gains.map(node=>node.gain.value),[.5,.4,1]);
 f.mixer.setMasterLevel(5);assert.equal(f.gains[0].gain.value,2);
 f.mixer.connectPortrait({kind:'audio'});assert.equal(f.gains.at(-1).gain.value,2);
});
