import {cloudAsset} from '../lib/cloudAsset';

export const HERO_HEADPHONE_FRAMES=Array.from({length:8},(_,index)=>cloudAsset(`/echo/headphone-charcoal-v1/pose-${String(index).padStart(2,'0')}.webp`));
let preparation;
// Retain decoded Image objects as well as the browser's network cache.
const decodedImages=[],decodedReady=[];
export function prepareHeroHeadphoneFrames({retry=false}={}){
 if(typeof Image==='undefined')return Promise.resolve([]);
 if(retry)preparation=null;
 if(!preparation)preparation=Promise.all(HERO_HEADPHONE_FRAMES.map((src,index)=>new Promise(resolve=>{
  if(decodedReady[index])return resolve(true);
  const image=new Image();decodedImages[index]=image;
  image.decoding='async';image.fetchPriority='high';
  image.onload=()=>image.decode().then(()=>{decodedReady[index]=true;resolve(true);},()=>resolve(false));
  image.onerror=()=>resolve(false);image.src=src;
 })));
 return preparation;
}
