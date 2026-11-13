// Wall-clock ranges map audience comments onto media time; pause gaps are excluded.
export function createRecordingClock(previous=[],now=Date.now){
 const ranges=previous.map(range=>({...range}));
 const stop=()=>{const last=ranges.at(-1);if(last&&last.endMs===null)last.endMs=Math.max(last.startMs,now());};
 const start=()=>{if(ranges.at(-1)?.endMs===null)return;const last=ranges.at(-1);ranges.push({startMs:now(),endMs:null,offsetSec:last?last.offsetSec+(last.endMs-last.startMs)/1000:0});};
 return {start,stop,snapshot:()=>ranges.map(range=>({...range}))};
}
