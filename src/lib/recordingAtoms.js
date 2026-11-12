export const atomRange=item=>{const range=item.audioRange||item.lyrics;return Number.isFinite(range?.startSec)&&Number.isFinite(range?.endSec)&&range.endSec>range.startSec?{startSec:range.startSec,endSec:range.endSec}:null;};
export function moveAtomBoundary(items,id,next,duration){
 const index=items.findIndex(item=>item.id===id);if(index<0)return items;
 const current=atomRange(items[index]);if(!current)return items;
 const previous=index>0?atomRange(items[index-1]):null,following=index+1<items.length?atomRange(items[index+1]):null;
 const sharedStart=previous&&Math.abs(previous.endSec-current.startSec)<.03,sharedEnd=following&&Math.abs(following.startSec-current.endSec)<.03;
 const start=Math.max(sharedStart?previous.startSec+.01:previous?.endSec||0,Math.min(next.start,current.endSec-.01));
 const end=Math.min(sharedEnd?following.endSec-.01:following?.startSec??duration,Math.max(next.end,start+.01));
 return items.map((item,at)=>{
  const range=at===index?{startSec:start,endSec:end}:at===index-1&&sharedStart?{...previous,endSec:start}:at===index+1&&sharedEnd?{...following,startSec:end}:null;
  if(!range)return item;
  return {...item,audioRange:range,lyrics:item.lyrics?{...item.lyrics,...range}:item.lyrics};
 });
}

// Slide a whole atom along the timeline, keeping its length and staying inside its neighbours.
export function moveAtomSegment(items,id,startSec,duration){
 const index=items.findIndex(item=>item.id===id);if(index<0)return items;
 const current=atomRange(items[index]);if(!current)return items;
 const length=current.endSec-current.startSec;
 const previous=index>0?atomRange(items[index-1]):null,following=index+1<items.length?atomRange(items[index+1]):null;
 const min=previous?.endSec??0,max=following?.startSec??duration;
 if(max-min<length-1e-6)return items;
 const start=Math.min(Math.max(startSec,min),max-length),range={startSec:start,endSec:start+length};
 return items.map((item,at)=>at===index?{...item,audioRange:range,lyrics:item.lyrics?{...item.lyrics,...range}:item.lyrics}:item);
}
