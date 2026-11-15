import {useEffect,useState} from 'react';
import {PROFILE_FALLBACK,useProfilePicture} from './useProfilePicture';

// Profile picture on the follow cards: the Instagram card's picture (logo fallback) with the platform's mark as a small badge.
export default function FollowAvatar({badge}){
 const picture=useProfilePicture(),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[picture]);
 return <span className="yt-avatar">
  <span className="yt-avatar-photo">{picture&&!failed?<img src={picture} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<span className="yt-avatar-logo"><img src={PROFILE_FALLBACK} alt=""/></span>}</span>
  <span className="yt-avatar-badge" aria-hidden="true">{badge}</span>
 </span>;
}
