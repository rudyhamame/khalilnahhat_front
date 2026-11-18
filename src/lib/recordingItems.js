import {uuid} from './uuid.js';
const copy=value=>JSON.parse(JSON.stringify(value));
// Each language entry holds its own dialects; these read and build that shape from flat lists.
export const lyricLanguageIds=lyrics=>(lyrics?.languages||[]).map(row=>row.languageId);
export const lyricDialectIds=lyrics=>(lyrics?.languages||[]).flatMap(row=>row.dialectIds||[]);
export const toLyricLanguages=(languageIds,dialectIds,vocabulary=[])=>languageIds.map(languageId=>({languageId,dialectIds:dialectIds.filter(id=>((vocabulary.find(row=>row.id===id)?.parentId)||languageIds[0])===languageId)}));
export const blankItemLyrics=()=>({languages:[],vocalistCredits:[]});
export const blankRecordingItem=(name='')=>({id:uuid(),name,releaseYear:null,lyrics:null,sound:{musicianCredits:[],bpms:[],keys:[],rhythmIds:[],genreIds:[]}});
export function copyRecordingToAtom(item,recording){
 const languages=recording.languages||{},musical=recording.musical||{};
 const languageIds=languages.languageIds||[],dialectIds=languages.dialectIds||[];
 const withLyrics=Boolean(languageIds.length||dialectIds.length);
 const range=Number.isFinite(recording.durationSeconds)&&recording.durationSeconds>0?{startSec:0,endSec:recording.durationSeconds}:null;
 const bpms=musical.bpms||[],keys=musical.keys||[],rhythmIds=musical.rhythmIds||[];
 // Copy values rather than linking them; the atom's identity and release date stay its own.
 return {...item,name:recording.title||'',audioRange:range||undefined,
  sound:copy({...blankRecordingItem().sound,...musical,bpms,keys,rhythmIds}),
  lyrics:withLyrics?{...blankItemLyrics(),languages:toLyricLanguages(languageIds,dialectIds),vocalistCredits:[]}:null};
}
const credits=rows=>(rows||[]).map(({artistId})=>({artistId}));
export function editableRecordingItems(recording){
 if(Array.isArray(recording.items)&&recording.items.length)return copy(recording.items);
 const works=recording.componentWorks?.length?recording.componentWorks:recording.work?[recording.work]:[];
 if(!works.length)return [];
 return works.map(work=>({id:uuid(),name:work.title,releaseYear:work.lyrics?.releaseYear??null,sound:{musicianCredits:credits(work.melody?.musicianCredits),bpms:work.melody?.bpm?[work.melody.bpm]:[],keys:work.melody?.key?[work.melody.key]:[],rhythmIds:work.melody?.rhythm?.id?[work.melody.rhythm.id]:[],genreIds:work.melody?.genres?.map(row=>row.id)||[]},lyrics:work.type==='SONG'?{...blankItemLyrics(),languages:work.lyrics?.languageId?[{languageId:work.lyrics.languageId,dialectIds:work.lyrics.dialectId?[work.lyrics.dialectId]:[]}]:[],vocalistCredits:credits([...(work.lyrics?.artistCredits||[]),...(work.credits||[])].filter(c=>c.role==='VOCALIST'))}:null}));
}
export function validateRecordingItems(items){
 if(!items?.length)throw Error('Add at least one atom on the Recording timeline.');
 if(items.length>100)throw Error('A recording can contain at most 100 items.');
 for(const [index,item] of items.entries()){
  const label=`Item ${index+1}`;
  if(!item.name.trim())throw Error(`${label}: enter an item name.`);
  if(item.releaseYear!==null&&(!Number.isInteger(item.releaseYear)||item.releaseYear<1000||item.releaseYear>2100))throw Error(`${label}: enter a release year from 1000 to 2100.`);
  const range=item.audioRange;if(range&&(!Number.isFinite(range.startSec)||!Number.isFinite(range.endSec)||range.startSec<0||range.endSec<=range.startSec||range.endSec>86400))throw Error(`${label}: enter a valid atom audio range.`);
  const l=item.lyrics;
  for(const credit of [...(item.sound?.musicianCredits||[]),...(l?.vocalistCredits||[])])if(!credit.artistId)throw Error(`${label}: choose a person for every credit.`);
 }
}
export function clearItemTiming(items){return items.map(item=>({...item,audioRange:undefined,lyrics:item.lyrics}));}
