import {blankRecordingItem,blankItemLyrics} from './recordingItems';
export const atomRange=item=>{const range=item.audioRange||item.lyrics;return Number.isFinite(range?.startSec)&&Number.isFinite(range?.endSec)&&range.endSec>range.startSec?{startSec:range.startSec,endSec:range.endSec}:null;};
export function createDetectedAtoms(detection,timing,previous,withLyrics){
 return detection.atoms.map((atom,index)=>{
  const base=index===0&&previous.length===1?previous[0]:blankRecordingItem();
  const lines=(timing?.lines||[]).filter(line=>line.start>=atom.start&&line.end<=atom.end),hasLyrics=lines.length>0||(withLyrics&&detection.atoms.length===1);
  const range={startSec:atom.start,endSec:atom.end};
  return {...base,name:detection.atoms.length===1?(base.name||atom.title):atom.title,audioRange:range,hasLyrics,lyrics:hasLyrics?{...(base.lyrics||blankItemLyrics()),...range,text:lines.map(line=>line.text).join('\n')||(detection.atoms.length===1?base.lyrics?.text||'':''),timedLyrics:lines.length?{...timing,lines}:null}:null};
 });
}
export function moveAtomBoundary(items,id,next,duration,timing){
 const index=items.findIndex(item=>item.id===id);if(index<0)return items;
 const current=atomRange(items[index]);if(!current)return items;
 const previous=index>0?atomRange(items[index-1]):null,following=index+1<items.length?atomRange(items[index+1]):null;
 const sharedStart=previous&&Math.abs(previous.endSec-current.startSec)<.03,sharedEnd=following&&Math.abs(following.startSec-current.endSec)<.03;
 const start=Math.max(sharedStart?previous.startSec+.01:previous?.endSec||0,Math.min(next.start,current.endSec-.01));
 const end=Math.min(sharedEnd?following.endSec-.01:following?.startSec??duration,Math.max(next.end,start+.01));
 return items.map((item,at)=>{
  const range=at===index?{startSec:start,endSec:end}:at===index-1&&sharedStart?{...previous,endSec:start}:at===index+1&&sharedEnd?{...following,startSec:end}:null;
  if(!range)return item;
  const source=timing||item.lyrics?.timedLyrics;
  const lines=(source?.lines||[]).filter(line=>(line.start+line.end)/2>=range.startSec&&(line.start+line.end)/2<range.endSec).map(line=>({...line,start:Math.max(line.start,range.startSec),end:Math.min(line.end,range.endSec)}));
  const hasLyrics=item.hasLyrics||lines.length>0;
  return {...item,audioRange:range,hasLyrics,lyrics:hasLyrics?{...(item.lyrics||blankItemLyrics()),...range,...(source?{timedLyrics:lines.length?{...source,lines}:null,text:lines.map(line=>line.text).join('\n')}:{})}:null};
 });
}
