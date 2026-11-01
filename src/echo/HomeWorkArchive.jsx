import {useEffect,useState} from 'react';
import HomeWork from './HomeWork';
import HomeMusicArchive from './HomeMusicArchive';
import './workArchive.css';

// One chapter, two faces: DJ Khalil's work (front) and the Music Archive (back). A work card flips to the archive filtered to that type.
export default function HomeWorkArchive({lang}){
  const ar=lang.lang==='ar',[archive,setArchive]=useState(()=>window.location.hash==='#home-music-archive'),[workFilter,setWorkFilter]=useState(null);
  const openArchive=type=>{setWorkFilter({type:type||'',nonce:Date.now()});setArchive(true);};
  useEffect(()=>{
    const hash=()=>{if(window.location.hash==='#home-music-archive')setArchive(true);};
    const face=event=>setArchive(event.detail==='music');
    // Playing from the archive's own events (headphones sequence, scripted navigation) always shows the archive face.
    const show=event=>{if(event.detail?.active!==false)setArchive(true);};
    window.addEventListener('hashchange',hash);window.addEventListener('echo:work-archive-face',face);window.addEventListener('echo:archive-stage',show);window.addEventListener('echo:performer-prepare',show);
    return()=>{window.removeEventListener('hashchange',hash);window.removeEventListener('echo:work-archive-face',face);window.removeEventListener('echo:archive-stage',show);window.removeEventListener('echo:performer-prepare',show);};
  },[]);
  return <section id="khalil-work-archive" className="echo-section work-archive" dir={ar?'rtl':'ltr'}>
    <div className={`work-archive-flip${archive?' is-flipped':''}`}><div className="work-archive-flip-inner">
      <div className="work-archive-face work-archive-front" inert={archive} aria-hidden={archive||undefined}><HomeWork lang={lang} embedded onOpenWork={openArchive}/></div>
      <div className="work-archive-face work-archive-back" inert={!archive} aria-hidden={!archive||undefined}><HomeMusicArchive lang={lang} embedded workFilter={workFilter} onBack={()=>setArchive(false)}/></div>
    </div></div>
  </section>;
}
