import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Download,Film,Image as ImageIcon} from 'lucide-react';
import qrcode from 'qrcode-generator';
import {recordingPublicUrl} from '../lib/recordingLink';
import './recordingSocialStudio.css';

const F=(platform,label,hint,w,h,kind='image')=>({platform,label,hint,w,h,kind});
const FORMATS={
 'ig-post':F('instagram','Post','1080 × 1080',1080,1080),
 'ig-portrait':F('instagram','Portrait post','1080 × 1350 · 4:5',1080,1350),
 'ig-story':F('instagram','Story','1080 × 1920',1080,1920),
 'ig-reel':F('instagram','Reel','1080 × 1920 · video',1080,1920,'video'),
 'yt-thumb':F('youtube','Thumbnail','1280 × 720',1280,720),
 'yt-video':F('youtube','Video','1920 × 1080 · video',1920,1080,'video'),
 'yt-short':F('youtube','Short','1080 × 1920 · video',1080,1920,'video'),
 'yt-community':F('youtube','Community post','1080 × 1080',1080,1080),
 'tt-video':F('tiktok','Video','1080 × 1920 · video',1080,1920,'video'),
 'tt-photo':F('tiktok','Photo post','1080 × 1920',1080,1920),
 'tt-cover':F('tiktok','Video cover','1080 × 1920',1080,1920),
};
const PLATFORMS={instagram:'Instagram',youtube:'YouTube',tiktok:'TikTok'};
const shapeOf=({w,h})=>w===h?'square':w>h?'wide':h===1350?'portrait':'tall';
const T=(label,bg,ink,muted,accent,dark=true,bg2=null)=>({label,bg,bg2,ink,muted,accent,dark});
const THEMES={
 night:T('Night','#0d1411','#f2f5f0','#a9b8ae','#7fdcb3'),
 gold:T('Gold','#14100a','#f6efe0','#bfae8a','#e2c384'),
 paper:T('Paper','#f3efe6','#15211b','#5d6b62','#1f6b54',false),
 mono:T('Mono','#080808','#ffffff','#9a9a9a','#ffffff'),
 ocean:T('Ocean','#06182a','#eaf6ff','#8fb4cc','#5ec8ff',true,'#0b3a5c'),
 sunset:T('Sunset','#2a0f3d','#fff4ea','#f1c3a8','#ffd27a',true,'#ff6a3d'),
 rose:T('Rose','#2a0b1b','#fff0f5','#d9a3b8','#ff7aa8',true,'#5b1236'),
 neon:T('Neon','#07050f','#f4f0ff','#a79cd1','#19f0ff',true,'#2b0a4a'),
 forest:T('Forest','#08170f','#eaf4e6','#9db89c','#9be37a',true,'#12402a'),
 crimson:T('Crimson','#1a0508','#fff1f0','#d6a5a3','#ff4d57',true,'#5c0f1a'),
 violet:T('Violet','#150b2e','#f3edff','#b3a2dc','#b69cff',true,'#3a1c79'),
 cream:T('Cream','#efe4d0','#2a1a0e','#7a6550','#a4491a',false,'#f8f1e3'),
 sky:T('Sky','#dcefff','#0c2340','#4c6d92','#0b5cff',false,'#f2f9ff'),
 mint:T('Mint','#dff5ea','#0d2a1d','#4f7a63','#0f8f5b',false,'#f3fcf7'),
 blush:T('Blush','#fde4ea','#3b1423','#8b5a69','#d6336c',false,'#fff4f7'),
 graphite:T('Graphite','#1c1f24','#eef1f5','#9aa3ad','#f2b84b',true,'#2d333b'),
};
const LAYOUTS={classic:'Classic',poster:'Poster'};
const FONT='"Inter","Segoe UI",system-ui,sans-serif',REEL_SECONDS=15;
const clamp=(value,low=0,high=1)=>Math.max(low,Math.min(high,value));
const ease=value=>1-Math.pow(1-clamp(value),3);

function round(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function wrap(ctx,text,maxWidth,maxLines){
 const lines=[];let line='';
 for(const word of String(text||'').split(/\s+/).filter(Boolean)){
  const next=line?`${line} ${word}`:word;
  if(ctx.measureText(next).width<=maxWidth||!line)line=next;else{lines.push(line);line=word;}
 }
 if(line)lines.push(line);
 if(lines.length>maxLines){const kept=lines.slice(0,maxLines);kept[maxLines-1]=kept[maxLines-1].replace(/\s*\S*$/,'')+'…';return kept;}
 return lines;
}
function drawBackground(ctx,W,H,theme,cover){
 ctx.fillStyle=theme.bg;ctx.fillRect(0,0,W,H);
 if(theme.bg2){const g=ctx.createLinearGradient(0,0,W*.6,H);g.addColorStop(0,theme.bg);g.addColorStop(1,theme.bg2);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
 if(cover){
  ctx.save();ctx.filter=`blur(${theme.dark?60:70}px) saturate(1.2)`;ctx.globalAlpha=theme.bg2?.28:theme.dark?.5:.22;
  const s=Math.max(W,H)*1.15;ctx.drawImage(cover,(W-s)/2,(H-s)/2,s,s);ctx.restore();
 }
 if(theme.dark){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0000');g.addColorStop(1,'#0009');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
}
function drawCover(ctx,cover,x,y,size,theme,zoom=1){
 ctx.save();ctx.shadowColor='#0008';ctx.shadowBlur=60;ctx.shadowOffsetY=24;round(ctx,x,y,size,size,size*.045);ctx.fillStyle=theme.dark?'#1b2620':'#e2dccd';ctx.fill();ctx.restore();
 ctx.save();round(ctx,x,y,size,size,size*.045);ctx.clip();
 if(cover){const s=size*zoom;ctx.drawImage(cover,x-(s-size)/2,y-(s-size)/2,s,s);}
 else{const g=ctx.createLinearGradient(x,y,x+size,y+size);g.addColorStop(0,theme.accent);g.addColorStop(1,theme.bg);ctx.fillStyle=g;ctx.fillRect(x,y,size,size);ctx.fillStyle=theme.ink;ctx.font=`700 ${size*.3}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('♪',x+size/2,y+size/2);}
 ctx.restore();
}
function drawQr(ctx,qr,x,y,size){
 if(!qr){ctx.save();ctx.strokeStyle='#9ca8a2';ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.strokeRect(x,y,size,size);ctx.setLineDash([]);ctx.fillStyle='#9ca8a2';ctx.textAlign='center';ctx.font=`600 ${size*.14}px ${FONT}`;ctx.fillText('QR',x+size/2,y+size*.46);ctx.font=`500 ${size*.07}px ${FONT}`;ctx.fillText('ON PUBLISH',x+size/2,y+size*.64);ctx.restore();return;}
 ctx.save();round(ctx,x,y,size,size,size*.08);ctx.fillStyle='#fff';ctx.fill();
 const count=qr.getModuleCount(),pad=size*.07,cell=(size-pad*2)/count;ctx.fillStyle='#0b120f';
 for(let r=0;r<count;r++)for(let c=0;c<count;c++)if(qr.isDark(r,c))ctx.fillRect(x+pad+c*cell,y+pad+r*cell,Math.ceil(cell),Math.ceil(cell));
 ctx.restore();
}
const alpha=(ctx,value,draw)=>{if(value<=0)return;ctx.save();ctx.globalAlpha=clamp(value);draw();ctx.restore();};

// One drawing routine serves the static post/story and every frame of the reel (state animates the pieces).
function drawCard(ctx,{format,data,theme,cover,qr,layout='classic',crop={zoom:1,x:0,y:0}},state={title:1,credits:1,qr:1,zoom:1,bars:null}){
 const fmt=FORMATS[format],{w:W,h:H}=fmt,shape=shapeOf(fmt),c=ctx;
 drawBackground(c,W,H,theme,cover);
 c.textBaseline='alphabetic';
  if(layout==='poster'&&fmt.kind!=='video'){
  ctx.fillStyle=theme.bg;ctx.fillRect(0,0,W,H);
  if(cover){const k=Math.max(W/cover.width,H/cover.height)*crop.zoom,iw=cover.width*k,ih=cover.height*k;c.drawImage(cover,(W-iw)/2+crop.x*(iw-W)/2,(H-ih)/2+crop.y*(ih-H)/2,iw,ih);}
  else{const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,theme.accent);g.addColorStop(1,theme.bg2||theme.bg);c.fillStyle=g;c.fillRect(0,0,W,H);}
  const fade=c.createLinearGradient(0,H*.3,0,H);fade.addColorStop(0,'#0000');fade.addColorStop(.6,'#000b');fade.addColorStop(1,'#000f');c.fillStyle=fade;c.fillRect(0,0,W,H);
  const small=H<1600,p=small?64:80,q=small?190:240,max=W-p*2-q-40,big=small?64:84;
  c.textBaseline='alphabetic';c.textAlign='left';
  c.fillStyle=theme.accent;c.font=`700 30px ${FONT}`;c.fillText('DJ KHALIL',p,p+30);
  c.font=`600 26px ${FONT}`;c.fillText((data.type||'Recording').toUpperCase(),p,H-p-q+10);
  c.fillStyle='#fff';c.font=`700 ${big}px ${FONT}`;const lines=wrap(c,data.title,max,3);
  const last=H-p-(data.vocalists||data.musicians||data.year?58:8);
  lines.forEach((line,i)=>c.fillText(line,p,last-(lines.length-1-i)*(big+10)));
  c.fillStyle='#d6d6d6';c.font=`500 28px ${FONT}`;
  const credit=wrap(c,[data.vocalists,data.musicians,data.year].filter(Boolean).join('  ·  '),max,1)[0];if(credit)c.fillText(credit,p,H-p);
  drawQr(c,qr,W-p-q,H-p-q-34,q);c.textAlign='center';c.fillStyle='#fff';c.font=`700 26px ${FONT}`;c.fillText(data.listenLabel,W-p-q/2,H-p+4);
  return;
 }
 drawBackground(c,W,H,theme,cover);
 c.textBaseline='alphabetic';
 if(shape==='wide'){
  const k=H/1080;c.save();c.scale(k,k);
  const size=760,x0=120;drawCover(c,cover,x0,160,size,theme,state.zoom);
  const x=x0+size+90,max=1920-x-110;c.textAlign='left';
  c.font=`700 84px ${FONT}`;const lines=wrap(c,data.title,max,3),after=350+(lines.length-1)*98;
  alpha(c,state.title,()=>{const dy=(1-ease(state.title))*24;c.fillStyle=theme.accent;c.font=`600 30px ${FONT}`;c.fillText((data.type||'Recording').toUpperCase(),x,250+dy);c.fillStyle=theme.ink;c.font=`700 84px ${FONT}`;lines.forEach((line,i)=>c.fillText(line,x,350+dy+i*98));});
  alpha(c,state.credits,()=>{c.fillStyle=theme.muted;c.font=`500 32px ${FONT}`;wrap(c,[data.vocalists,data.musicians,data.year].filter(Boolean).join('  ·  '),max,3).forEach((line,i)=>c.fillText(line,x,after+70+i*44));});
  if(state.bars){c.fillStyle=theme.accent;state.bars.forEach((v,i)=>{const h=8+v*60;round(c,x+i*22,690-h,14,h,7);c.fill();});}
  alpha(c,state.qr,()=>{const lift=(1-ease(state.qr))*40,qs=230,qy=730+lift;drawQr(c,qr,x,qy,qs);c.fillStyle=theme.ink;c.font=`700 44px ${FONT}`;c.fillText(data.listenLabel,x+qs+36,qy+qs/2-4);c.fillStyle=theme.muted;c.font=`500 26px ${FONT}`;c.fillText(data.host,x+qs+36,qy+qs/2+40);});
  c.textAlign='right';c.fillStyle=theme.accent;c.font=`700 28px ${FONT}`;c.fillText('DJ KHALIL',1920-110,1080-56);
  c.restore();return;
 }
 if(shape==='square'){
  const pad=72,size=430;
  drawCover(c,cover,pad,pad,size,theme);
  const x=pad+size+56,max=W-pad-x;
  c.textAlign='left';c.fillStyle=theme.accent;c.font=`600 26px ${FONT}`;c.fillText((data.type||'Recording').toUpperCase(),x,pad+34);
  c.fillStyle=theme.ink;c.font=`700 64px ${FONT}`;const lines=wrap(c,data.title,max,4);lines.forEach((line,i)=>c.fillText(line,x,pad+108+i*74));
  const after=pad+108+lines.length*74;
  c.fillStyle=theme.muted;c.font=`500 28px ${FONT}`;
  c.fillStyle=theme.muted;c.font=`500 28px ${FONT}`;
  const credits=wrap(c,[data.vocalists,data.musicians].filter(Boolean).join(' · '),max,3);credits.forEach((line,i)=>c.fillText(line,x,after+22+i*40));
  if(data.year){c.fillText(data.year,x,pad+size-6);}
  const qs=230,qy=H-pad-qs;
  drawQr(c,qr,pad,qy,qs);
  c.fillStyle=theme.ink;c.font=`700 44px ${FONT}`;c.fillText(data.listenLabel,pad+qs+40,qy+qs/2-8);
  c.fillStyle=theme.muted;c.font=`500 26px ${FONT}`;c.fillText(data.host,pad+qs+40,qy+qs/2+34);
  c.textAlign='right';c.fillStyle=theme.accent;c.font=`700 30px ${FONT}`;c.fillText('DJ KHALIL',W-pad,H-pad-6);
  return;
 }
 // Portrait (4:5) reuses the tall layout, scaled down to fit.
 const scale=shape==='portrait'?H/1920:1;if(scale!==1){c.save();c.scale(scale,scale);}
 const VW=W/scale,VH=H/scale,cx=VW/2,size=720;
 c.textAlign='center';
 drawCover(c,cover,(VW-size)/2,150,size,theme,state.zoom);
 if(state.bars){c.fillStyle=theme.accent;const n=state.bars.length,bw=14,gap=8,total=n*(bw+gap)-gap;state.bars.forEach((v,i)=>{const h=8+v*70;round(c,cx-total/2+i*(bw+gap),960-h,bw,h,bw/2);c.fill();});}
 alpha(c,state.title,()=>{
  const dy=(1-ease(state.title))*30;
  c.fillStyle=theme.accent;c.font=`600 30px ${FONT}`;c.fillText((data.type||'Recording').toUpperCase(),cx,1030+dy);
  c.fillStyle=theme.ink;c.font=`700 76px ${FONT}`;wrap(c,data.title,VW-160,2).forEach((line,i)=>c.fillText(line,cx,1120+dy+i*88));
 });
 alpha(c,state.credits,()=>{
  c.fillStyle=theme.muted;c.font=`500 32px ${FONT}`;
  wrap(c,[data.vocalists,data.musicians,data.year].filter(Boolean).join('  ·  '),VW-200,2).forEach((line,i)=>c.fillText(line,cx,1330+i*44));
 });
 alpha(c,state.qr,()=>{
  const lift=(1-ease(state.qr))*60,qs=250,qy=1440+lift;
  drawQr(c,qr,cx-qs/2,qy,qs);
  c.fillStyle=theme.ink;c.font=`700 40px ${FONT}`;c.fillText(data.listenLabel,cx,qy+qs+68);
  c.fillStyle=theme.muted;c.font=`500 26px ${FONT}`;c.fillText(data.host,cx,qy+qs+114);
 });
 c.fillStyle=theme.accent;c.font=`700 28px ${FONT}`;c.fillText('DJ KHALIL',cx,VH-64);
 if(scale!==1)c.restore();
}
async function loadCover(url){
 if(!url)return null;
 try{const response=await fetch(url);if(!response.ok)return null;return await createImageBitmap(await response.blob());}catch{return null;}
}
const mimeChoices=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'];

export default function RecordingSocialStudio({id,value,vocabulary=[],typeName='',cover:coverUrl,onClose,published=true,settings,onSettingsChange}){
 const canvas=useRef(null),qr=useMemo(()=>{if(!published||!id)return null;const code=qrcode(0,'M');code.addData(recordingPublicUrl(id));code.make();return code;},[id,published]);
 const [format,setFormat]=useState(settings?.format||'ig-post'),[themeId,setThemeId]=useState(settings?.themeId||'night'),[layout,setLayout]=useState(settings?.layout||'classic'),[crop,setCrop]=useState(settings?.crop||{zoom:1,x:0,y:0}),[cover,setCover]=useState(null),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[reel,setReel]=useState(null),[error,setError]=useState('');
 const firstAtom=value.items?.[0],defaultStart=Math.floor(firstAtom?.audioRange?.startSec??firstAtom?.lyrics?.startSec??0);
 const duration=Number(value.durationSeconds)||0,maxStart=Math.max(0,Math.floor(duration-REEL_SECONDS));
 const [start,setStart]=useState(Math.min(settings?.start??defaultStart,maxStart));
 const settingsCallback=useRef(onSettingsChange);settingsCallback.current=onSettingsChange;
 useEffect(()=>{settingsCallback.current?.({format,themeId,layout,crop,start});},[format,themeId,layout,crop,start]);
 const names=useCallback(ids=>[...new Set(ids)].map(key=>vocabulary.find(row=>row.id===key)?.name).filter(Boolean).join(', '),[vocabulary]);
 const data=useMemo(()=>{
  const vocalists=[...(value.recordingCredits?.vocalists||[]),...(value.items||[]).flatMap(item=>item.lyrics?.vocalistCredits||[])].map(row=>row.artistId);
  const musicians=[...(value.recordingCredits?.musicians||[]),...(value.items||[]).flatMap(item=>item.musicianCredits||[])].map(row=>row.artistId);
  return {listenLabel:published?'Scan to listen':'Preview only',title:value.title||'Untitled recording',type:typeName,vocalists:names(vocalists),musicians:names(musicians),year:(value.releaseDate||'').slice(0,4),host:published?recordingPublicUrl(id).replace(/^https?:\/\//,'').replace(/\/music-archive.*$/,'')+'/music-archive':'Available after publication'};
 },[value,typeName,names,id,published]);
 const theme=THEMES[themeId];
 useEffect(()=>{let live=true;loadCover(coverUrl).then(image=>{if(live)setCover(image);});return()=>{live=false;};},[coverUrl]);
 const still=useCallback(state=>{
  const node=canvas.current;if(!node)return;const {w,h}=FORMATS[format];node.width=w;node.height=h;
  drawCard(node.getContext('2d'),{format,data,theme,cover,qr,layout,crop},state||{title:1,credits:1,qr:1,zoom:1,bars:null});
 },[format,data,theme,cover,qr,layout,crop]);
 useEffect(()=>{if(!busy)still();},[still,busy]);
 useEffect(()=>()=>{if(reel?.url)URL.revokeObjectURL(reel.url);},[reel]);

 const downloadName=ext=>`${(value.title||'recording').trim().replace(/[^\w\- ]+/g,'').replace(/\s+/g,'-').toLowerCase()||'recording'}-${format}.${ext}`;
 const save=(blob,name)=>{const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),1500);};
 const downloadImage=()=>published&&canvas.current?.toBlob(blob=>blob&&save(blob,downloadName('png')),'image/png');

 const makeReel=async()=>{
  setError('');setReel(null);
  const mime=mimeChoices.find(type=>window.MediaRecorder?.isTypeSupported?.(type));
  if(!mime||!value.audioUrl){setError('This browser cannot record video. Use Chrome or Edge.');return;}
  setBusy(true);setProgress(0);
  let audioContext;
  try{
   audioContext=new AudioContext();
   const buffer=await audioContext.decodeAudioData(await (await fetch(value.audioUrl)).arrayBuffer());
   const node=canvas.current,{w,h}=FORMATS[format];node.width=w;node.height=h;
   const context=node.getContext('2d'),destination=audioContext.createMediaStreamDestination(),gain=audioContext.createGain(),analyser=audioContext.createAnalyser();analyser.fftSize=128;
   const source=audioContext.createBufferSource();source.buffer=buffer;source.connect(gain);gain.connect(analyser);analyser.connect(destination);
   const stream=new MediaStream([...node.captureStream(30).getVideoTracks(),...destination.stream.getAudioTracks()]),chunks=[];
   const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6_000_000,audioBitsPerSecond:192_000});
   recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   const finished=new Promise(resolve=>{recorder.onstop=resolve;});
   const from=Math.min(start,Math.max(0,buffer.duration-REEL_SECONDS)),length=Math.min(REEL_SECONDS,buffer.duration-from);
   gain.gain.setValueAtTime(0,audioContext.currentTime);gain.gain.linearRampToValueAtTime(1,audioContext.currentTime+.4);gain.gain.setValueAtTime(1,audioContext.currentTime+length-1);gain.gain.linearRampToValueAtTime(0,audioContext.currentTime+length);
   const bins=new Uint8Array(analyser.frequencyBinCount);
   recorder.start(250);source.start(0,from,length);const began=performance.now();
   await new Promise(resolve=>{
    const frame=()=>{
     const t=(performance.now()-began)/1000;analyser.getByteFrequencyData(bins);
     const bars=Array.from({length:32},(_,i)=>bins[i+2]/255);
     drawCard(context,{format,data,theme,cover,qr},{title:clamp((t-.3)/.8),credits:clamp((t-length*.33)/.8),qr:clamp((t-length*.66)/.8),zoom:1+.06*clamp(t/length),bars});
     setProgress(Math.min(1,t/length));
     if(t<length)requestAnimationFrame(frame);else resolve();
    };frame();
   });
   recorder.stop();await finished;
   const blob=new Blob(chunks,{type:mime.split(';')[0]});
   setReel({url:URL.createObjectURL(blob),blob,ext:mime.startsWith('video/mp4')?'mp4':'webm'});
  }catch(problem){setError(problem?.message?`The video could not be made: ${problem.message}`:'The video could not be made.');}
  finally{audioContext?.close().catch(()=>{});setBusy(false);}
 };
 // Poster: drag the photo to reposition it, wheel or slider to zoom.
 const drag=useRef(null);
 const posterEdit=layout==='poster'&&FORMATS[format].kind!=='video'&&cover;
 const clampPan=value=>Math.max(-1,Math.min(1,value));
 const startDrag=event=>{if(!posterEdit)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,crop};};
 const moveDrag=event=>{
  const start=drag.current;if(!start)return;
  const node=canvas.current,rect=node.getBoundingClientRect(),{w,h}=FORMATS[format],factor=w/rect.width;
  const k=Math.max(w/cover.width,h/cover.height)*start.crop.zoom,spanX=(cover.width*k-w)/2,spanY=(cover.height*k-h)/2;
  setCrop({zoom:start.crop.zoom,x:spanX>0?clampPan(start.crop.x+(event.clientX-start.x)*factor/spanX):0,y:spanY>0?clampPan(start.crop.y+(event.clientY-start.y)*factor/spanY):0});
 };
 const zoomTo=zoom=>setCrop(current=>({...current,zoom:Math.max(1,Math.min(4,zoom))}));
 useEffect(()=>{
  const node=canvas.current;if(!node||!posterEdit)return undefined;
  const wheel=event=>{event.preventDefault();setCrop(current=>({...current,zoom:Math.max(1,Math.min(4,current.zoom*(event.deltaY<0?1.06:1/1.06)))}));};
  node.addEventListener('wheel',wheel,{passive:false});return()=>node.removeEventListener('wheel',wheel);
 },[posterEdit]);
 const isReel=FORMATS[format].kind==='video',platform=FORMATS[format].platform;
 return <section className="social-studio" aria-label="Social card studio">
  <header className="social-studio-bar"><button type="button" onClick={onClose} disabled={busy}><ArrowLeft size={16}/>Back</button><h2>Social card</h2>{!published&&<span className="social-preview-badge">Preview · not published</span>}</header>
  <div className="social-studio-body">
   <div className="social-studio-stage"><canvas ref={canvas} className={`social-canvas is-${shapeOf(FORMATS[format])}${posterEdit?' is-draggable':''}`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} role="img" aria-label={`${FORMATS[format].label} preview`}/></div>
   <aside className="social-studio-panel">{!published&&<p className="social-preview-note">Review your design now. The listening QR code and downloads become available after you publish the recording.</p>}
    <fieldset disabled={busy}><legend>Platform</legend><div className="social-tabs">{Object.entries(PLATFORMS).map(([key,label])=><button key={key} type="button" aria-pressed={platform===key} onClick={()=>{if(platform!==key){setFormat(Object.keys(FORMATS).find(name=>FORMATS[name].platform===key));setReel(null);}}}>{label}</button>)}</div></fieldset>
    <fieldset disabled={busy}><legend>Format</legend><div className="social-seg">{Object.entries(FORMATS).filter(([,item])=>item.platform===platform).map(([key,item])=><button key={key} type="button" aria-pressed={format===key} onClick={()=>{setFormat(key);setReel(null);}}><strong>{item.label}</strong><small>{item.hint}</small></button>)}</div></fieldset>
    {!isReel&&<fieldset disabled={busy}><legend>Layout</legend><div className="social-seg is-two">{Object.entries(LAYOUTS).map(([key,label])=><button key={key} type="button" aria-pressed={layout===key} onClick={()=>setLayout(key)}><strong>{label}</strong></button>)}</div></fieldset>}
    {posterEdit&&<fieldset disabled={busy}><legend>Photo crop</legend><label className="social-range"><span>Zoom <b>{Math.round(crop.zoom*100)}%</b></span><input type="range" min="1" max="4" step=".01" value={crop.zoom} onChange={event=>zoomTo(Number(event.target.value))}/></label><div className="social-crop-row"><small>Drag the photo to move it. Scroll to zoom.</small><button type="button" onClick={()=>setCrop({zoom:1,x:0,y:0})}>Reset</button></div></fieldset>}
    <fieldset disabled={busy}><legend>Style</legend><div className="social-themes">{Object.entries(THEMES).map(([key,item])=><button key={key} type="button" aria-pressed={themeId===key} onClick={()=>setThemeId(key)} style={{'--sw':item.bg,'--sa':item.accent,'--sb':item.bg2||item.bg}}><i/>{item.label}</button>)}</div></fieldset>
    {isReel&&<fieldset disabled={busy}><legend>Audio sample</legend><label className="social-range"><span>Starts at <b>{Math.floor(start/60)}:{String(start%60).padStart(2,'0')}</b> · {REEL_SECONDS} s</span><input type="range" min="0" max={maxStart} step="1" value={start} onChange={event=>setStart(Number(event.target.value))}/></label></fieldset>}
    {error&&<p className="social-error" role="alert">{error}</p>}
    {!isReel&&<button type="button" className="social-primary" disabled={!published} onClick={downloadImage}><ImageIcon size={16}/>Download PNG</button>}
    {isReel&&<button type="button" className="social-primary" disabled={busy||!value.audioUrl} onClick={makeReel}><Film size={16}/>{busy?`Recording ${Math.round(progress*100)}%…`:reel?'Make it again':'Make the video'}</button>}
    {isReel&&busy&&<div className="social-progress"><i style={{width:`${progress*100}%`}}/></div>}
    {isReel&&reel&&<div className="social-result"><video src={reel.url} controls playsInline/><button type="button" className="social-primary" disabled={!published} onClick={()=>{if(published)save(reel.blob,downloadName(reel.ext));}}><Download size={16}/>Download .{reel.ext}</button>{reel.ext==='webm'&&<small>This browser saved WebM. Instagram needs MP4: use Chrome or Edge, or convert the file.</small>}</div>}
    {isReel&&!busy&&!reel&&<small className="social-note">The video is recorded in real time ({REEL_SECONDS} s) with the sample playing silently. Keep this tab open.</small>}
   </aside>
  </div>
 </section>;
}
