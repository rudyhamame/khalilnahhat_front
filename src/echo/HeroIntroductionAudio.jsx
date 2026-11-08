import {useEffect,useId,useRef,useState} from 'react';
import {Play,Pause,Square,RotateCcw,RotateCw,ArrowDown} from 'lucide-react';
import CurvedIntroText from './CurvedIntroText';
import HeroLanguageDialog from './HeroLanguageDialog';
import arabicNarration from './data/heroIntroduction.ar.json';
import englishNarration from './data/heroIntroduction.en.json';
import {createLiveAudioFocus} from '../lib/liveAudioFocus';
import {archivePlayerCommand,subscribeArchivePlayerState} from '../lib/archivePlayerBridge';
import './heroIntroductionAudio.css';
import {HEADER_INTRO_LANGUAGE_KEY} from './i18n';

function wordAt(narration,time){
 let low=0,high=narration.words.length;
 while(low<high){const mid=(low+high)>>1;if(narration.words[mid].start<=time)low=mid+1;else high=mid;}
 return Math.max(0,low-1);
}

export default function HeroIntroductionAudio({lang,onBegin,animationComplete=0}){
 const [headerIntroLanguage]=useState(()=>{try{const value=sessionStorage.getItem(HEADER_INTRO_LANGUAGE_KEY);return value==='ar'||value==='en'?value:null;}catch{return null;}});
 const chooseLanguageRef=useRef(null);
 const [selectedLanguage,setSelectedLanguage]=useState(null);
 const activeLanguage=selectedLanguage||lang.lang;
 const ar=activeLanguage==='ar';
 const narration=ar?arabicNarration:englishNarration;
 const initialAudioSource=useRef(narration.audio),activeNarration=useRef(narration);activeNarration.current=narration;
 const [phase,setPhase]=useState('idle'),[dialogOpen,setDialogOpen]=useState(false);
 const [roomEntered,setRoomEntered]=useState(false);
 const phaseRef=useRef('idle'),stagingRef=useRef(false),pendingGreeting=useRef(null),priming=useRef(Promise.resolve());
 const [staging,setStaging]=useState(false);
 const audio=useRef(null),root=useRef(null),focus=useRef(null),request=useRef(0),id=useId();
 const [playing,setPlaying]=useState(false),[waiting,setWaiting]=useState(false),[position,setPosition]=useState(0),[duration,setDuration]=useState(narration.duration),[error,setError]=useState('');
 const tr=(en,arabic)=>ar?arabic:en;
 const activeWord=wordAt(narration,position);
 const cueIndex=narration.cues.findIndex(cue=>activeWord>=cue.from&&activeWord<cue.to);
 const cue=narration.cues[Math.max(0,cueIndex)];
 const sync=()=>{
  const player=audio.current;if(!player)return;
  const offset=activeNarration.current.playbackOffset||0;
  // Keep even a long image-loading delay inside the silent lead-in.
  if(stagingRef.current){if(offset&&player.currentTime>=offset/2)player.currentTime=0;return;}
  setPosition(Math.max(0,player.currentTime-offset));
 };
 useEffect(()=>{setDuration(narration.duration);setPosition(0);},[narration]);
 useEffect(()=>{
  focus.current=createLiveAudioFocus({onLoseFocus:()=>audio.current?.pause()});
  const unsubscribe=subscribeArchivePlayerState(event=>{if(event.detail?.playing)audio.current?.pause();});
  const hidden=()=>{if(document.hidden)audio.current?.pause();};
  document.addEventListener('visibilitychange',hidden);
  const player=audio.current;
  return()=>{request.current++;player?.pause();focus.current?.close();unsubscribe();document.removeEventListener('visibilitychange',hidden);};
 },[]);
 useEffect(()=>{
  if(!playing)return;
  let frame;
  const tick=()=>{sync();frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[playing]);
 const startPlayback=async()=>{
  const player=audio.current;if(!player)return;
  const attempt=++request.current;
  setError('');setWaiting(true);
  try{
   if(player.error)player.load();
   const offset=activeNarration.current.playbackOffset||0;
   if(player.readyState>0&&(player.ended||player.currentTime<offset))player.currentTime=offset;
   player.muted=false;player.volume=1;
   focus.current?.claim();archivePlayerCommand('pause');
   await player.play();
   if(attempt!==request.current)player.pause();else{
    if(player.currentTime<offset)player.currentTime=offset;
    setPlaying(!player.paused);sync();
   }
  }catch(e){if(attempt===request.current&&e.name!=='AbortError')setError(tr('The introduction could not play. Please try again.','ما قدرنا نشغّل المقدّمة. جرّب مرّة تانية.'));}
  finally{if(attempt===request.current)setWaiting(false);}
 };
 const pausePlayback=()=>{request.current++;audio.current?.pause();setPlaying(false);setWaiting(false);};
 const chooseLanguage=language=>{
  try{sessionStorage.removeItem(HEADER_INTRO_LANGUAGE_KEY);}catch{/* Storage unavailable */}
  const attempt=++request.current;
  const nextNarration=language==='ar'?arabicNarration:englishNarration;
  activeNarration.current=nextNarration;
  phaseRef.current='started';setPhase('started');
  setRoomEntered(true);
  setSelectedLanguage(language);lang.setLanguage(language);setPosition(0);setError('');
  stagingRef.current=true;setStaging(true);pendingGreeting.current={language,attempt};
  const player=audio.current;
  if(player){
   // Start the actual, unmuted media element in the language tap. Its silent
   // lead-in holds playback until the character is ready. Safari therefore
   // needs neither a later unmute nor a second user gesture to hear the voice.
   player.pause();player.src=nextNarration.audio;player.load();
   player.muted=false;player.volume=1;
   priming.current=player.play().then(()=>{}).catch(()=>{});
  }else{priming.current=Promise.resolve();}
  setPlaying(false);setWaiting(false);
  onBegin?.(language);
 };
 chooseLanguageRef.current=chooseLanguage;
 useEffect(()=>{
  if(!animationComplete||!pendingGreeting.current)return;
  const pending=pendingGreeting.current;
  let cancelled=false;
  priming.current.then(()=>{
   if(cancelled||pendingGreeting.current!==pending||request.current!==pending.attempt)return;
   pendingGreeting.current=null;stagingRef.current=false;setStaging(false);
   if(audio.current){if(audio.current.readyState>0)audio.current.currentTime=activeNarration.current.playbackOffset||0;audio.current.volume=1;}
   void startPlayback();
  });
  return()=>{cancelled=true;};
 },[animationComplete]);
 useEffect(()=>{
  if(window.location.hash)return;
  const surface=root.current?.closest('.preflight-app-content');
  let aligned=false;
  const align=()=>{if(!aligned&&phaseRef.current==='idle'&&(!surface||surface.getAttribute('aria-hidden')!=='true')){aligned=true;window.scrollTo({top:0,behavior:'instant'});}};
  const observer=new MutationObserver(align);if(surface)observer.observe(surface,{attributes:true,attributeFilter:['aria-hidden']});align();
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  let queuedTouchLanguage=null;
  const enter=event=>{
   if(event?.target?.closest?.('.echo-project-chat'))return;
   if(root.current?.dataset.welcomePending!=='true'||document.querySelector('dialog[open]'))return;
   const surface=root.current.closest('.preflight-app-content');
   if(surface?.getAttribute('aria-hidden')==='true')return;
   if(event?.cancelable)event.preventDefault();event?.stopImmediatePropagation?.();
   if(headerIntroLanguage){
    window.scrollTo({top:0,behavior:'instant'});
    // iPad grants media activation on touchend, not during touchmove.
    if(event?.type==='touchmove'){queuedTouchLanguage=headerIntroLanguage;setRoomEntered(true);return;}
    chooseLanguageRef.current?.(headerIntroLanguage);return;
   }
   phaseRef.current='choosing';setRoomEntered(true);window.scrollTo({top:0,behavior:'instant'});setDialogOpen(true);
  };
  const wheel=event=>{if(!event.ctrlKey&&event.deltaY>0&&Math.abs(event.deltaY)>=Math.abs(event.deltaX))enter(event);};
  const key=event=>{if(['ArrowDown','PageDown'].includes(event.key)||event.key===' '&&!event.shiftKey)enter(event);};
  let y=null;
  const touchStart=event=>{y=event.target.closest?.('.echo-project-chat')?null:event.touches[0]?.clientY??null;};
  const touchMove=event=>{if(y!==null&&y-event.touches[0].clientY>8)enter(event);};
  const touchEnd=()=>{y=null;if(queuedTouchLanguage){const language=queuedTouchLanguage;queuedTouchLanguage=null;chooseLanguageRef.current?.(language);}};
  const touchCancel=()=>{y=null;queuedTouchLanguage=null;};
  window.addEventListener('echo:hero-language-request',enter);
  window.addEventListener('wheel',wheel,{capture:true,passive:false});
  window.addEventListener('keydown',key,true);
  window.addEventListener('touchstart',touchStart,{capture:true,passive:true});
  window.addEventListener('touchmove',touchMove,{capture:true,passive:false});
  window.addEventListener('touchend',touchEnd,true);window.addEventListener('touchcancel',touchCancel,true);
  return()=>{window.removeEventListener('echo:hero-language-request',enter);window.removeEventListener('wheel',wheel,true);window.removeEventListener('keydown',key,true);window.removeEventListener('touchstart',touchStart,true);window.removeEventListener('touchmove',touchMove,true);window.removeEventListener('touchend',touchEnd,true);window.removeEventListener('touchcancel',touchCancel,true);};
 },[]);
 const closeLanguage=()=>{
  setDialogOpen(false);
  if(phaseRef.current==='choosing'){phaseRef.current='idle';setRoomEntered(false);}
 };
 const seek=value=>{if(audio.current&&Number.isFinite(value)){audio.current.currentTime=(narration.playbackOffset||0)+Math.max(0,Math.min(duration,value));sync();}};
 return <div ref={root} className="hero-audio-introduction" data-room-entered={roomEntered?'true':'false'} data-welcome-pending={phase==='idle'?'true':undefined} data-started={position>0||playing?true:undefined}>
  {phase==='started'&&!staging&&<div className="hero-introduction-chunks">
   <CurvedIntroText narration={narration} language={ar?'ar':'en'} cueIndex={Math.max(0,cueIndex)} activeWord={activeWord} speaking={position>=narration.words[activeWord].start&&position<narration.words[activeWord].end} started={position>0||playing} onWordSelect={seek}/>
  </div>}
  <div className="hero-intro-player" aria-label={tr('Echo introduction — English','مقدّمة إيكو — بالعربي')}>
   {phase==='idle'?<p className="hero-intro-scroll"><ArrowDown size={18}/>{tr('Scroll to step inside','مرّروا لتبلّشوا')}</p>:<>
   <div className="hero-intro-controls" role="group" aria-label={tr('Introduction playback','التحكم بالمقدّمة')} aria-busy={staging||waiting} dir="ltr">
    <button type="button" disabled={staging} onClick={()=>seek((audio.current?.currentTime||0)-(narration.playbackOffset||0)-10)} aria-label={tr('Rewind 10 seconds','رجوع ١٠ ثواني')} title={tr('Rewind 10 seconds','رجوع ١٠ ثواني')}><RotateCcw size={21}/><span className="hero-intro-skip-seconds" aria-hidden="true">10</span></button>
    <button type="button" disabled={staging||playing||waiting} onClick={startPlayback} aria-controls={`intro-audio-${id}`} aria-label={tr('Start introduction','تشغيل المقدّمة')} title={tr('Start','تشغيل')}><Play size={21}/></button>
    <button type="button" disabled={staging||(!playing&&!waiting)} onClick={pausePlayback} aria-label={tr('Pause introduction','إيقاف مؤقت')} title={tr('Pause','إيقاف مؤقت')}><Pause size={21}/></button>
    <button type="button" disabled={staging} onClick={()=>{pausePlayback();seek(0);}} aria-label={tr('Stop introduction','إيقاف المقدّمة')} title={tr('Stop','إيقاف')}><Square size={18}/></button>
    <button type="button" disabled={staging} onClick={()=>seek((audio.current?.currentTime||0)-(narration.playbackOffset||0)+10)} aria-label={tr('Forward 10 seconds','تقديم ١٠ ثواني')} title={tr('Forward 10 seconds','تقديم ١٠ ثواني')}><RotateCw size={21}/><span className="hero-intro-skip-seconds" aria-hidden="true">10</span></button>
   </div>
   {error&&<p role="alert" className="hero-intro-error">{error}</p>}
   </>}
  </div>
  {phase==='started'&&!staging&&<p className="curved-intro-accessible" dir={ar?'rtl':'ltr'} lang={ar?'ar':'en'} aria-live="polite" aria-atomic="true">{cue.text}</p>}
  {dialogOpen&&<HeroLanguageDialog onChoose={chooseLanguage} onClose={closeLanguage}/>}
  <audio id={`intro-audio-${id}`} ref={audio} preload="auto" playsInline src={initialAudioSource.current} lang={ar?'ar':'en'} onLoadedMetadata={()=>{const value=audio.current.duration-(activeNarration.current.playbackOffset||0);if(Number.isFinite(value))setDuration(value);}} onTimeUpdate={sync} onSeeked={sync} onPlaying={()=>{if(!stagingRef.current){setPlaying(true);setWaiting(false);}}} onPause={()=>{if(!stagingRef.current){setPlaying(false);setWaiting(false);sync();}}} onWaiting={()=>{if(!stagingRef.current)setWaiting(true);}} onEnded={()=>{setPlaying(false);setWaiting(false);sync();}} onError={()=>{if(!stagingRef.current){setPlaying(false);setWaiting(false);setError(tr('The introduction is unavailable. Please try again.','المقدّمة مو متاحة هلّق. جرّبوا مرّة تانية.'));}}}/>
 </div>;
}
