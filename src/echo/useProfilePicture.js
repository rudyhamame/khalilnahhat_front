import {useEffect,useState} from 'react';
import {apiRequest} from '../lib/api';

// The same profile picture the Instagram card shows (the connected Instagram account's photo), shared by the follow cards.
// Until it loads, or when Instagram has none, callers show the DJ Khalil logo, exactly like the Instagram card does.
export const PROFILE_FALLBACK='/echo/dj-khalil-nahhat-logo.svg';
export function useProfilePicture(){
 const [url,setUrl]=useState('');
 useEffect(()=>{
  let alive=true;
  apiRequest('/instagram/profile').then(({item})=>{if(alive&&item?.enabled!==false)setUrl(item?.profile?.pictureUrl||'');}).catch(()=>{});
  return()=>{alive=false;};
 },[]);
 return url;
}
