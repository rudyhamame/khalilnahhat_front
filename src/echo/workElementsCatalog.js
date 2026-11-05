export const workElementsEndpoint='/admin/music-ontology/work-elements';
export const workElementsChanged='echo:work-elements-changed';
const storageKey='echo:work-elements-revision';
const hidden=new Set(['timeSignature','workKind','type','region','concept','publicationStatus','translationRefs','releaseYear','sourceRecordings','sourceWorks','lyricsCompleteness','lyricsText','conceptSummary','workType','releaseDate','mode','lyricsNotes','script','bpm','duration','recordingAmount']);
export const elementTitles={genre:'Genres',language:'Languages',dialect:'Dialects',key:'Musical keys',rhythm:'Rhythms',instrument:'Instruments',artist:'Vocalists',lyricist:'Lyricists',musician:'Musicians',influences:'Musical influences'};
export const keyLetters=['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'];
export const keyModes=['major','minor','dorian','phrygian','lydian','mixolydian','locrian','harmonic minor','melodic minor'];
export const peopleIds=['artist','musician','lyricist'];
export const hasLanguageDependency=element=>!['key','rhythm'].includes(element.id)&&!['instrument','language','musician'].includes(element.kind);
export const hasElementDependencies=element=>element.kind==='musician'||hasLanguageDependency(element);
export function visibleElements(rows){
 const catalog=rows.some(row=>row.id==='lyricist')?rows:[...rows,{id:'lyricist',label:'Lyricist',source:'vocabulary',kind:'lyricist',editable:true,options:[],pendingDeployment:true}];
 return catalog.filter(row=>!hidden.has(row.id)).map(row=>({...row,options:row.options||[],...(row.id==='artist'?{label:'Vocalist'}:{})}));
}
export function elementGroups(elements,query=''){
 const matches=elements.filter(row=>(elementTitles[row.id]||row.label).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const people=matches.filter(row=>peopleIds.includes(row.id)).sort((a,b)=>peopleIds.indexOf(a.id)-peopleIds.indexOf(b.id));
 return [
  {id:'independent',title:'Independent elements',cards:matches.filter(row=>!hasElementDependencies(row))},
  {id:'dependent',title:'Dependent elements',groups:[
   {id:'people',title:'Vocalists, Musicians & Lyricists',cards:people},
   {id:'other-dependent',title:'Other dependent elements',cards:matches.filter(row=>!peopleIds.includes(row.id)&&hasElementDependencies(row))},
  ].filter(group=>group.cards.length)},
 ].filter(section=>section.cards?.length||section.groups?.length);
}
export function notifyWorkElementsChanged(){
 window.dispatchEvent(new Event(workElementsChanged));
 try{localStorage.setItem(storageKey,`${Date.now()}:${Math.random()}`);}catch{/* Storage may be disabled. */}
}
export function subscribeWorkElementsChanged(refresh){
 const onStorage=event=>{if(event.key===storageKey)refresh();};
 window.addEventListener(workElementsChanged,refresh);window.addEventListener('storage',onStorage);
 return ()=>{window.removeEventListener(workElementsChanged,refresh);window.removeEventListener('storage',onStorage);};
}
