// Waveform drawing at any zoom (like a DAW): keep a min/max pyramid of the samples and redraw only the visible time range
// at screen resolution. Deep zoom switches from peak columns to the real sample line.
const FACTOR=8;
export function buildPyramid(samples,sampleRate){
 const levels=[{step:1,min:samples,max:samples}];
 let previous=levels[0];
 while(previous.min.length>FACTOR*4){
  const length=Math.ceil(previous.min.length/FACTOR),min=new Float32Array(length),max=new Float32Array(length);
  for(let i=0;i<length;i++){
   let low=Infinity,high=-Infinity;
   for(let k=i*FACTOR,end=Math.min(previous.min.length,k+FACTOR);k<end;k++){if(previous.min[k]<low)low=previous.min[k];if(previous.max[k]>high)high=previous.max[k];}
   min[i]=low;max[i]=high;
  }
  previous={step:previous.step*FACTOR,min,max};levels.push(previous);
 }
 let top=0;for(let i=0;i<previous.max.length;i++)top=Math.max(top,Math.abs(previous.max[i]),Math.abs(previous.min[i]));
 return {levels,sampleRate,length:samples.length,duration:samples.length/sampleRate,top};
}
// Path for the time range [from, to] (seconds) in a 1000 x 80 box (centre 40). `scale` is the vertical gain.
export function pyramidPath(pyramid,from,to,scale=1,columns=900,height=35,units=1000){
 if(!pyramid||!(to>from))return '';
 const fs=pyramid.sampleRate,start=Math.max(0,from*fs),end=Math.min(pyramid.length,to*fs),span=end-start;
 if(span<=0)return '';
 const clamp=value=>Math.max(-1,Math.min(1,value*scale)),y=value=>(40-clamp(value)*height).toFixed(2);
 const perColumn=span/columns;
 if(perColumn<2){
  // Sample-accurate line.
  const data=pyramid.levels[0].min,first=Math.max(0,Math.floor(start)-1),last=Math.min(pyramid.length-1,Math.ceil(end)+1);let path='';
  for(let i=first;i<=last;i++){const x=((i/fs-from)/(to-from)*units).toFixed(2);path+=`${i===first?'M':'L'}${x},${y(data[i])}`;}
  return path;
 }
 let level=pyramid.levels[0];for(const candidate of pyramid.levels)if(candidate.step<=perColumn/2)level=candidate;
 let path='';
 for(let c=0;c<columns;c++){
  const a=Math.floor((start+c*perColumn)/level.step),b=Math.max(a+1,Math.ceil((start+(c+1)*perColumn)/level.step));
  let low=Infinity,high=-Infinity;
  for(let k=a;k<b&&k<level.min.length;k++){if(level.min[k]<low)low=level.min[k];if(level.max[k]>high)high=level.max[k];}
  if(low===Infinity)continue;
  const x=((c+.5)*units/columns).toFixed(2),top=y(high),bottom=y(low);
  path+=`M${x},${top}V${top===bottom?(Number(bottom)+.6).toFixed(2):bottom}`;
 }
 return path;
}

// The waveform path is drawn for a buffer three windows wide (one before, the visible one, one after); while playing, only the SVG viewBox
// slides across it, so following the playhead costs nothing per frame. `s` is the window start as a fraction of the duration, `z` the zoom.
export function bufferFor(s,z,duration){
 const span=duration/z,from=Math.max(0,s*duration-span),to=Math.min(duration,s*duration+2*span);
 return {span,from,to,units:1000*(to-from)/span,columns:Math.min(5400,Math.max(900,Math.round(900*(to-from)/span)))};
}
export const viewBoxX=(s,duration,buffer)=>((s*duration-buffer.from)/buffer.span)*1000;
