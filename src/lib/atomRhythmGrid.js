// BPM is always quarter notes/minute. Meter changes notation/counting, not tempo.
const EPS=1e-7;
export function rhythmGrid({bpm,meter='4/4',from=0,to=0,anchor=from}){
 const match=/^(\d{1,2})\/(1|2|4|8|16|32)$/.exec(meter);
 if(!(bpm>0)||!Number.isFinite(bpm)||!match||!(to>from)||!Number.isFinite(anchor))return null;
 const beatsPerBar=Number(match[1]),unit=Number(match[2]);if(beatsPerBar<1||beatsPerBar>16)return null;
 const quarterSeconds=60/bpm,beatSeconds=quarterSeconds*4/unit,barSeconds=beatSeconds*beatsPerBar;
 const indices=period=>{const first=Math.max(0,Math.ceil((from-anchor)/period-EPS)),end=Math.max(first,Math.ceil((to-anchor)/period-EPS));return{first,end,count:end-first}};
 const beats=indices(beatSeconds),pulses=indices(quarterSeconds),firstBar=Math.max(0,Math.floor((from-anchor)/barSeconds+EPS)),barEnd=Math.max(firstBar,Math.ceil((to-anchor)/barSeconds-EPS));
 const firstFull=Math.max(0,Math.ceil((from-anchor)/barSeconds-EPS)),fullEnd=Math.floor((to-anchor)/barSeconds+EPS),completeBars=Math.max(0,fullEnd-firstFull),bars=Math.max(0,barEnd-firstBar);
 const events=[];const stride=Math.max(1,Math.ceil(beats.count/600));for(let i=beats.first;i<beats.end;i+=stride)events.push({time:anchor+i*beatSeconds,beat:i%beatsPerBar+1,bar:Math.floor(i/beatsPerBar)+1,downbeat:i%beatsPerBar===0});
 const measures=[];const barStride=Math.max(1,Math.ceil(bars/150));for(let i=firstBar;i<barEnd;i+=barStride){const time=anchor+i*barSeconds;if(time>=from-EPS)measures.push({time,number:i+1});}
 return{bpm,meter,unit,beatsPerBar,quarterSeconds,beatSeconds,barSeconds,quarterBeats:pulses.count,beats:beats.count,bars,completeBars,partialBars:bars-completeBars,introSeconds:Math.max(0,Math.min(to,anchor)-from),events,measures};
}
export function rhythmPosition(time,{bpm,meter='4/4',anchor=0}){
 const match=/^(\d{1,2})\/(1|2|4|8|16|32)$/.exec(meter);if(!(bpm>0)||!Number.isFinite(bpm)||!match||time<anchor)return null;
 const beats=Number(match[1]),unit=Number(match[2]);if(beats<1||beats>16)return null;
 const beat=Math.floor((time-anchor)/(60/bpm*4/unit)+1e-7);return{bar:Math.floor(beat/beats)+1,beat:beat%beats+1};
}
