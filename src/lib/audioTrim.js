export const trimClock=value=>{const cents=Math.max(0,Math.round(value*100));return `${Math.floor(cents/6000)}:${(cents%6000/100).toFixed(2).padStart(5,'0')}`;};
export function trimBounds(start,end,duration){
 const minimum=Math.min(.05,duration);
 const from=Math.max(0,Math.min(Number.isFinite(start)?start:0,duration-minimum));
 return [from,Math.max(from+minimum,Math.min(Number.isFinite(end)?end:duration,duration))];
}
// Min/max across every channel preserves transients and phase-inverted stereo audio.
export function waveformPeaks(buffer,bins=2400){
 const count=Math.min(bins,buffer.length),channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
 return Array.from({length:count},(_,i)=>{
  const from=Math.floor(i*buffer.length/count),to=Math.floor((i+1)*buffer.length/count);
  let low=0,high=0;
  for(const data of channels)for(let n=from;n<to;n++){low=Math.min(low,data[n]);high=Math.max(high,data[n]);}
  return [low,high];
 });
}
