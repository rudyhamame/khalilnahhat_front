// Filter keys for building a collection: each key reads values from a recording; a collection can use any mix of them.
const names=list=>(list||[]).map(item=>item?.name).filter(Boolean);
const works=r=>(r.componentWorks?.length?r.componentWorks:r.work?[r.work]:[]);
const seconds=r=>{
  if(Number.isFinite(r.audio?.durationSeconds))return r.audio.durationSeconds;
  const parts=String(r.duration||'').split(':').map(Number);
  return parts.length>=2&&parts.every(Number.isFinite)?parts.reduce((total,part)=>total*60+part,0):null;
};
const bpmBucket=value=>value==null||!Number.isFinite(Number(value))?null:Number(value)<80?'Under 80':Number(value)<100?'80–99':Number(value)<120?'100–119':Number(value)<140?'120–139':'140+';
const durationBucket=value=>value==null?null:value<180?'Under 3 min':value<240?'3–4 min':value<300?'4–5 min':'Over 5 min';
export const BPM_ORDER=['Under 80','80–99','100–119','120–139','140+'];
export const DURATION_ORDER=['Under 3 min','3–4 min','4–5 min','Over 5 min'];
export const FACETS=[
  {id:'genre',label:'Genre',values:r=>[...works(r).flatMap(w=>names(w.melody?.genres)),...names(r.recordingMetadata?.genres)]},
  {id:'bpm',label:'BPM',order:BPM_ORDER,values:r=>[...works(r).map(w=>w.melody?.bpm),...(r.recordingMetadata?.bpms||[])].map(bpmBucket)},
  {id:'duration',label:'Duration',order:DURATION_ORDER,values:r=>[durationBucket(seconds(r))]},
  {id:'rhythm',label:'Rhythm',values:r=>works(r).map(w=>w.melody?.rhythm?.name)},
  {id:'language',label:'Language',values:r=>works(r).map(w=>w.lyrics?.language?.name)},
  {id:'dialect',label:'Dialect',values:r=>works(r).map(w=>w.lyrics?.dialect?.name)},
  {id:'key',label:'Musical key',values:r=>[...works(r).map(w=>w.melody?.key),...(r.recordingMetadata?.keys||[])]},
  {id:'region',label:'Region',values:r=>works(r).flatMap(w=>names(w.lyrics?.regions))},
  {id:'concept',label:'Concept',values:r=>works(r).flatMap(w=>[w.lyrics?.primaryConcept?.name,...names(w.lyrics?.concepts)])},
  {id:'instrument',label:'Instrument',values:r=>works(r).flatMap(w=>names(w.melody?.instruments))},
  {id:'type',label:'Recording type',values:r=>[String(r.recordingType||'').replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase())]},
  {id:'artist',label:'Artist',values:r=>[r.artist]},
];
export const valuesOf=(facet,recording)=>[...new Set(facet.values(recording).filter(Boolean).map(String))];
// Facets that exist in these recordings, each with its values and how many recordings carry them.
export function facetIndex(recordings){
  return FACETS.map(facet=>{
    const counts=new Map();
    for(const r of recordings)for(const value of valuesOf(facet,r))counts.set(value,(counts.get(value)||0)+1);
    const values=[...counts].map(([value,count])=>({value,count}));
    values.sort(facet.order?(a,b)=>facet.order.indexOf(a.value)-facet.order.indexOf(b.value):(a,b)=>b.count-a.count||a.value.localeCompare(b.value));
    return {id:facet.id,label:facet.label,values};
  }).filter(facet=>facet.values.length);
}
// selection: {facetId: [values]}. A recording passes when, for every key with chosen values, it has at least one of them.
export function matchesSelection(recording,selection){
  return FACETS.every(facet=>{const chosen=selection[facet.id];return !chosen?.length||valuesOf(facet,recording).some(value=>chosen.includes(value));});
}
