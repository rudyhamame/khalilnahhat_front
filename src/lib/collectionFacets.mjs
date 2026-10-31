// Collection filters read the same recording/content metadata as the recording editor.
const names=list=>(list||[]).map(item=>typeof item==='string'?item:item?.name).filter(Boolean);
const works=r=>(r.componentWorks?.length?r.componentWorks:r.work?[r.work]:[]);
const melodies=r=>works(r).map(w=>w.melody).filter(Boolean);
const lyrics=r=>works(r).map(w=>w.lyrics).filter(Boolean);
const credits=r=>[...(r.credits||[]),...works(r).flatMap(w=>w.credits||[]),...melodies(r).flatMap(m=>m.musicianCredits||[]),...lyrics(r).flatMap(l=>l.artistCredits||[])];
const creditNames=list=>list.map(c=>c.artist?.name||c.artistId).filter(Boolean);
const label=value=>String(value||'').replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase());
const seconds=r=>{
  if(Number.isFinite(r.audio?.durationSeconds))return r.audio.durationSeconds;
  if(Number.isFinite(r.durationSeconds))return r.durationSeconds;
  const parts=String(r.duration||'').split(':').map(Number);
  return parts.length>=2&&parts.every(Number.isFinite)?parts.reduce((total,part)=>total*60+part,0):null;
};
const bpms=r=>[...melodies(r).map(m=>m.bpm),...(r.recordingMetadata?.bpms||[]),r.recordingMetadata?.bpm];
const bpmBucket=value=>value==null||value===''||!Number.isFinite(Number(value))?null:Number(value)<80?'Under 80':Number(value)<100?'80–99':Number(value)<120?'100–119':Number(value)<140?'120–139':'140+';
const durationBucket=value=>value==null?null:value<180?'Under 3 min':value<240?'3–4 min':value<300?'4–5 min':'Over 5 min';
export const BPM_ORDER=['Under 80','80–99','100–119','120–139','140+'];
export const DURATION_ORDER=['Under 3 min','3–4 min','4–5 min','Over 5 min'];
export const FILTER_SECTIONS=[
  {id:'sound',label:'Music & sound',keys:['genre','bpm','key','rhythm','duration','instrument','timeSignature','mode','influences']},
  {id:'lyrics',label:'Language & lyrics',keys:['language','dialect','region','concept','releaseYear','script','lyricsCompleteness','lyricsText','conceptSummary','lyricsNotes','translationRefs']},
  {id:'recording',label:'Recording details',keys:['type','recordingAmount','artist','description','releaseDate']},
  {id:'content',label:'Content',keys:['workType','workKind']},
  {id:'credits',label:'Credits & sources',keys:['musician','creditDetail','sourceRecordings','sourceWorks']},
  {id:'files',label:'Publishing & files',keys:['publicationStatus']},
];
export const MISSING_VALUE='Not specified';
export const FACETS=[
  {id:'genre',label:'Genre',values:r=>[...melodies(r).flatMap(m=>names(m.genres)),...names(r.recordingMetadata?.genres)]},
  {id:'bpm',label:'BPM',order:BPM_ORDER,numbers:bpms,values:r=>bpms(r).map(bpmBucket)},
  {id:'language',label:'Language',values:r=>lyrics(r).flatMap(l=>[l.language?.name,...names(l.languages)])},
  {id:'dialect',label:'Dialect',values:r=>lyrics(r).map(l=>l.dialect?.name)},
  {id:'key',label:'Musical key',values:r=>[...melodies(r).map(m=>m.key),...(r.recordingMetadata?.keys||[]),r.recordingMetadata?.key]},
  {id:'rhythm',label:'Rhythm',values:r=>melodies(r).map(m=>m.rhythm?.name)},
  {id:'duration',label:'Duration',unit:'seconds',order:DURATION_ORDER,numbers:r=>[seconds(r)],values:r=>[durationBucket(seconds(r))]},
  {id:'region',label:'Region',values:r=>lyrics(r).flatMap(l=>names(l.regions))},
  {id:'concept',label:'Concept',values:r=>lyrics(r).flatMap(l=>[l.conceptLabel,l.primaryConcept?.name,...names(l.concepts)])},
  {id:'instrument',label:'Instrument',values:r=>melodies(r).flatMap(m=>names(m.instruments))},
  {id:'type',label:'DJ work type',values:r=>[r.recordingTypeDefinition?.name||label(r.recordingType)]},
  {id:'recordingAmount',label:'Recording content',values:r=>[label(r.recordingAmount||r.recordingTypeDefinition?.amount)]},
  {id:'artist',label:'Artist',values:r=>[r.artist,...creditNames(credits(r))]},
  {id:'musician',label:'Musician',values:r=>creditNames(melodies(r).flatMap(m=>m.musicianCredits||[]))},
  {id:'creditDetail',label:'Credit details',text:true,values:r=>credits(r).map(c=>c.detail)},
  {id:'description',label:'Recording description',text:true,values:r=>[r.description]},
  {id:'workType',label:'Music type',values:r=>works(r).map(w=>w.type==='SONG'?'Lyrical Music':w.type==='MUSIC'?'Instrumental Music':label(w.type))},
  {id:'workKind',label:'Content work type',values:r=>works(r).map(w=>w.workKindDefinition?.name||label(w.workKind||'ORIGINAL'))},
  {id:'releaseDate',label:'Recording release date',values:r=>[r.releaseDate||r.date]},
  {id:'releaseYear',label:'Lyrics release year',numbers:r=>lyrics(r).map(l=>l.releaseYear),values:r=>lyrics(r).map(l=>l.releaseYear)},
  {id:'timeSignature',label:'Time signature',values:r=>melodies(r).map(m=>m.timeSignature)},
  {id:'mode',label:'Musical mode',values:r=>melodies(r).map(m=>m.mode)},
  {id:'influences',label:'Musical influences',values:r=>melodies(r).flatMap(m=>m.influences||[])},
  {id:'lyricsText',label:'Lyrics text',text:true,values:r=>lyrics(r).map(l=>l.text)},
  {id:'conceptSummary',label:'Concept summary',text:true,values:r=>lyrics(r).map(l=>l.conceptSummary)},
  {id:'script',label:'Lyrics script',values:r=>lyrics(r).map(l=>l.script)},
  {id:'lyricsCompleteness',label:'Lyrics completeness',values:r=>lyrics(r).map(l=>label(l.completeness))},
  {id:'lyricsNotes',label:'Lyrics notes',text:true,values:r=>lyrics(r).map(l=>l.notes)},
  {id:'translationRefs',label:'Translation references',text:true,values:r=>lyrics(r).flatMap(l=>l.translationRefs||[])},
  {id:'publicationStatus',label:'Publication status',values:r=>[label(r.publicationStatus)]},
  {id:'sourceRecordings',label:'Source recording',values:r=>r.sourceRecordingIds||[]},
  {id:'sourceWorks',label:'Source content',values:r=>r.sourceWorkIds||[]},
];
export const valuesOf=(facet,recording)=>[...new Set(facet.values(recording).filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='').map(v=>String(v).trim()))];
const filterValues=(facet,r)=>{const values=valuesOf(facet,r);return values.length?values:[MISSING_VALUE];};
// Keep all keys visible, including keys whose metadata has not been filled yet.
export function facetIndex(recordings){
  return FACETS.map(facet=>{
    const counts=new Map();
    for(const r of recordings)for(const value of filterValues(facet,r))counts.set(value,(counts.get(value)||0)+1);
    const values=[...counts].map(([value,count])=>({value,count}));
    values.sort((a,b)=>a.value===MISSING_VALUE?1:b.value===MISSING_VALUE?-1:facet.order?facet.order.indexOf(a.value)-facet.order.indexOf(b.value):b.count-a.count||a.value.localeCompare(b.value));
    return {...facet,values};
  });
}
// Keys combine with AND; selected values within a key combine with OR.
// Typed text and numeric bounds can be filled even when no options exist yet.
export function matchesSelection(recording,selection,criteria={}){
  return FACETS.every(facet=>{
    const chosen=selection[facet.id],rule=criteria[facet.id]||{};
    if(chosen?.length&&!filterValues(facet,recording).some(value=>chosen.includes(value)))return false;
    if(rule.query?.trim()&&!valuesOf(facet,recording).some(value=>value.toLocaleLowerCase().includes(rule.query.trim().toLocaleLowerCase())))return false;
    if(facet.numbers&&(rule.min!==undefined&&rule.min!==''||rule.max!==undefined&&rule.max!=='')){
      const numbers=facet.numbers(recording).filter(v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))).map(Number);
      return numbers.some(value=>(rule.min===undefined||rule.min===''||value>=Number(rule.min))&&(rule.max===undefined||rule.max===''||value<=Number(rule.max)));
    }
    return true;
  });
}
