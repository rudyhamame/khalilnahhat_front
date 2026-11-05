// Coarse timbral changes are boundary evidence, not song identifications.
const fftPower=samples=>{
 const n=samples.length,re=Float64Array.from(samples),im=new Float64Array(n);
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}
 for(let size=2;size<=n;size*=2){const angle=-2*Math.PI/size;for(let start=0;start<n;start+=size){for(let j=0;j<size/2;j++){const c=Math.cos(angle*j),s=Math.sin(angle*j),a=start+j,b=a+size/2,tr=re[b]*c-im[b]*s,ti=re[b]*s+im[b]*c;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;}}}
 return Array.from({length:n/2},(_,i)=>re[i]*re[i]+im[i]*im[i]);
};
self.onmessage=({data:{samples,rate}})=>{
 try{
  const step=rate,frames=[];
  for(let offset=0;offset<samples.length;offset+=step){
   let energy=0;const end=Math.min(samples.length,offset+step);for(let i=offset;i<end;i++)energy+=samples[i]*samples[i];
   const window=new Float32Array(1024);for(let i=0;i<window.length;i++)window[i]=(samples[Math.min(end-1,offset+i)]||0)*(.5-.5*Math.cos(2*Math.PI*i/1023));
   const power=fftPower(window),bands=new Array(8).fill(0);
   for(let i=1;i<power.length;i++)bands[Math.min(7,Math.floor(Math.log2(i)))]+=power[i];
   const total=bands.reduce((a,b)=>a+b,0)||1;frames.push({rms:Math.sqrt(energy/Math.max(1,end-offset)),bands:bands.map(value=>value/total)});
  }
  const sorted=frames.map(frame=>frame.rms).sort((a,b)=>a-b),threshold=(sorted[Math.floor(sorted.length*.85)]||0)*.035,candidates=[];
  for(let index=15;index<frames.length-15;index++){
   const mean=(start,end)=>{const values=new Array(8).fill(0);for(let j=start;j<end;j++)for(let k=0;k<8;k++)values[k]+=frames[j].bands[k]/(end-start);return values;};
   const before=mean(index-10,index-2),after=mean(index+2,index+10),novelty=before.reduce((sum,value,k)=>sum+Math.abs(value-after[k]),0)/2;
   let quiet=0;for(let j=index-2;j<=index+2;j++)if(frames[j].rms<threshold)quiet++;
   if(novelty>.18||quiet>=2)candidates.push({time:index,novelty:Number(novelty.toFixed(3)),quietSeconds:quiet,score:novelty+quiet*.08});
  }
  const selected=[];for(const candidate of candidates.sort((a,b)=>b.score-a.score)){if(selected.every(row=>Math.abs(row.time-candidate.time)>=15)){selected.push(candidate);if(selected.length===100)break;}}
  self.postMessage({duration:samples.length/rate,candidates:selected.sort((a,b)=>a.time-b.time).map(({score,...row})=>row)});
 }catch(error){self.postMessage({error:error.message||'Audio analysis failed.'});}
};
