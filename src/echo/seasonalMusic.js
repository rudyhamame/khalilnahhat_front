import {useEffect,useState} from 'react';
import {fetchMusicArchiveCatalog} from '../lib/musicArchiveCatalog';
export const DEFAULT_SEASONAL_AUDIO={enabled:false,archiveIds:[]};
export function useSeasonalRecordings(audio=DEFAULT_SEASONAL_AUDIO){
 const key=audio.archiveIds?.join('|')||'',enabled=audio.enabled;
 const [result,setResult]=useState({tracks:[],error:''});
 useEffect(()=>{let alive=true;setResult({tracks:[],error:''});if(enabled&&key)fetchMusicArchiveCatalog().then(({songs})=>{if(alive){const byId=new Map(songs.filter(song=>song.audioUrl&&song.published!==false).map(song=>[song.id,song]));setResult({tracks:key.split('|').map(id=>byId.get(id)).filter(Boolean),error:''});}}).catch(()=>{if(alive)setResult({tracks:[],error:'Christmas audio is temporarily unavailable.'});});return()=>{alive=false;};},[key,enabled]);
 return result;
}
