import {useCallback,useEffect,useState} from 'react';
import {apiRequest} from './api';

// The DJ service form offers what the admin keeps in Work Elements: genres, languages, dialects (each tied to its languages) and musical influences.
let cached=null;
const names=rows=>[...new Set((rows||[]).map(row=>String(row.name||row.value||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
export function loadWorkVocabulary(force=false){
 if(!cached||force)cached=Promise.all([
  apiRequest('/music-ontology/vocabulary?kind=genre'),
  apiRequest('/music-ontology/vocabulary?kind=language'),
  apiRequest('/music-ontology/vocabulary?kind=dialect'),
  apiRequest('/music-ontology/influences'),
  apiRequest('/music-ontology/preset/moments').catch(()=>({items:[]})),
  // Suggestions for the favourites inputs; the form works without them.
  apiRequest('/music-ontology/vocabulary?kind=artist').catch(()=>({items:[]})),
 ]).then(([genres,languages,dialects,influences,moments,artists])=>({
  moments:(moments.items||[]).map(row=>String(row.value||'').trim()).filter(Boolean), // in the order the admin keeps them
  artists:names(artists.items),
  genres:names(genres.items),
  languages:(languages.items||[]).map(row=>({id:row.id,name:String(row.name||'').trim()})).filter(row=>row.name).sort((a,b)=>a.name.localeCompare(b.name)),
  dialects:(dialects.items||[]).map(row=>({id:row.id,name:String(row.name||'').trim(),languageIds:[...(row.languageIds||[]),row.parentId].filter(Boolean)})).filter(row=>row.name).sort((a,b)=>a.name.localeCompare(b.name)),
  influences:names(influences.items),
 })).catch(error=>{cached=null;throw error;});
 return cached;
}
export function useWorkVocabulary(){
 const [state,setState]=useState({loading:true,error:'',data:null});
 const load=useCallback((force=false)=>{setState(current=>({...current,loading:true,error:''}));loadWorkVocabulary(force).then(data=>setState({loading:false,error:'',data})).catch(error=>setState({loading:false,error:error.message||'The lists could not be loaded.',data:null}));},[]);
 useEffect(()=>{load();},[load]);
 return {...state,retry:()=>load(true)};
}
