import {uuid} from './uuid.js';
const copy=value=>JSON.parse(JSON.stringify(value));
export const blankItemLyrics=()=>({languageId:null,dialectId:null,startSec:null,endSec:null,vocalistCredits:[]});
export const blankRecordingItem=(name='')=>({id:uuid(),name,releaseYear:null,releaseDate:'',hasLyrics:false,lyrics:null,musicianCredits:[],sound:{key:null,rhythmId:null,keys:[],rhythmIds:[],genreIds:[],influences:[]}});
export function copyRecordingToAtom(item,recording){
 const languages=recording.languages||{},credits=recording.recordingCredits||{},musical=recording.musical||{};
 const languageIds=languages.languageIds||[],dialectIds=languages.dialectIds||[],vocalistCredits=credits.vocalists||[];
 const hasLyrics=Boolean(languageIds.length||dialectIds.length||vocalistCredits.length);
 const range=Number.isFinite(recording.durationSeconds)&&recording.durationSeconds>0?{startSec:0,endSec:recording.durationSeconds}:null;
 const bpms=musical.bpms??(musical.bpm?[musical.bpm]:[]),keys=musical.keys??(musical.key?[musical.key]:[]),rhythmIds=musical.rhythmIds??(musical.rhythmId?[musical.rhythmId]:[]);
 // Copy values rather than linking them; the atom's identity and release date stay its own.
 return {...item,name:recording.title||'',audioRange:range||undefined,hasLyrics,
  sound:copy({...blankRecordingItem().sound,...musical,bpms,keys,rhythmIds,bpm:bpms[0]??null,key:keys[0]||null,rhythmId:rhythmIds[0]||null}),
  musicianCredits:copy(credits.musicians||[]),
  lyrics:hasLyrics?{...blankItemLyrics(),...(range||{}),languageIds:copy(languageIds),languageId:languageIds[0]||null,dialectIds:copy(dialectIds),dialectId:dialectIds[0]||null,vocalistCredits:copy(vocalistCredits)}:null};
}
const credits=rows=>(rows||[]).map(({artistId,detail})=>({artistId,detail:detail||''}));
export function editableRecordingItems(recording){
 if(Array.isArray(recording.items)&&recording.items.length)return copy(recording.items);
 const works=recording.componentWorks?.length?recording.componentWorks:recording.work?[recording.work]:[];
 if(!works.length)return [];
 return works.map(work=>({id:uuid(),name:work.title,releaseYear:work.lyrics?.releaseYear??null,sound:{key:work.melody?.key||null,rhythmId:work.melody?.rhythm?.id||null,genreIds:work.melody?.genres?.map(row=>row.id)||[],influences:work.melody?.influences||[]},hasLyrics:work.type==='SONG',musicianCredits:credits(work.melody?.musicianCredits),lyrics:work.type==='SONG'?{...blankItemLyrics(),languageId:work.lyrics?.languageId||null,dialectId:work.lyrics?.dialectId||null,vocalistCredits:credits([...(work.lyrics?.artistCredits||[]),...(work.credits||[])].filter(c=>c.role==='VOCALIST'))}:null}));
}
export function validateRecordingItems(items,amount){
 if(!items?.length)throw Error('Add at least one atom on the Recording timeline.');
 if(items.length>100)throw Error('A recording can contain at most 100 items.');
 if(amount==='INDIVIDUAL'&&items.length!==1)throw Error('Choose Multiple to keep more than one item.');
 for(const [index,item] of items.entries()){
  const label=`Item ${index+1}`;
  if(!item.name.trim())throw Error(`${label}: enter an item name.`);
  if(item.releaseDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(item.releaseDate)||item.releaseDate<'1000-01-01'||item.releaseDate>'2100-12-31'||!Number.isFinite(Date.parse(item.releaseDate))||new Date(item.releaseDate).toISOString().slice(0,10)!==item.releaseDate))throw Error(`${label}: choose a valid release date.`);
  if(item.releaseYear!==null&&(!Number.isInteger(item.releaseYear)||item.releaseYear<1000||item.releaseYear>2100))throw Error(`${label}: enter a release year from 1000 to 2100.`);
  if(item.hasLyrics&&!item.lyrics)throw Error(`${label}: add vocal details.`);
  const range=item.audioRange;if(range&&(!Number.isFinite(range.startSec)||!Number.isFinite(range.endSec)||range.startSec<0||range.endSec<=range.startSec||range.endSec>86400))throw Error(`${label}: enter a valid atom audio range.`);
  const l=item.hasLyrics?item.lyrics:null;
  if(l&&((l.startSec===null)!==(l.endSec===null)||l.startSec!==null&&l.endSec<=l.startSec))throw Error(`${label}: enter a valid start and end time.`);
  for(const credit of [...item.musicianCredits,...(l?.vocalistCredits||[])])if(!credit.artistId)throw Error(`${label}: choose a person for every credit.`);
 }
}
export function clearItemTiming(items){return items.map(item=>({...item,audioRange:undefined,lyrics:item.lyrics?{...item.lyrics,startSec:null,endSec:null}:null}));}
