import {test} from 'node:test';import assert from 'node:assert/strict';
import {createStudioAudioMixer,audioInputLevel} from './studioAudioMixer.js';
function fixture(){
 const inputs=[],gains=[],destinations=[],effects=[];let closes=0,outputStops=0;
 const output={kind:'audio',stop(){outputStops++;}},destination={stream:{getAudioTracks:()=>[output],getTracks:()=>[output]}};
 const delays=[];
 class AudioContextClass{
  constructor(options){assert.equal(options.latencyHint,0);this.currentTime=1;}
  resume(){return Promise.resolve();}close(){closes++;return Promise.resolve();}
  createMediaStreamDestination(){const tap=destinations.length?{stream:{}}:destination;destinations.push(tap);return tap;}
  createMediaStreamSource(stream){const node={stream,connect(target){this.target=target;},disconnect(){this.disconnected=true;}};inputs.push(node);return node;}
  createBiquadFilter(){const node={frequency:{value:0},Q:{value:0},connect(target){this.target=target;},disconnect(){this.disconnected=true;}};effects.push(node);return node;}
  createDynamicsCompressor(){const node={threshold:{},knee:{},ratio:{},attack:{},release:{},connect(target){this.target=target;},disconnect(){this.disconnected=true;}};effects.push(node);return node;}
  createGain(){const node={gain:{value:1,setValueAtTime(value){this.value=value;},cancelScheduledValues(){},setTargetAtTime(value){this.value=value;}},targets:[],connect(target){this.targets.push(target);},disconnect(){this.disconnected=true;}};gains.push(node);return node;}
 }
 class MediaStreamClass{constructor(tracks){this.tracks=tracks;}}
 const mixer=createStudioAudioMixer({AudioContextClass,MediaStreamClass});
 return {mixer,inputs,effects,get gains(){return gains.slice(2).filter((_,index)=>index%2===0);},get monitorGains(){return gains.slice(2).filter((_,index)=>index%2===1);},monitorOutput:gains[1],outputGain:gains[0],destinations,delays,output,counts:()=>({closes,outputStops})};
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

test('output fader and mute affect the final mix while preserving independent input meters and levels',async()=>{
 const f=fixture();await f.mixer.ready;
 f.mixer.connectSource({kind:'audio'});f.mixer.connectVoice({kind:'audio'});f.mixer.connectPause({kind:'audio'});
 assert.equal(f.mixer.outputMeterStream,f.destinations[0].stream);
 assert.equal(f.mixer.track,f.output);
 assert.deepEqual(f.outputGain.targets,[f.destinations[0]]);
 assert.deepEqual(f.gains[0].targets,[f.outputGain,f.monitorGains[0],f.destinations[1]]);
 assert.deepEqual(f.gains[1].targets,[f.outputGain,f.monitorGains[1],f.destinations[2]]);
 assert.deepEqual(f.gains[2].targets,[f.outputGain,f.monitorGains[2]]);
 f.mixer.setOutputLevel(.4);assert.equal(f.outputGain.gain.value,.4);
 assert.deepEqual(f.gains.map(node=>node.gain.value),[1,1,1]);
 f.mixer.setOutputMuted(true);assert.equal(f.outputGain.gain.value,0);
 f.mixer.setOutputLevel(.7);assert.equal(f.outputGain.gain.value,0);
 f.mixer.setOutputMuted(false);assert.equal(f.outputGain.gain.value,.7);
 f.mixer.setOutputLevel(9);assert.equal(f.outputGain.gain.value,2);
 f.mixer.stop();assert.equal(f.outputGain.disconnected,true);
});

test('auto voice clarity filters and compresses only the voice, and can be bypassed without changing its level',async()=>{
 const f=fixture();await f.mixer.ready;f.mixer.connectSource({kind:'audio'});f.mixer.connectVoice({kind:'audio'});
 f.mixer.setVoiceLevel(.8);f.mixer.setVoiceClarity(true);
 const [filter,compressor]=f.effects;
 assert.equal(filter.type,'highpass');assert.equal(filter.frequency.value,90);
 assert.equal(compressor.ratio.value,3);
 assert.equal(f.inputs[1].target,filter);assert.equal(filter.target,compressor);assert.equal(compressor.target,f.gains[1]);
 assert.equal(f.inputs[0].target,f.destinations[3]);assert.equal(f.gains[1].gain.value,.8);
 f.mixer.setVoiceClarity(false);assert.equal(f.inputs[1].target,f.gains[1]);
 assert.ok(f.effects.every(node=>node.disconnected));
 f.mixer.setVoiceClarity(true);f.mixer.stop();assert.ok(f.effects.every(node=>node.disconnected));
});

test('automatic key analysis receives music before ducking, excluding the voice and pause sound',async()=>{
 const f=fixture();await f.mixer.ready;f.mixer.connectSource({kind:'audio'});f.mixer.connectVoice({kind:'audio'});f.mixer.connectPause({kind:'audio'});
 assert.equal(f.mixer.musicAnalysisStream,f.destinations[3].stream);
 assert.equal(f.inputs[0].target,f.destinations[3]);
 assert.equal(f.inputs[1].target,f.gains[1]);assert.equal(f.inputs[2].target,f.gains[2]);
 f.mixer.setDuck(.3);assert.equal(f.gains[0].gain.value,.3);assert.equal(f.gains[1].gain.value,1);
 f.mixer.stop();
});

test('private microphone and music mutes never change the client output, input levels, or meters',async()=>{
 const f=fixture();await f.mixer.ready;f.mixer.connectSource({kind:'audio'});f.mixer.connectVoice({kind:'audio'});
 assert.equal(f.mixer.monitorStream,f.destinations[4].stream);
 assert.deepEqual(f.monitorGains.map(node=>node.gain.value),[1,1]);
 f.mixer.setMonitorMuted('voice',true);assert.deepEqual(f.monitorGains.map(node=>node.gain.value),[1,0]);
 f.mixer.setMonitorMuted('input',true);assert.deepEqual(f.monitorGains.map(node=>node.gain.value),[0,0]);
 assert.deepEqual(f.gains.map(node=>node.gain.value),[1,1]);assert.equal(f.outputGain.gain.value,1);
 assert.equal(f.mixer.track,f.output);
 f.mixer.setMonitorMuted('voice',false);assert.deepEqual(f.monitorGains.map(node=>node.gain.value),[0,1]);
 f.mixer.connectPortrait({kind:'audio'});assert.equal(f.monitorGains[2].gain.value,0);
 f.mixer.setOutputLevel(.6);assert.equal(f.monitorOutput.gain.value,.6);assert.equal(f.outputGain.gain.value,.6);
 f.mixer.stop();assert.ok(f.monitorGains.every(node=>node.disconnected));
});
