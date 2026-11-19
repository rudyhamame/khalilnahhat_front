import {detectTempos,firstBeat,onsetEnvelope} from './bpmDetection.js';
export function analyzeRhythmSamples(channels,sampleRate,{offset=0}={}){
 const length=Math.min(...channels.map(channel=>channel.length));if(length<sampleRate*8)throw Error('Use an atom with at least 8 seconds of audio to analyze rhythm.');
 const mixed=new Float32Array(length);for(const channel of channels){let square=0;for(let i=0;i<length;i++)square+=channel[i]*channel[i];const gain=1/Math.max(.02,Math.sqrt(square/length));for(let i=0;i<length;i++)mixed[i]+=channel[i]*gain/channels.length;}
 const tempos=detectTempos(mixed,sampleRate);if(!tempos.tempos.length)throw Error('No steady pulse was found. Enter BPM manually to build the grid.');
 const bpm=tempos.tempos[0].bpm,beat=firstBeat(mixed,sampleRate,bpm),start=beat?.start??0,period=60/bpm,{flux,rate}=onsetEnvelope(mixed,sampleRate),strength=[];
 for(let time=start;time<length/sampleRate;time+=period){const at=Math.round(time*rate),radius=Math.max(1,Math.round(rate*.05));let peak=0;for(let i=Math.max(0,at-radius);i<Math.min(flux.length,at+radius+1);i++)peak=Math.max(peak,flux[i]);strength.push(peak);}
 const candidates=[];
 for(const count of [2,3,4,5,6,7,8]){if(strength.length<count*4)continue;let best=null;for(let phase=0;phase<count;phase++){let down=0,other=0,n=0,m=0;strength.forEach((value,index)=>{if(index%count===phase){down+=value;n++;}else{other+=value;m++;}});const a=down/Math.max(1,n),b=other/Math.max(1,m),score=(a-b)/Math.max(1e-6,a+b);if(!best||score>best.score)best={meter:`${count}/4`,score,phase};}if(best?.score>.04)candidates.push(best);}
 candidates.sort((a,b)=>b.score-a.score);const best=candidates[0],ambiguous=!best||best.score<.12||(candidates[1]?.score??0)>best.score*.88;
 return{bpm,tempos,beatStartSec:offset+start,suggestedMeter:ambiguous?null:best.meter,barStartSec:offset+start+(ambiguous?0:best.phase*period),candidates:candidates.slice(0,3).map(({meter,phase})=>({meter,barStartSec:offset+start+phase*period})),ambiguous,range:{startSec:offset,endSec:offset+length/sampleRate}};
}
