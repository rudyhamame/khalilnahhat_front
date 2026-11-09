import {cloudAsset} from '../lib/cloudAsset';
import {useEffect, useRef, useState} from 'react';
import {preparePreflightContent} from '../lib/preflightContent';
import {finishPreflight} from '../lib/preflightReadiness';
import {enterAfterPreflight} from '../lib/preflightEntry';
import {hasCompletedPreflight,rememberPreflightCompletion} from '../lib/preflightVisit';
import './appPreflight.css';
import PreflightPhotoWall, {PREFLIGHT_ATLAS} from './PreflightPhotoWall';

const INTRO='https://res.cloudinary.com/nqiooluk/video/upload/v1793064145/khalil/site-assets/07d780a30c73/echo/welcome-stinger.wav';
const LOGO='https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg';
function initialArtwork(){
  const assets=[LOGO,PREFLIGHT_ATLAS];
  if(location.pathname==='/') {
    for(let i=0;i<8;i++) assets.push(cloudAsset(`/echo/headphone-motion-clean-v2/pose-${String(i).padStart(2,'0')}.webp`));
    for(const i of [0,1,2,3,6,8,9,10,12,13]) assets.push(cloudAsset(`/echo/song-test-performance-v1/pose-${String(i).padStart(2,'0')}.webp`));
  }
  return assets;
}

export default function AppPreflight({children}) {
  const [returning]=useState(hasCompletedPreflight);
  const [stage,setStage]=useState('loading');
  const [phase,setPhase]=useState('session');
  const [progress,setProgress]=useState(0);
  const [done,setDone]=useState(returning);
  const [overlay,setOverlay]=useState(!returning);
  const content=useRef(null), sound=useRef(null);
  const entered=useRef(false);
  const ar=document.documentElement.lang==='ar';
  useEffect(()=>{
    if(returning){finishPreflight();return;}
    const controller=new AbortController();
    const oldOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const timeout=setTimeout(()=>{
      setStage('error');
      controller.abort();
    },90000);
    preparePreflightContent(content.current, {
      signal:controller.signal,
      assets:initialArtwork(),
      onProgress:(value,nextPhase)=>{
        if(controller.signal.aborted)return;
        setProgress(current=>Math.max(current, value));
        setPhase(nextPhase);
      },
    }).then(()=>{
      if(!controller.signal.aborted)setStage('ready');
    }).catch(()=>{
      if(!controller.signal.aborted){setStage('error');controller.abort();}
    }).finally(()=>clearTimeout(timeout));
    return()=>{
      clearTimeout(timeout);
      controller.abort();
      document.body.style.overflow=oldOverflow;
    };
  },[returning]);
  useEffect(()=>{
    if(stage!=='ready'||entered.current)return;
    entered.current=true;
    finishPreflight();
    rememberPreflightCompletion();
    const reveal=()=>{
      setStage('entered');setDone(true);document.body.style.overflow='';
      requestAnimationFrame(()=>document.querySelector('#echo-main')?.focus({preventScroll:true}));
    };
    enterAfterPreflight(sound.current,reveal);
  },[stage]);
  useEffect(()=>{
    if(!done||returning)return;
    const timer=setTimeout(()=>setOverlay(false),1400);
    return()=>clearTimeout(timer);
  },[done,returning]);
  const status=stage==='error'
    ? (ar?'تعذّر إكمال التحميل. تحقق من اتصالك وحاول مجدداً.':'Content could not finish loading. Check your connection and try again.')
    : phase==='session'
      ? (ar?'جارٍ تحميل الصفحة والحساب…':'Loading your page and account…')
      : phase==='content'
        ? (ar?'جارٍ تجهيز أقسام الصفحة…':'Preparing page sections…')
      : phase==='artwork'
        ? (ar?'جارٍ تجهيز الصور والمحتوى…':'Preparing page images and content…')
        : (ar?'جارٍ إنهاء تجهيز الصفحة…':'Finishing page preparation…');
  return <>
    <div ref={content} className={`preflight-app-content${done?' is-revealed':''}`} inert={!done} aria-hidden={!done} style={!done?{visibility:'hidden'}:undefined}>{children}</div>
    {!returning&&<audio ref={sound} src={INTRO} preload="auto" />}
    {overlay&&<div className={`echo-preflight is-${stage}`} aria-hidden={done} role={done?undefined:'dialog'} aria-modal={done?undefined:true} aria-labelledby="preflight-title" inert={done}>
      <PreflightPhotoWall audio={sound} />
      <div className="preflight-inner preflight-minimal">
        <img src={LOGO} width="230" height="86" alt="DJ Khalil Nahhat"/>
        <h1 id="preflight-title" className="preflight-greeting">{ar?'أهلاً بك في إيكو.':'Welcome to Echo.'}</h1>
        <div className="preflight-progress preflight-loader-line" role="progressbar" aria-label={ar?'تحميل التطبيق':'App loading'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{transform:`scaleX(${progress/100})`}}/></div>
        <p className="preflight-status" role="status">{status}</p>
        {stage==='error'&&<button type="button" className="preflight-enter" onClick={()=>window.location.reload()}>{ar?'إعادة المحاولة':'Retry loading'}</button>}
      </div>
    </div>}
  </>;
}
