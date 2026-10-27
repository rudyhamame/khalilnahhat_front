import {apiRequest} from './api';

let cached,expires=0,pending;
// Older API deployments publish recordings in bootstrap before the album routes exist.
export function fetchMusicArchiveCatalog({refresh=false}={}) {
  if(!refresh&&cached&&Date.now()<expires)return Promise.resolve(cached);
  if(pending)return pending;
  pending=(async()=>{
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
    cached=result;expires=Date.now()+30000;return result;
  })().finally(()=>{pending=null;});
  return pending;
}
