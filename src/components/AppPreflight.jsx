import {cloudAsset} from '../lib/cloudAsset';
import { useEffect, useRef, useState } from 'react';
import { enterAfterPreflight } from '../lib/preflightEntry.js';
import './appPreflight.css';
import PreflightPhotoWall, { PREFLIGHT_ATLAS } from './PreflightPhotoWall';

const INTRO='https://res.cloudinary.com/nqiooluk/video/upload/v1793064145/khalil/site-assets/07d780a30c73/echo/welcome-stinger.wav';
const TAB_READY_KEY='echo-preflight-complete';
function tabAlreadyReady(){
  try{return sessionStorage.getItem(TAB_READY_KEY)==='true';}catch{return false;}
}
const deadline=(promise,ms)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),ms))]);
function imageReady(src) {
  return new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>image.decode().then(resolve,reject);image.onerror=reject;image.src=src;
  });
}
export default function AppPreflight({children}) {
  const [skipPreflight]=useState(tabAlreadyReady);
  const [stage,setStage]=useState('loading');
  const [progress,setProgress]=useState(0);
  const [notice,setNotice]=useState('');
  const [done,setDone]=useState(skipPreflight);
  const content=useRef(null), sound=useRef(null), enter=useRef(null);
  const autoGreeting=useRef(false);
  const ar=document.documentElement.lang==='ar';
  useEffect(()=>{
    if(skipPreflight)return undefined;
    let canceled=false;
    const controller=new AbortController();
    const oldOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    async function prepare() {
      const session=new Promise(resolve=>{
        const check=()=>{if(document.documentElement.dataset.echoSessionReady==='true'){clearInterval(timer);resolve();}};
        const timer=setInterval(check,50);controller.signal.addEventListener('abort',()=>clearInterval(timer),{once:true});check();
      });
      const assets=['https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg',PREFLIGHT_ATLAS];
      if(location.pathname==='/') {
        for(let i=0;i<8;i++) assets.push(cloudAsset(`/echo/headphone-motion-clean-v2/pose-${String(i).padStart(2,'0')}.webp`));
        for(const i of [0,1,2,3,6,8,9,10,12,13]) assets.push(cloudAsset(`/echo/song-test-performance-v1/pose-${String(i).padStart(2,'0')}.webp`));
      }
      if(location.pathname==='/login')assets.push('https://res.cloudinary.com/nqiooluk/image/upload/v1793064108/khalil/site-assets/574699092ae8/echo/login-khalil-transparent-v2.png','https://res.cloudinary.com/nqiooluk/image/upload/v1793064107/khalil/site-assets/8831e782c65d/echo/login-green-backdrop-v1.webp');
      const tasks=[deadline(session,15000),deadline(document.fonts?.ready||Promise.resolve(),12000),...assets.map(src=>deadline(imageReady(src),15000)),
        deadline(fetch(INTRO,{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('audio');return response.arrayBuffer();}),15000)];
      let completed=0;
      const results=await Promise.allSettled(tasks.map(task=>task.finally(()=>{if(!canceled)setProgress(Math.round(++completed/tasks.length*100));})));
      if(canceled)return;
      // Await the mounted route's foreground images after bootstrap settles.
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const visibleImages=[...(content.current?.querySelectorAll('img:not([loading="lazy"])')||[])];
      await Promise.allSettled(visibleImages.map(image=>deadline(image.complete?image.decode():imageReady(image.currentSrc||image.src),8000)));
      if(canceled)return;
      const failed=results.some(result=>result.status==='rejected');
      setNotice(failed?(ar?'بعض الموارد غير متاحة. يمكنك المتابعة.':'Some resources are unavailable. You can still continue.'):'');
      setProgress(100);setStage('ready');
    }
    prepare().catch(()=>{if(!canceled){setStage('ready');setNotice('Ready to continue with available resources.');}});
    return()=>{canceled=true;controller.abort();document.body.style.overflow=oldOverflow;};
  },[ar,skipPreflight]);
  const reveal=()=>{
    try{sessionStorage.setItem(TAB_READY_KEY,'true');}catch{ /* Storage may be disabled. */ }
    setStage('entered');setDone(true);document.body.style.overflow='';
    requestAnimationFrame(()=>document.querySelector('#echo-main')?.focus({preventScroll:true}));
  };
  const welcome=async()=>{
    setStage('greeting');setNotice('');
    try{sound.current.currentTime=0;await sound.current.play();reveal();}
    catch{reveal();}
  };
  useEffect(()=>{if(stage==='ready')enter.current?.focus();},[stage]);
  useEffect(()=>{
    if(stage!=='ready'||autoGreeting.current)return;
    autoGreeting.current=true;
    enterAfterPreflight(sound.current, reveal);
  },[stage]);
  return <>
    <div ref={content} className={`preflight-app-content${done&&!skipPreflight?' is-revealed':''}`} inert={!done} aria-hidden={!done} style={!done?{visibility:'hidden'}:undefined}>{children}</div>
    {!skipPreflight&&<>
    <audio ref={sound} src={INTRO} preload="auto" onError={()=>setNotice(ar?'الصوت غير متاح. يمكنك الدخول بدون صوت.':'Greeting audio unavailable. You can enter without sound.')} />
    <div className={`echo-preflight is-${stage}`} aria-hidden={done} role={done?undefined:'dialog'} aria-modal={done?undefined:true} aria-labelledby="preflight-title" inert={done}>
      <PreflightPhotoWall audio={sound} />
      <div className="preflight-inner preflight-minimal">
        {stage==='ready'?<button ref={enter} className="preflight-logo-enter" onClick={welcome} aria-label={ar?'ادخل التجربة مع التحية الصوتية':'Enter the experience with your welcome sound'}><img src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" width="230" height="86" alt="DJ Khalil Nahhat"/></button>:<img src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" width="230" height="86" alt="DJ Khalil Nahhat"/>}
        <h1 id="preflight-title" className="preflight-greeting">{ar?'أهلاً بك في إيكو.':'Welcome to Echo.'}</h1>
        <div className="preflight-progress preflight-loader-line" role="progressbar" aria-label={ar?'تحميل التطبيق':'App loading'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{transform:`scaleX(${progress/100})`}}/></div>
        <span className="preflight-accessible-status" role="status">{notice||(stage==='loading'?`${ar?'جارٍ التحميل':'Loading'} ${progress}%`:ar?'اضغط على الشعار للدخول':'Select the logo to enter')}</span>
      </div>
    </div>
    </>}
  </>;
}
