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
  {id:'sound',label:'Music & sound',keys:['genre','key','rhythm','instrument','influences']},
  {id:'lyrics',label:'Language & lyrics',keys:['language','dialect','concept']},
  {id:'recording',label:'Recording details',keys:['artist']},
  {id:'content',label:'Content',keys:[]},
  {id:'credits',label:'Credits & sources',keys:['musician']},
  {id:'files',label:'Publishing & files',keys:['publicationStatus']},
];
export const MISSING_VALUE='Not specified';
export const FACETS=[
  {id:'genre',label:'Genre',values:r=>[...melodies(r).flatMap(m=>names(m.genres)),...names(r.recordingMetadata?.genres)]},
  {id:'language',label:'Language',values:r=>lyrics(r).flatMap(l=>[l.language?.name,...names(l.languages)])},
  {id:'dialect',label:'Dialect',values:r=>lyrics(r).map(l=>l.dialect?.name)},
  {id:'key',label:'Musical key',values:r=>[...melodies(r).map(m=>m.key),...(r.recordingMetadata?.keys||[]),r.recordingMetadata?.key]},
  {id:'rhythm',label:'Rhythm',values:r=>melodies(r).map(m=>m.rhythm?.name)},
  {id:'concept',label:'Concept',values:r=>lyrics(r).flatMap(l=>[l.conceptLabel,l.primaryConcept?.name,...names(l.concepts)])},
  {id:'instrument',label:'Instrument',values:r=>melodies(r).flatMap(m=>names(m.instruments))},
  {id:'artist',label:'Vocalist',values:r=>[r.artist,...creditNames(credits(r))]},
  {id:'musician',label:'Musician',values:r=>creditNames(melodies(r).flatMap(m=>m.musicianCredits||[]))},
  {id:'influences',label:'Musical influences',values:r=>melodies(r).flatMap(m=>m.influences||[])},
  {id:'publicationStatus',label:'Publication status',values:r=>[label(r.publicationStatus)]},
];
export const valuesOf=(facet,recording)=>[...new Set(facet.values(recording).filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='').map(v=>String(v).trim()))];
const filterValues=(facet,r)=>{const values=valuesOf(facet,r);return values.length?values:[MISSING_VALUE];};
// Keep all keys visible, including keys whose metadata has not been filled yet.
export function facetIndex(recordings,elements=[]){
  return FACETS.map(facet=>{
    const counts=new Map();
    for(const r of recordings)for(const value of filterValues(facet,r))counts.set(value,(counts.get(value)||0)+1);
    const catalog=elements.find(element=>element.id===facet.id)?.options||[];
    for(const option of catalog)if(!counts.has(option.value))counts.set(option.value,0);
    const labels=new Map(catalog.map(option=>[option.value,option.label||(option.languages?.length?`${option.value} · ${option.languages.map(language=>language.name).join(', ')}`:option.value)]));
    const values=[...counts].filter(([value])=>!facet.text||value===MISSING_VALUE||labels.has(value)).map(([value,count])=>({value,label:labels.get(value)||value,count}));
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
