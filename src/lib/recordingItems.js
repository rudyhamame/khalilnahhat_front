const copy=value=>JSON.parse(JSON.stringify(value));
export const blankItemLyrics=()=>({languageId:null,dialectId:null,concept:'',sentenceConcept:'',text:'',startSec:null,endSec:null,timedLyrics:null,lyricistCredits:[],vocalistCredits:[]});
export const blankRecordingItem=(name='')=>({id:globalThis.crypto.randomUUID(),name,releaseYear:null,hasLyrics:false,lyrics:null,musicianCredits:[]});
const credits=rows=>(rows||[]).map(({artistId,detail})=>({artistId,detail:detail||''}));
export function editableRecordingItems(recording){
 if(Array.isArray(recording.items)&&recording.items.length)return copy(recording.items);
 const works=recording.componentWorks?.length?recording.componentWorks:recording.work?[recording.work]:[];
 if(!works.length)return [blankRecordingItem(recording.recordingAmount==='MULTIPLE'?'':recording.title||'')];
 return works.map(work=>({id:globalThis.crypto.randomUUID(),name:work.title,releaseYear:work.lyrics?.releaseYear??null,hasLyrics:work.type==='SONG',musicianCredits:credits(work.melody?.musicianCredits),lyrics:work.type==='SONG'?{...blankItemLyrics(),languageId:work.lyrics?.languageId||null,dialectId:work.lyrics?.dialectId||null,concept:work.lyrics?.conceptLabel||'',sentenceConcept:work.lyrics?.conceptSummary||'',text:work.lyrics?.text||'',lyricistCredits:credits(work.lyrics?.artistCredits?.filter(c=>c.role==='LYRICIST')),vocalistCredits:credits([...(work.lyrics?.artistCredits||[]),...(work.credits||[])].filter(c=>c.role==='VOCALIST')),timedLyrics:recording.lyricsTiming?.workId===work.id?{audioUrl:recording.lyricsTiming.audioUrl,model:recording.lyricsTiming.model,lines:copy(recording.lyricsTiming.lines)}:null}:null}));
}
export function validateRecordingItems(items,amount){
 if(!items?.length)throw Error('Add at least one recording item.');
 if(items.length>100)throw Error('A recording can contain at most 100 items.');
 if(amount==='INDIVIDUAL'&&items.length!==1)throw Error('Choose Multiple to keep more than one item.');
 for(const [index,item] of items.entries()){
  const label=`Item ${index+1}`;
  if(!item.name.trim())throw Error(`${label}: enter an item name.`);
  if(item.releaseYear!==null&&(!Number.isInteger(item.releaseYear)||item.releaseYear<1000||item.releaseYear>2100))throw Error(`${label}: enter a release year from 1000 to 2100.`);
  if(item.hasLyrics&&!item.lyrics)throw Error(`${label}: add lyric details.`);
  const l=item.hasLyrics?item.lyrics:null;
  if(l&&((l.startSec===null)!==(l.endSec===null)||l.startSec!==null&&l.endSec<=l.startSec))throw Error(`${label}: enter a valid start and end time.`);
  for(const credit of [...item.musicianCredits,...(l?.lyricistCredits||[]),...(l?.vocalistCredits||[])])if(!credit.artistId)throw Error(`${label}: choose a person for every credit.`);
  if(l?.timedLyrics?.lines.some((line,i,lines)=>!Number.isFinite(line.start)||!Number.isFinite(line.end)||line.end<=line.start||line.start<0||!line.text.trim()||i>0&&line.start<lines[i-1].start||l.startSec!==null&&(line.start<l.startSec||line.end>l.endSec)))throw Error(`${label}: check the timed lyric rows and item time range.`);
 }
}
export function transcriptForItem(result,audioUrl,range){
 const lines=(result.segments||[]).filter(line=>range.startSec===null||(line.start>=range.startSec&&line.end<=range.endSec));
 if(!lines.length)throw Error('No complete timed lyric lines were found in this item’s range. Adjust the range and try again.');
 return {audioUrl,model:'whisper-1',lines:copy(lines)};
}
export function clearItemTiming(items){return items.map(item=>({...item,lyrics:item.lyrics?{...item.lyrics,timedLyrics:null}:null}));}
