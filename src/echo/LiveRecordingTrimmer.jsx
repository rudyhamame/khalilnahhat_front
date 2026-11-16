import {POSTING_VIDEO_GOALS,LEGACY_VIDEO_GOALS,customPostingGoal} from '../lib/postingFormats';
import {useEffect,useRef,useState} from 'react';
import {Pause,Play,RotateCcw,Scissors,Sparkles,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {loadFaceDetector,detectFaces} from '../lib/faces';
import CameraAppearanceControls from '../components/CameraAppearanceControls';
import {CAMERA_APPEARANCE_DEFAULTS,cameraAppearanceFilter} from '../lib/cameraAppearance';

const clock=value=>{
 const seconds=Math.max(0,Number(value)||0),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),rest=(seconds%60).toFixed(2).padStart(5,'0');
 return `${hours?`${hours}:`:''}${String(minutes).padStart(hours?2:1,'0')}:${rest}`;
};
const bounded=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

const GOALS=[...POSTING_VIDEO_GOALS,...LEGACY_VIDEO_GOALS];
export default function LiveRecordingTrimmer({item,sources,token,onClose,onSaved,onEdition,edition,initialGoal=''}){
 const dialog=useRef(null),video=useRef(null),track=useRef(null),framesRef=useRef([]),[now,setNow]=useState(0),[goalId,setGoalId]=useState(edition?.goal||initialGoal),[editionName,setEditionName]=useState(''),[vRatio,setVRatio]=useState(16/9);
 const customMatch=/^custom-(\d+)x(\d+)$/.exec(goalId);
 const goal=GOALS.find(g=>g[0]===goalId)||(customMatch?customPostingGoal(Number(customMatch[1]),Number(customMatch[2])):null);
 // Framing guide the editor can move and resize. frame = {x,y,w}: top-left and width as fractions of the video picture; height follows the goal's ratio.
 const stage=useRef(null),[stageBox,setStageBox]=useState({w:0,h:0}),[frame,setFrame]=useState(null);
 useEffect(()=>{const el=stage.current;if(!el)return undefined;const ro=new ResizeObserver(()=>setStageBox({w:el.clientWidth,h:el.clientHeight}));ro.observe(el);return()=>ro.disconnect();},[]);
 const fitFrame=(r,v)=>r<=v?{x:(1-r/v)/2,y:0,w:r/v}:{x:0,y:(1-v/r)/2,w:1};
 useEffect(()=>{setFrame(goal?fitFrame(goal[2],vRatio):null);},[goalId,vRatio]); // eslint-disable-line react-hooks/exhaustive-deps
 // The picture inside the stage (object-fit: contain) in px, and the guide frame in px.
 const pic=(()=>{const W=Math.min(stageBox.w,stageBox.h*vRatio),H=W/vRatio;return {W,H,L:(stageBox.w-W)/2,T:(stageBox.h-H)/2};})();
 const frameBox=goal&&frame&&pic.W>0?(()=>{const w=frame.w*pic.W,h=w/goal[2];return {left:pic.L+frame.x*pic.W,top:pic.T+frame.y*pic.H,width:w,height:h};})():null;
 // Follow face: free, on this device. MediaPipe's face detector (loaded from a CDN, no account, no per-use cost) steers the frame while the video plays.
 // faceTrack keeps {time -> frame x} so the same path can later drive a free server-side crop.
 const [follow,setFollow]=useState(false),[faceState,setFaceState]=useState(''),detector=useRef(null),faceTrack=useRef(new Map());
 useEffect(()=>{
  if(!follow||!goalId){setFaceState('');return undefined;}
  faceTrack.current.clear();
  let dead=false,handle=0,lastRun=0;const v=video.current;if(!v)return undefined;
  (async()=>{
   try{
    if(!detector.current){
     setFaceState('Loading face model…');const base='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
     const {FaceDetector,FilesetResolver}=await import(/* @vite-ignore */ `${base}/vision_bundle.mjs`);
     const files=await FilesetResolver.forVisionTasks(`${base}/wasm`);
     detector.current=await FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'},runningMode:'VIDEO'});
    }
    if(dead)return;setFaceState('Following the face');
    const step=()=>{
     if(dead)return;
     const now=performance.now();
     if(v.readyState>=2&&v.videoWidth&&now-lastRun>80){
      lastRun=now;
      const faces=detector.current.detectForVideo(v,now).detections||[],face=faces.map(d=>d.boundingBox).filter(Boolean).sort((a,b)=>b.width-a.width)[0];
      if(face){const cx=(face.originX+face.width/2)/v.videoWidth;setFaceState('Following the face');
       setFrame(c=>{if(!c)return c;const target=Math.max(0,Math.min(1-c.w,cx-c.w/2));if(Math.abs(target-c.x)<.01)return c;const x=c.x+(target-c.x)*.25;faceTrack.current.set(Math.round(((offsets[curRef.current]||0)+v.currentTime)*4)/4,x);return {...c,x};});}
      else setFaceState('No face in view — holding position');
     }
     handle=v.requestVideoFrameCallback?v.requestVideoFrameCallback(step):requestAnimationFrame(step);
    };
    step();
   }catch{if(!dead){setFaceState('Face detection could not load. Check your connection.');setFollow(false);}}
  })();
  return()=>{dead=true;if(v.cancelVideoFrameCallback&&handle)v.cancelVideoFrameCallback(handle);else cancelAnimationFrame(handle);};
 },[follow,goalId]);
 const dragFrame=(event,corner)=>{
  if(!frameBox||event.button>0)return;setFollow(false);faceTrack.current.clear();event.preventDefault();event.stopPropagation();
  const r=goal[2],start={x:event.clientX,y:event.clientY},f0={...frame},w0=f0.w*pic.W,h0=w0/r,ax=corner?.includes('l')?f0.x*pic.W+w0:f0.x*pic.W,ay=corner?.includes('t')?f0.y*pic.H+h0:f0.y*pic.H;
  const move=e=>{
   if(!corner){setFrame(c=>({...c,x:Math.max(0,Math.min(1-c.w,f0.x+(e.clientX-start.x)/pic.W)),y:Math.max(0,Math.min(1-c.w*pic.W/r/pic.H,f0.y+(e.clientY-start.y)/pic.H))}));return;}
   // Resize from the corner opposite the one grabbed, keeping the goal's ratio and staying inside the picture.
   const px=e.clientX-stage.current.getBoundingClientRect().left-pic.L,py=e.clientY-stage.current.getBoundingClientRect().top-pic.T;
   const room=(corner.includes('l')?ax:pic.W-ax),roomY=(corner.includes('t')?ay:pic.H-ay);
   const w=Math.max(40,Math.min(Math.abs(px-ax),Math.abs(py-ay)*r,room,roomY*r)),h=w/r;
   setFrame({x:(corner.includes('l')?ax-w:ax)/pic.W,y:(corner.includes('t')?ay-h:ay)/pic.H,w:w/pic.W});
  };
  const stop=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',stop);
 };
 // One timeline over every stored part: global seconds = the part's offset + its own time. Parts the edit leaves out (skipped) keep their place on the rail.
 const parts=item.parts||[],lens=sources.map((_,i)=>Number(parts[i]?.durationSec)||0),offsets=lens.map((_,i)=>lens.slice(0,i).reduce((a,b)=>a+b,0)),duration=lens.reduce((a,b)=>a+b,0);
 const kept=sources.map((_,i)=>i).filter(i=>!parts[i]?.skipped),firstKept=kept[0]??0,lastKept=kept.at(-1)??0,source=parts[firstKept]||{};
 const [cur,setCur]=useState(firstKept),curRef=useRef(cur),pending=useRef(null);curRef.current=cur;
 const fromEdition=edition?(edition.whole?[edition.start,edition.end]:[(offsets[edition.part||0]||0)+edition.start,(offsets[edition.part||0]||0)+edition.end]):null;
 const [start,setStart]=useState(fromEdition?fromEdition[0]:(offsets[firstKept]||0)+(Number(parts[firstKept]?.trimStartSec)||0)),[end,setEnd]=useState(fromEdition?fromEdition[1]:(offsets[lastKept]||0)+(Number(parts[lastKept]?.trimEndSec)||lens[lastKept]||0)),[playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[frames,setFrames]=useState([]);
 const partAt=t=>{let i=0;offsets.forEach((o,n)=>{if(o<=t&&lens[n]>0)i=n;});return i;};
 const getNow=()=>(offsets[curRef.current]||0)+(video.current?.currentTime||0);
 // Jump to a global time: same part -> seek; another part -> swap the source and seek once it has loaded.
 const seekGlobal=(t,play)=>{const g=Math.max(0,Math.min(duration,Number(t)||0)),i=partAt(g),local=Math.max(0,g-offsets[i]);if(i===curRef.current){if(video.current)video.current.currentTime=local;setNow(g);if(play&&video.current)void video.current.play().catch(()=>{});}else{pending.current={t:local,play:play??(video.current?!video.current.paused:false)};setCur(i);setNow(g);}};
 // The look (beauty and lighting) is edited here, on the recording, and applied when it is previewed, downloaded or published.
 const [look,setLook]=useState({...CAMERA_APPEARANCE_DEFAULTS,...(edition?edition.look||{}:source.look||{})}),savedLook=useRef(JSON.stringify({...CAMERA_APPEARANCE_DEFAULTS,...(source.look||{})}));
 const lookOn=look.strength>0,amount=look.strength/100,lookFilter=lookOn?`${cameraAppearanceFilter(look)} ${look.warmth>0?`sepia(${(look.warmth/50*amount*.5).toFixed(3)})`:look.warmth<0?`hue-rotate(${(look.warmth*amount*.3).toFixed(1)}deg)`:''}`.trim():'none';
 // Auto look: measures the frame on screen (brightness, contrast, colour cast) and sets the sliders to correct it. ponytail: one-frame heuristic, not a model.
 const [autoNote,setAutoNote]=useState('');
 const autoLook=()=>{
  try{
   const v=video.current,c=document.createElement('canvas');c.width=64;c.height=36;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0,64,36);
   const d=x.getImageData(0,0,64,36).data;let n=0,sum=0,sq=0,r=0,b=0;
   for(let i=0;i<d.length;i+=4){const y=.299*d[i]+.587*d[i+1]+.114*d[i+2];sum+=y;sq+=y*y;r+=d[i];b+=d[i+2];n++;}
   const mean=sum/n,sd=Math.sqrt(Math.max(0,sq/n-mean*mean)),cl=(v,a,z)=>Math.round(Math.max(a,Math.min(z,v)));
   setLook(current=>({...current,strength:70,brightness:cl((118-mean)*.5,-30,40),contrast:cl((60-sd)*.4,-30,30),warmth:cl((b-r)/n*.5,-50,50),tone:25}));
   setAutoNote('Adjusted from the frame on screen. Fine-tune with the sliders.');
  }catch{setAutoNote('This frame could not be analysed. Use the sliders.');}
 };

 // Real frames for the film rail, across every part. ponytail: one hidden decoder per part (made when first needed), seeks only; falls back to the tinted rail if the browser blocks canvas reads.
 useEffect(()=>{
  if(!duration||!sources.length)return undefined;
  let dead=false;const decoders=[];
  const decoder=i=>decoders[i]||=new Promise((ok,no)=>{const v=document.createElement('video');v.crossOrigin='anonymous';v.muted=true;v.preload='auto';v.playsInline=true;v.onloadedmetadata=()=>ok(v);v.onerror=()=>no(new Error('load'));v.src=sources[i];});
  const seek=(v,t)=>new Promise((ok,no)=>{const timer=setTimeout(()=>no(new Error('seek')),6000);v.onseeked=()=>{clearTimeout(timer);ok();};v.onerror=()=>{clearTimeout(timer);no(new Error('seek'));};v.currentTime=t;});
  const at=t=>{let i=0;offsets.forEach((o,n)=>{if(o<=t&&lens[n]>0)i=n;});return i;};
  (async()=>{try{
   const first=await decoder(firstKept);
   const c=document.createElement('canvas'),h=96,w=Math.max(1,Math.round(h*(first.videoWidth||16)/(first.videoHeight||9)));c.width=w;c.height=h;const g=c.getContext('2d');
   const count=Math.max(8,Math.min(60,Math.ceil((track.current?.clientWidth||900)/(64*(first.videoWidth||16)/(first.videoHeight||9)))));
   // Coarse to fine: every 8th slot first, then the gaps, so the whole rail shows a picture early and sharpens. A failed frame is skipped, not fatal.
   const order=[];for(const gap of [8,4,2,1])for(let n=0;n<count;n+=gap)if(!order.includes(n))order.push(n);
   const slots=framesRef.current.length===count?[...framesRef.current]:Array(count).fill(null);let done=0;
   for(const n of order){if(dead)break;
    try{const t=(n+.5)/count*duration,i=at(t),v=await decoder(i);await seek(v,Math.max(0,Math.min(lens[i]-.05,t-offsets[i])));g.drawImage(v,0,0,w,h);slots[n]=c.toDataURL('image/jpeg',.6);}catch{continue;}
    if(++done%3===0||n===order.at(-1)){framesRef.current=[...slots];setFrames([...slots]);}}
   if(!dead){framesRef.current=[...slots];setFrames([...slots]);}
  }catch{/* keep tinted rail */}})();
  return()=>{dead=true;decoders.forEach(p=>p?.then?.(v=>{v.removeAttribute('src');v.load();}));};
 },[Math.round(duration),sources.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
 // Drag the selected area itself: the in/out points move together and the length stays the same.
 const moveWindow=event=>{
  if(busy||!duration||event.button>0||!track.current)return;event.preventDefault();event.stopPropagation();
  const x0=event.clientX,s0=start,len=end-start,width=track.current.getBoundingClientRect().width||1;
  const move=e=>{const next=bounded(s0+(e.clientX-x0)/width*duration,0,Math.max(0,duration-len));setStart(next);setEnd(next+len);if(partAt(next)===curRef.current)seekGlobal(next,false);last=next;};
  let last=s0;const stop=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);seekGlobal(last,false);};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',stop);
 };
 const changeStart=value=>{const next=bounded(value,0,Math.max(0,end-.1));setStart(next);seekGlobal(next,false);};
 const changeEnd=value=>setEnd(bounded(value,Math.min(duration,start+.1),duration));
 const toggle=async()=>{
  const player=video.current;if(!player)return;
  if(!player.paused){player.pause();return;}
  const g=getNow();
  if(g<start||g>=end-.02){seekGlobal(start,true);return;}
  try{await player.play();}catch{setError('Preview playback could not start.');}
 };
 const save=async()=>{
  setBusy(true);setError('');video.current?.pause();
  try{
   const lookBody=lookOn?{strength:look.strength,brightness:look.brightness,contrast:look.contrast,warmth:look.warmth,tone:look.tone}:null;
   // One range over the whole timeline is split into each part's own seconds; parts fully outside it are skipped.
   const result=sources.length>1
    ?await apiRequest(`/admin/live-recordings/${item.id}/trims`,{token,method:'POST',body:{look:lookBody,parts:sources.map((_,i)=>{const a=Math.max(start,offsets[i])-offsets[i],b=Math.min(end,offsets[i]+lens[i])-offsets[i];return b-a<.1?{index:i,skipped:true}:{index:i,start:a,end:b};})}})
    :await apiRequest(`/admin/live-recordings/${item.id}/trim`,{token,method:'POST',body:{part:0,start,end,look:lookBody}});
   onSaved(result.item);onClose();}
  catch(problem){if(!problem.cancelled)setError(problem.message||'The trim could not be saved.');setBusy(false);}
 };
 const rulerStep=[1,2,5,10,15,30,60,120,300,600,1800].find(step=>duration/step<=12)||3600;
 // Keep this trim + look + goal as a named edition of the live, without changing the live's active trim.
 // Render the framed crop on the server (free ffmpeg): the face path recorded while following, or the frame as it stands.
 const [rendering,setRendering]=useState(false);
 // Scan the selected range for the face without playing it: seek every ~1 s (fewer on long ranges), detect, and fill faceTrack. The server follows this path.
 const scanFaces=async()=>{
  const detectorNow=await loadFaceDetector(),step=Math.max(1,(end-start)/400),times=[];for(let t=start;t<end;t+=step)times.push(t);
  const decoders={};const decoder=i=>decoders[i]||=new Promise((ok,no)=>{const v=document.createElement('video');v.crossOrigin='anonymous';v.muted=true;v.preload='auto';v.playsInline=true;v.onloadedmetadata=()=>ok(v);v.onerror=()=>no(new Error('load'));v.src=sources[i];});
  const seek=(v,t)=>new Promise((ok,no)=>{const timer=setTimeout(()=>no(new Error('seek')),8000);v.onseeked=()=>{clearTimeout(timer);ok();};v.onerror=()=>{clearTimeout(timer);no(new Error('seek'));};v.currentTime=t;});
  faceTrack.current.clear();let x=null,found=0;
  try{
   for(const [n,t] of times.entries()){
    const i=partAt(t),v=await decoder(i);await seek(v,Math.max(0,Math.min(lens[i]-.05,t-offsets[i])));
    const faces=detectFaces(detectorNow,v,v.videoWidth,v.videoHeight).sort((a,b)=>b.w-a.w),f=faces[0];
    if(f){found++;const target=Math.max(0,Math.min(1-frame.w,f.cx-frame.w/2));x=x===null?target:x+(target-x)*.6;}
    if(x!==null)faceTrack.current.set(t,x);
    if(n%5===0)setAutoNote(`Finding the face… ${Math.round(n/times.length*100)}%`);
   }
  }finally{Object.values(decoders).forEach(p=>p.then(v=>{v.removeAttribute('src');v.load();}).catch(()=>{}));}
  return found;
 };
 const renderCrop=async()=>{
  if(!goal||!frame)return;setRendering(true);setError('');
  try{
   if(follow){const found=await scanFaces();if(!found){setError('No face was found in the selected range, so the crop stays where you placed it. Move the frame or pick a different range.');setRendering(false);return;}}
   // A render is one file per stored part: the range is cut at part borders and each piece is rendered on its own.
   const base=editionName.trim(),pieces=sources.map((_,i)=>({i,a:Math.max(start,offsets[i])-offsets[i],b:Math.min(end,offsets[i]+lens[i])-offsets[i]})).filter(p=>p.b-p.a>=.5);
   let result;
   for(const p of pieces)result=await apiRequest(`/admin/live-recordings/${item.id}/renders`,{token,method:'POST',body:{name:base?(pieces.length>1?`${base} · part ${p.i+1}`:base):(pieces.length>1?`Part ${p.i+1}`:undefined),part:p.i,start:p.a,end:p.b,goal:goalId,frame,track:[...faceTrack.current.entries()].map(([t,x])=>[t-offsets[p.i],x]).filter(([t])=>t>=p.a-1&&t<=p.b+1).sort((a,b)=>a[0]-b[0])}});
   if(result)onEdition(result.item);setAutoNote(`Rendering started${pieces.length>1?` for ${pieces.length} parts`:''}. It appears under Renders on the recording page; this can take a few minutes.`);}
  catch(problem){if(!problem.cancelled)setError(problem.message||'The render could not start.');}
  finally{setRendering(false);}
 };
 const saveEdition=async()=>{
  const name=editionName.trim()||`Edition ${(item.editions?.length||0)+1}`;setBusy(true);setError('');
  try{const result=await apiRequest(`/admin/live-recordings/${item.id}/editions`,{token,method:'POST',body:{name,whole:true,start,end,goal:goalId,look:lookOn?{strength:look.strength,brightness:look.brightness,contrast:look.contrast,warmth:look.warmth,tone:look.tone}:null}});onEdition(result.item);setEditionName('');}
  catch(problem){if(!problem.cancelled)setError(problem.message||'The edition could not be saved.');}
  finally{setBusy(false);}
 };
 const full=duration>0&&start<.005&&end>=duration-.005;
 return <section ref={dialog} className="live-recording-trimmer" aria-labelledby="live-recording-trimmer-title" onKeyDown={event=>{if(event.key==='Escape'&&!busy&&!event.target.matches('input,select,textarea')){onClose();return;}if(busy||event.target.matches('input,select,textarea')||event.metaKey||event.ctrlKey)return;const v=video.current;if(!v)return;const k=event.key.toLowerCase();if(k===' '||k==='k'){event.preventDefault();toggle();}else if(k==='i')changeStart(getNow());else if(k==='o')changeEnd(getNow());else if(k==='arrowleft'||k==='arrowright'){event.preventDefault();seekGlobal(getNow()+(k==='arrowleft'?-1:1)*(event.shiftKey?5:1/30));}}}>
  <header><span><Scissors size={20}/></span><div><small>VIDEO EDITOR</small><h2 id="live-recording-trimmer-title">Edit live recording{sources.length>1?` · whole video (${sources.length} parts)`:''}</h2><p>Trim the video and set its beauty and lighting before it is published or downloaded. The original stays unchanged.</p><em className="live-trim-keys">Space play · I / O set in / out · ← → frame · Shift+← → 5 s</em></div><button type="button" aria-label="Close video trimmer" disabled={busy} onClick={()=>onClose()}><X size={18}/></button></header>
  <div className="live-trimmer-layout"><div className="live-recording-trimmer-body">
   <div className="live-trim-stage" ref={stage}><video ref={video} src={sources[cur]} crossOrigin="anonymous" style={{filter:lookFilter}} playsInline preload="metadata" onLoadedMetadata={event=>{const {videoWidth:vw,videoHeight:vh}=event.currentTarget;if(vw&&vh)setVRatio(vw/vh);const el=event.currentTarget;if(pending.current){el.currentTime=pending.current.t;if(pending.current.play)void el.play().catch(()=>{});pending.current=null;}}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>{const next=cur+1<sources.length?cur+1:null,at=(offsets[cur]||0)+lens[cur];if(next!==null&&at<end-.02)seekGlobal(at+.001,true);else setPlaying(false);}} onTimeUpdate={event=>{const g=(offsets[curRef.current]||0)+event.currentTarget.currentTime;setNow(g);if(g>=end){event.currentTarget.pause();seekGlobal(start,false);}}}/>{frameBox&&<div className="live-trim-guide" style={frameBox} onPointerDown={event=>dragFrame(event,null)} onDoubleClick={()=>setFrame(fitFrame(goal[2],vRatio))} title="Drag to move · drag a corner to resize · double-click to fit"><span>{goal[1]}</span>{['tl','tr','bl','br'].map(c=>
    <i key={c} className={`live-trim-handle-corner is-${c}`} onPointerDown={event=>dragFrame(event,c)}/>)}</div>}</div>
   <div className="live-trim-transport"><button type="button" aria-label={playing?'Pause selected range':'Play selected range'} disabled={!duration||busy} onClick={toggle}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><strong className="live-trim-now">{clock(now)}<small> / {clock(duration)}</small></strong><strong>{clock(start)} — {clock(end)}</strong><span>{clock(end-start)} selected</span><button type="button" className="live-trim-mark" disabled={!duration||busy} onClick={()=>changeStart(getNow())}>Set in</button><button type="button" className="live-trim-mark" disabled={!duration||busy} onClick={()=>changeEnd(getNow())}>Set out</button></div>
   <div className="live-trim-timeline" style={{'--trim-start':`${duration?start/duration*100:0}%`,'--trim-end':`${duration?end/duration*100:100}%`}}>
    <div className="live-trim-track" ref={track} onClick={event=>{const r=event.currentTarget.getBoundingClientRect();if(duration)seekGlobal((event.clientX-r.left)/r.width*duration);}}>{frames.length>0&&<div className="live-trim-frames">{frames.map((f,n)=>{const shown=f||frames.slice(0,n).findLast(Boolean)||frames.find(Boolean);return shown?<img key={n} src={shown} alt="" draggable="false"/>:<span key={n}/>;})}</div>}<i className="live-trim-window" title="Drag to move the whole selection" onClick={event=>event.stopPropagation()} onPointerDown={moveWindow}/><b className="live-trim-playhead" style={{left:`${duration?now/duration*100:0}%`}}/></div>
    <input className="live-trim-handle" aria-label="Trim start" type="range" min="0" max={duration||1} step="0.01" value={start} disabled={!duration||busy} onChange={event=>changeStart(Math.min(event.target.value,end-.1))}/>
    <input className="live-trim-handle" aria-label="Trim end" type="range" min="0" max={duration||1} step="0.01" value={end} disabled={!duration||busy} onChange={event=>changeEnd(Math.max(event.target.value,start+.1))}/>
    <div className="live-trim-ruler" aria-hidden="true">{duration>0&&Array.from({length:Math.floor(duration/rulerStep)+1},(_,n)=><span key={n} style={{left:`${n*rulerStep/duration*100}%`}}>{clock(n*rulerStep)}</span>)}</div>
   </div>
   <div className="live-trim-fields"><label>Start<input type="number" min="0" max={Math.max(0,end-.1)} step="0.01" value={Number(start.toFixed(2))} disabled={!duration||busy} onChange={event=>changeStart(event.target.value)}/><span>sec</span></label><label>End<input type="number" min={Math.min(duration,start+.1)} max={duration} step="0.01" value={Number(end.toFixed(2))} disabled={!duration||busy} onChange={event=>changeEnd(event.target.value)}/><span>sec</span></label></div>
   {error&&<p className="live-trim-error" role="alert">{error}</p>}
  </div>
  <aside className="live-trimmer-look" aria-label="Beauty and lighting"><h3>Editing goal</h3>
   <select className="live-trimmer-goal" aria-label="Editing goal" value={goalId} onChange={event=>setGoalId(event.target.value)} disabled={busy}><option value="">Choose a format</option>{customMatch&&<option value={goalId}>{goal?.[1]}</option>}{GOALS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
   {goal&&<p className="live-trimmer-goalinfo" role="status">Guide: {goal[4]} frame{vRatio>1.2&&goal[2]<1?' — the sides will be cropped':vRatio<.8&&goal[2]>1?' — the top and bottom will be cropped':''}. {goal[3]?(end-start>goal[3]?<>Selection is {clock(end-start)}; limit is about {clock(goal[3])}. <button type="button" onClick={()=>changeEnd(start+goal[3])}>Trim to limit</button></>:<>{clock(end-start)} of about {clock(goal[3])} allowed.</>):'Choose the duration appropriate for your post.'} <button type="button" className="live-trimmer-render" disabled={busy||rendering||!frame||end-start<.5} onClick={renderCrop}>{rendering?'Starting…':'Render this crop'}</button> <label className="live-trimmer-follow"><input type="checkbox" checked={follow} onChange={event=>setFollow(event.target.checked)}/> Follow the face (free, runs on this device)</label>{faceState&&<small className="live-trimmer-facestate" role="status">{faceState}</small>} Drag the frame to move it and its corners to resize it (double-click to fit). The framing guide is a preview; it is not applied to the saved file.</p>}
   <h3>Beauty &amp; lighting</h3><button type="button" className="live-trimmer-auto" onClick={autoLook} disabled={busy}><Sparkles size={14}/>Auto enhance</button>{autoNote&&<p role="status">{autoNote}</p>}<CameraAppearanceControls value={look} onChange={setLook} disabled={busy} hide={['smoothing','sideLight']} note="Applied to the video when it is previewed, downloaded or published. The original stays unchanged. The preview here is approximate."/></aside></div>
  <footer><button type="button" className="live-trim-reset" disabled={!duration||busy||full} onClick={()=>{setStart(0);setEnd(duration);seekGlobal(0,false);}}><RotateCcw size={15}/>Use full recording</button><span>{full?'Full recording selected':`Keeping ${clock(end-start)} of ${clock(duration)}`}</span><input className="live-trim-editionname" aria-label="Edition name" placeholder="Edition name" maxLength={80} value={editionName} disabled={busy} onChange={event=>setEditionName(event.target.value)}/><button type="button" disabled={!duration||busy||end-start<.1} onClick={saveEdition}>Save as edition</button><button type="button" disabled={busy} onClick={()=>onClose()}>Cancel</button><button type="button" className="live-trim-save" disabled={!duration||busy||end-start<.1} onClick={save}><Scissors size={15}/>{busy?'Saving…':'Save edits'}</button></footer>
 </section>;
}
