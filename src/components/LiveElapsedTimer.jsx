import {useEffect,useState} from 'react';

export default function LiveElapsedTimer({session}) {
 const [startedAt]=useState(()=>{
  const now=Date.now();
  try {
   const saved=JSON.parse(sessionStorage.getItem('echo-studio-live-clock')||'null');
   if(session&&saved?.session===session&&Number.isFinite(saved.startedAt)&&saved.startedAt<=now)return saved.startedAt;
   if(session)sessionStorage.setItem('echo-studio-live-clock',JSON.stringify({session,startedAt:now}));
  }catch{/* The clock still runs when browser storage is unavailable. */}
  return now;
 });
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const seconds=Math.max(0,Math.floor((now-startedAt)/1000));
 const elapsed=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(value=>String(value).padStart(2,'0')).join(':');
 return <time className="studio-live-elapsed" dateTime={`PT${seconds}S`} aria-label={`Live elapsed time ${elapsed}`} title="Elapsed time since this studio connected to the live session">{elapsed}</time>;
}

