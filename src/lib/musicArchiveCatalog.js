import {validateRecording} from './musicOntology';
import {apiRequest} from './api';

let cached,expires=0,pending,generation=0;
// Older API deployments publish recordings in bootstrap before the album routes exist.
export function fetchMusicArchiveCatalog({refresh=false}={}) {
  if(!refresh&&cached&&Date.now()<expires)return Promise.resolve(cached);
  if(pending&&!refresh)return pending;
  if(refresh)generation++;
  const epoch=generation;
  const task=(async()=>{
    let result;
    try{result=await apiRequest('/music-archive');}
    catch(error){
      if(error.status!==404)throw error;
      const bootstrap=await apiRequest('/bootstrap');
      const content=bootstrap.content||bootstrap;
      if(!Array.isArray(content.archiveItems))throw new Error('The music archive could not be loaded.');
      result={categories:[],albums:[],songs:content.archiveItems.filter(item=>item.published!==false&&item.audioUrl).map(item=>({...item,coverImage:item.coverImage||item.image||''}))};
    }
    if(!Array.isArray(result.songs)||!Array.isArray(result.albums)||!Array.isArray(result.categories))throw new Error('The music archive is unavailable.');
    if(result.ontologyVersion){if(!Array.isArray(result.recordings))throw new Error('Invalid canonical archive response.');result.recordings.forEach(validateRecording);result.songs.forEach(validateRecording);}
    if(epoch===generation){cached=result;expires=Date.now()+30000;}return result;
  })();
  const current=task.finally(()=>{if(pending===current)pending=null;});
  pending=current;return current;
}

if(typeof window!=='undefined')window.addEventListener('echo:music-archive-changed',()=>{cached=undefined;expires=0;generation++;pending=null;});

// Playback needs only authorized recording identities and audio, not work metadata.
export async function fetchArchivePlaybackCatalog({refresh=false}={}){
  if(!refresh&&cached&&Date.now()<expires)return {songs:cached.songs};
  try{
    const data=await apiRequest('/music-archive/playback');
    if(!Array.isArray(data.songs)||data.songs.some(row=>typeof row.id!=='string'||typeof row.audioUrl!=='string'))throw new Error('Invalid archive playback response.');
    return data;
  }catch(error){if(error.status!==404)throw error;return fetchMusicArchiveCatalog({refresh});}
}
