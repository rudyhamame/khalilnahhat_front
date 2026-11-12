// Level, loudness (ITU-R BS.1770 / EBU R128), noise and stereo checks for a decoded stereo buffer. Pure maths, no DOM.
const db=value=>value>1e-9?20*Math.log10(value):-120;
const powerDb=value=>value>1e-12?10*Math.log10(value):-120;
// K-weighting: high shelf then high-pass, coefficients derived for any sample rate.
function kFilters(fs){
 const shelf=(()=>{const f0=1681.974450955533,gain=3.999843853973347,q=.7071752369554196,A=10**(gain/40),w=2*Math.PI*f0/fs,alpha=Math.sin(w)/(2*q),cos=Math.cos(w),sq=2*Math.sqrt(A)*alpha;
  const a0=(A+1)-(A-1)*cos+sq;return {b:[A*((A+1)+(A-1)*cos+sq)/a0,-2*A*((A-1)+(A+1)*cos)/a0,A*((A+1)+(A-1)*cos-sq)/a0],a:[2*((A-1)-(A+1)*cos)/a0,((A+1)-(A-1)*cos-sq)/a0]};})();
 const high=(()=>{const f0=38.13547087602444,q=.5003270373238773,w=2*Math.PI*f0/fs,alpha=Math.sin(w)/(2*q),cos=Math.cos(w),a0=1+alpha;
  return {b:[(1+cos)/2/a0,-(1+cos)/a0,(1+cos)/2/a0],a:[-2*cos/a0,(1-alpha)/a0]};})();
 return [shelf,high];
}
function weightedEnergyPerHop(data,fs,hop){
 const [shelf,high]=kFilters(fs),hops=Math.floor(data.length/hop),energy=new Float64Array(hops);
 let s1=0,s2=0,h1=0,h2=0;
 for(let i=0;i<hops*hop;i++){
  const x=data[i],y=shelf.b[0]*x+s1;s1=shelf.b[1]*x-shelf.a[0]*y+s2;s2=shelf.b[2]*x-shelf.a[1]*y;
  const z=high.b[0]*y+h1;h1=high.b[1]*y-high.a[0]*z+h2;h2=high.b[2]*y-high.a[1]*z;
  energy[Math.floor(i/hop)]+=z*z;
 }
 return energy;
}
const percentile=(sorted,p)=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(p*(sorted.length-1)))]:NaN;
export function analyzeAudio(channels,fs){
 const left=channels[0],right=channels[1]||channels[0],length=left.length,step=Math.round(fs*.05),frames=Math.floor(length/step);
 const peakL=new Float32Array(frames),peakR=new Float32Array(frames),rmsL=new Float32Array(frames),rmsR=new Float32Array(frames);
 let peak=0,sumL=0,sumR=0,sqL=0,sqR=0,cross=0,clipped=0,events=0,run=0;
 for(let f=0;f<frames;f++){
  let pl=0,pr=0,ql=0,qr=0;
  for(let i=f*step,end=i+step;i<end;i++){
   const l=left[i],r=right[i],al=Math.abs(l),ar=Math.abs(r);
   if(al>pl)pl=al;if(ar>pr)pr=ar;ql+=l*l;qr+=r*r;sumL+=l;sumR+=r;cross+=l*r;
   if(al>=.9995||ar>=.9995){clipped++;if(++run===3)events++;}else run=0;
  }
  peakL[f]=pl;peakR[f]=pr;rmsL[f]=Math.sqrt(ql/step);rmsR[f]=Math.sqrt(qr/step);sqL+=ql;sqR+=qr;peak=Math.max(peak,pl,pr);
 }
 const n=frames*step||1,rms=Math.sqrt((sqL+sqR)/(2*n));
 // Integrated loudness: 400 ms blocks, 100 ms hop, absolute gate -70 LUFS then relative gate -10 LU.
 const hop=Math.round(fs*.1),eL=weightedEnergyPerHop(left,fs,hop),eR=right===left?eL:weightedEnergyPerHop(right,fs,hop),blocks=[];
 for(let i=0;i+4<=eL.length;i++){const e=(eL[i]+eL[i+1]+eL[i+2]+eL[i+3]+eR[i]+eR[i+1]+eR[i+2]+eR[i+3])/(4*hop);blocks.push(e);}
 const loud=e=>-.691+powerDb(e),gated=blocks.filter(e=>loud(e)>-70);
 let integrated=NaN,range=NaN;
 if(gated.length){
  const mean=gated.reduce((a,b)=>a+b,0)/gated.length,relative=loud(mean)-10,kept=gated.filter(e=>loud(e)>relative);
  integrated=kept.length?loud(kept.reduce((a,b)=>a+b,0)/kept.length):NaN;
  // Loudness range from 3 s short-term windows (-20 LU relative gate, 10th to 95th percentile).
  const shortTerm=[];for(let i=0;i+30<=blocks.length;i+=10){let sum=0;for(let k=0;k<30;k++)sum+=blocks[i+k];shortTerm.push(loud(sum/30));}
  const first=shortTerm.filter(v=>v>-70);
  if(first.length>1){const avg=powerDb(first.reduce((a,v)=>a+10**(v/10),0)/first.length)-20,sorted=first.filter(v=>v>avg).sort((a,b)=>a-b);if(sorted.length>1)range=percentile(sorted,.95)-percentile(sorted,.1);}
 }
 // Noise floor: the quietest 5 % of non-silent 50 ms windows.
 const levels=Array.from({length:frames},(_,f)=>Math.max(rmsL[f],rmsR[f])).filter(v=>v>1e-5).sort((a,b)=>a-b);
 const noise=levels.length?db(percentile(levels,.05)):NaN;
 const audible=f=>Math.max(peakL[f],peakR[f])>10**(-60/20);
 let head=0;while(head<frames&&!audible(head))head++;
 let tail=frames-1;while(tail>head&&!audible(tail))tail--;
 const corr=sqL>0&&sqR>0?cross/Math.sqrt(sqL*sqR):1;
 return {
  duration:length/fs,peakDb:db(peak),rmsDb:db(rms),lufs:integrated,range,noiseDb:noise,clippedSamples:clipped,clipEvents:events,
  dcLeft:sumL/n,dcRight:sumR/n,correlation:corr,headSilence:head*step/fs,tailSilence:(frames-1-tail)*step/fs,
  plr:Number.isFinite(integrated)?db(peak)-integrated:NaN,
  envelope:{step:step/fs,peakL,peakR,rmsL,rmsR},
 };
}
export {db};
