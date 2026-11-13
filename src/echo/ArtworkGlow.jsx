import {useEffect,useRef,useState} from 'react';
import './artworkGlow.css';

// A relaxed ambient glow behind the page, coloured from the artwork of the song that is playing.
// The artwork is sampled on a tiny canvas; the most vivid, distinct hues become the glow's three blobs.
const FALLBACK=['#3a4f63','#5a3d63','#2f5a55'];
function palette(image){
  const size=24,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,size,size);
  const {data}=ctx.getImageData(0,0,size,size),buckets=new Map();
  for(let i=0;i<data.length;i+=4){
    const r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b),light=(max+min)/510,sat=max===min?0:(max-min)/(255-Math.abs(max+min-255));
    if(light<.12||light>.92)continue;
    const key=`${r>>5},${g>>5},${b>>5}`,bucket=buckets.get(key)||{r:0,g:0,b:0,n:0,score:0};
    bucket.r+=r;bucket.g+=g;bucket.b+=b;bucket.n++;bucket.score+=.4+sat;buckets.set(key,bucket);
  }
  const ranked=[...buckets.values()].map(b=>({r:b.r/b.n,g:b.g/b.n,b:b.b/b.n,score:b.score})).sort((a,b)=>b.score-a.score);
  const picked=[];
  for(const color of ranked){if(picked.every(other=>Math.hypot(other.r-color.r,other.g-color.g,other.b-color.b)>70))picked.push(color);if(picked.length===3)break;}
  while(picked.length&&picked.length<3)picked.push(picked[picked.length-1]);
  return picked.map(c=>`rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`);
}
export default function ArtworkGlow({url}){
  const [colors,setColors]=useState(null);
  useEffect(()=>{
    if(!url){setColors(null);return undefined;}
    let alive=true;const image=new Image();image.crossOrigin='anonymous';
    image.onload=()=>{if(!alive)return;try{const found=palette(image);setColors(found.length===3?found:FALLBACK);}catch{setColors(FALLBACK);}};
    image.onerror=()=>{if(alive)setColors(FALLBACK);};
    image.src=url;
    return()=>{alive=false;};
  },[url]);
  const node=useRef(null),[a,b,c]=colors||FALLBACK;
  // The palette is shared with the whole player (glass tint) through custom properties on the chapter.
  useEffect(()=>{const host=node.current?.parentElement;if(!host)return;host.style.setProperty('--glow-a',a);host.style.setProperty('--glow-b',b);host.style.setProperty('--glow-c',c);},[a,b,c]);
  return <div ref={node} className={`artwork-glow${colors?' is-on':''}`} aria-hidden="true"><i/><i/><i/></div>;
}
