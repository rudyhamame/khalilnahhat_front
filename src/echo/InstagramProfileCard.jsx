import {useEffect,useState} from 'react';
import {Instagram,MoreHorizontal,ExternalLink} from 'lucide-react';
import {apiRequest} from '../lib/api';
import './instagramProfile.css';

const fallbackUsername='khalil_nahhat';
export default function InstagramProfileCard({ar=false,item:provided}){
 const [loaded,setLoaded]=useState(null),[imageFailed,setImageFailed]=useState(false);
 useEffect(()=>{
  if(provided!==undefined)return;
  let alive=true;
  const load=()=>apiRequest('/instagram/profile').then(({item})=>{if(alive)setLoaded(item);}).catch(()=>{});
  load();const timer=setInterval(load,15*60*1000);
  return()=>{alive=false;clearInterval(timer);};
 },[provided]);
 const item=provided===undefined?loaded:provided,profile=item?.profile;
 useEffect(()=>setImageFailed(false),[profile?.pictureUrl]);
 if(item?.enabled===false)return null;
 const username=profile?.username||fallbackUsername,url=`https://www.instagram.com/${encodeURIComponent(username)}/`;
 const tr=(en,arabic)=>ar?arabic:en;
 const number=value=>Number.isSafeInteger(value)?new Intl.NumberFormat(ar?'ar':'en',{notation:'compact',maximumFractionDigits:1}).format(value):'—';
 const statistics=[['posts',tr('Posts','المنشورات')],['followers',tr('Followers','المتابعون')],['following',tr('Following','يتابع')]];
 return <article className="instagram-profile-card" dir={ar?'rtl':'ltr'} aria-label={tr('DJ Khalil on Instagram','دي جي خليل على إنستغرام')}>
  <header className="ig-card-header"><Instagram size={17} aria-hidden="true"/><a href={url} target="_blank" rel="noopener noreferrer" dir="ltr">{username}</a><a className="ig-card-more" href={url} target="_blank" rel="noopener noreferrer" aria-label={tr('Open Instagram profile','افتح ملف إنستغرام')}><MoreHorizontal size={19}/></a></header>
  <div className="ig-card-overview">
   <a className="ig-card-avatar" href={url} target="_blank" rel="noopener noreferrer" aria-label={tr('View Instagram profile','عرض ملف إنستغرام')}>
    {profile?.pictureUrl&&!imageFailed?<img src={profile.pictureUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setImageFailed(true)}/>:<span><img src="/echo/dj-khalil-nahhat-logo.svg" alt=""/></span>}
   </a>
   <dl className="ig-card-stats">{statistics.map(([key,label])=><div key={key}><dt>{label}</dt><dd title={Number.isSafeInteger(profile?.[key])?profile[key].toLocaleString(ar?'ar':'en'):undefined}>{number(profile?.[key])}</dd></div>)}</dl>
  </div>
  <div className="ig-card-bio"><strong>{profile?.name||'DJ Khalil Nahhat'}</strong><p>{item?.caption||tr('Arabic & multicultural celebrations.\nToronto & the Greater Toronto Area.','احتفالات عربية ومتعددة الثقافات.\nتورونتو ومنطقتها الكبرى.')}</p>{item?.website&&<a href={item.website} target="_blank" rel="noopener noreferrer">{item.website.replace(/^https:\/\//,'').replace(/\/$/,'')}</a>}</div>
  <div className="ig-card-actions"><a className="ig-card-follow" href={url} target="_blank" rel="noopener noreferrer">{tr('Follow','متابعة')}</a><a className="ig-card-message" href={`https://ig.me/m/${encodeURIComponent(username)}`} target="_blank" rel="noopener noreferrer">{tr('Message','رسالة')}</a><a className="ig-card-open" href={url} target="_blank" rel="noopener noreferrer" aria-label={tr('View on Instagram','عرض على إنستغرام')}><ExternalLink size={16}/></a></div>
  {item?.syncedAt&&<small className="ig-card-updated">{item.stale?tr('Last synced','آخر مزامنة'):tr('Updated','تم التحديث')} {new Date(item.syncedAt).toLocaleString(ar?'ar':'en-CA',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</small>}
 </article>;
}
