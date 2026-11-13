// The photo viewers see while the live is paused: chosen from the site's gallery. Only a reference (id, title, link) is kept in this browser.
const KEY='echo-pause-photo';
export const GO_LIVE_KEY='echo-go-live-screen';
export const PAUSE_WIDTH=1280,PAUSE_HEIGHT=720;
// The same pause photo for a 9:16 (portrait) live.
export const PAUSE_PORTRAIT_WIDTH=720,PAUSE_PORTRAIT_HEIGHT=1280;
// In Landscape + Portrait the portrait picture is a vertical 9:16 band of the landscape frame; pan 0..1 slides it from the left edge to the right edge.
export function portraitBand(pan=.5,W=PAUSE_WIDTH,H=PAUSE_HEIGHT){const w=Math.min(W,H*9/16),x=(W-w)*Math.max(0,Math.min(1,Number(pan)||0));return {x,w};}
// Fit a picture of any shape into a 16:9 black frame, never stretching it.
export function pausePhotoBox(sourceW,sourceH,W=PAUSE_WIDTH,H=PAUSE_HEIGHT){
  const scale=Math.min(W/sourceW,H/sourceH),w=Math.round(sourceW*scale),h=Math.round(sourceH*scale);
  return {x:Math.round((W-w)/2),y:Math.round((H-h)/2),w,h};
}
// Pan and crop. zoom 1 = the photo fills the frame (cover); the smallest zoom (and the default, 0) shows the whole photo (fit, with
// black bars); the largest crops in 4x. (cx, cy) is the point of the photo, 0..1, that sits in the middle of the frame.
export const MAX_ZOOM=4,DEFAULT_CROP={zoom:0,cx:.5,cy:.5};
const sizeOf=image=>[image.naturalWidth||image.width,image.naturalHeight||image.height];
export const fitZoom=(imageW,imageH,W=PAUSE_WIDTH,H=PAUSE_HEIGHT)=>Math.min(W/imageW,H/imageH)/Math.max(W/imageW,H/imageH);
export function cropRect(imageW,imageH,crop=DEFAULT_CROP,W=PAUSE_WIDTH,H=PAUSE_HEIGHT){
  const cover=Math.max(W/imageW,H/imageH),minZoom=fitZoom(imageW,imageH,W,H),zoom=Math.max(minZoom,Math.min(MAX_ZOOM,crop.zoom>0?crop.zoom:minZoom));
  const w=imageW*cover*zoom,h=imageH*cover*zoom;
  // A side longer than the frame may not leave an empty gap; a shorter one stays centred.
  const place=(size,frame,centre)=>size>=frame?Math.max(frame-size,Math.min(0,frame/2-centre*size)):(frame-size)/2;
  return {x:place(w,W,crop.cx??.5),y:place(h,H,crop.cy??.5),w,h,zoom,minZoom};
}
// The pause message written over the photo: text, where its centre sits (x, y as 0..1 of the frame), size (% of the frame height) and colour.
export const DEFAULT_MESSAGE={text:'',x:.5,y:.82,px:.5,py:.78,size:7,psize:7,color:'#ffffff',pcolor:'#ffffff',font:'Manrope',fx:{blur:0,fade:0,brightness:100,saturate:100,gray:0,sepia:0},safe:true};
export const MESSAGE_COLORS=['#ffffff','#f4efe6','#e6d6ac','#ffd166','#ffb347','#ff8a65','#ff6b6b','#ff7eb6','#f48fe0','#c792ea','#9d8cff','#7aa2ff','#5ec8ff','#4fe3e0','#7fe0b0','#a3e635','#f5f06a','#c9ccd1'];
// Fonts already loaded by index.html: [label, family, weight].
export const MESSAGE_FONTS=[['Clean','Manrope',700],['Noto Sans','Noto Sans',700],['Bold condensed','Anton',400],['Elegant','Playfair Display',600],['Classic serif','Amiri',700],['Fashion','Abril Fatface',400],['Royal','Cinzel Decorative',700],['Script','Dancing Script',700],['Wedding script','Great Vibes',400],['Handwritten','Satisfy',400],['Retro','Lobster',400],['Fun','Pacifico',400],['Arabic Naskh','Cairo',900],['Arabic Kufi','Reem Kufi',700],['Arabic bold','Lalezar',400],['Arabic calligraphy','Aref Ruqaa',700],['Arabic display','Mirza',700]];
const fontOf=key=>MESSAGE_FONTS.find(item=>item[1]===key)||MESSAGE_FONTS[0];
export const loadMessageFont=(key,doc=globalThis.document)=>{const [,family,weight]=fontOf(key);return doc?.fonts?.load?.(`${weight} 40px "${family}"`).catch(()=>{});};
// Background look of the photo (the message is drawn on top, unfiltered). blur: % of the frame height; fade: darkness 0..90 %; the rest are CSS filter percentages.
export const FX_DEFAULT={blur:0,fade:0,brightness:100,saturate:100,gray:0,sepia:0};
export const FX_PRESETS=[['None',{}],['Soft blur',{blur:1.2,fade:15}],['Heavy blur',{blur:3,fade:30}],['Dim',{fade:45,brightness:90}],['Fade out',{fade:70}],['Mono',{gray:100,fade:15}],['Warm',{sepia:55,saturate:120,fade:10}],['Dreamy',{blur:1.6,brightness:115,saturate:85,fade:12}],['Vivid',{saturate:150,brightness:105}]];
export function normalizeFx(fx){const m={...FX_DEFAULT,...(fx||{})},num=(v,d,a,b)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):d;return {blur:num(m.blur,0,0,6),fade:num(m.fade,0,0,90),brightness:num(m.brightness,100,40,160),saturate:num(m.saturate,100,0,200),gray:num(m.gray,0,0,100),sepia:num(m.sepia,0,0,100)};}
export function normalizeMessage(message){
  const m={...DEFAULT_MESSAGE,...(message||{})};
  const num=(value,fallback,min,max)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
  return {text:String(m.text||'').slice(0,300),x:num(m.x,.5,0,1),y:num(m.y,.82,0,1),px:num(m.px,.5,0,1),py:num(m.py,.78,0,1),size:num(m.size,7,2,20),psize:num(m.psize??m.size,7,2,20),color:MESSAGE_COLORS.includes(m.color)?m.color:'#ffffff',pcolor:MESSAGE_COLORS.includes(m.pcolor)?m.pcolor:MESSAGE_COLORS.includes(m.color)?m.color:'#ffffff',font:fontOf(m.font)[1],fx:normalizeFx(m.fx),safe:m.safe!==false};
}
// Greedy word wrap with the canvas' own text measure (explicit line breaks are kept).
export function wrapLines(measure,text,maxWidth){
  const lines=[];
  for(const paragraph of String(text).split('\n')){
    let line='';
    for(const word of paragraph.split(/\s+/).filter(Boolean)){
      const next=line?`${line} ${word}`:word;
      if(line&&measure(next)>maxWidth){lines.push(line);line=word;}else line=next;
    }
    lines.push(line);
  }
  return lines.length?lines:[''];
}
// band: the portrait slice of a landscape frame. With message.safe the text is wrapped to it and centred on it, so portrait viewers read it whole.
export function drawMessage(ctx,message,W=PAUSE_WIDTH,H=PAUSE_HEIGHT,band=null){
  const m=normalizeMessage(message);if(!m.text.trim())return null;
  const portrait=H>W,font=Math.round((portrait?m.psize:m.size)/100*Math.min(W,H)),pad=Math.round(font*.55),lineHeight=Math.round(font*1.28);
  ctx.save();
  const face=fontOf(m.font);ctx.font=`${face[2]} ${font}px "${face[1]}","Noto Sans Arabic",system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  const fit=band&&m.safe&&!portrait,lines=wrapLines(text=>ctx.measureText(text).width,m.text,fit?band.w*.9-pad*2:W*.84),widest=Math.max(...lines.map(line=>ctx.measureText(line).width));
  const boxW=Math.min(W,widest+pad*2),boxH=lines.length*lineHeight+pad*1.2;
  const cx=fit?band.x+band.w/2:Math.max(boxW/2+8,Math.min(W-boxW/2-8,(portrait?m.px:m.x)*W)),cy=Math.max(boxH/2+8,Math.min(H-boxH/2-8,(portrait?m.py:m.y)*H));
  ctx.fillStyle='rgba(0,0,0,.52)';ctx.fillRect(cx-boxW/2,cy-boxH/2,boxW,boxH);
  ctx.fillStyle=portrait?m.pcolor:m.color;lines.forEach((line,index)=>ctx.fillText(line,cx,cy-boxH/2+pad*.6+lineHeight*(index+.5)));
  ctx.restore();
  return {x:cx-boxW/2,y:cy-boxH/2,w:boxW,h:boxH};
}
export function paintFrame(ctx,image,crop=DEFAULT_CROP,W=PAUSE_WIDTH,H=PAUSE_HEIGHT,message=null,band=null){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  const [iw,ih]=sizeOf(image),rect=cropRect(iw,ih,crop,W,H),fx=normalizeFx(message?.fx);
  const blur=Math.round(fx.blur/100*H*10)/10,filter=[blur&&`blur(${blur}px)`,fx.brightness!==100&&`brightness(${fx.brightness}%)`,fx.saturate!==100&&`saturate(${fx.saturate}%)`,fx.gray&&`grayscale(${fx.gray}%)`,fx.sepia&&`sepia(${fx.sepia}%)`].filter(Boolean).join(' ');
  if(filter&&'filter' in ctx){ctx.save();ctx.filter=filter;ctx.drawImage(image,rect.x,rect.y,rect.w,rect.h);ctx.restore();}else ctx.drawImage(image,rect.x,rect.y,rect.w,rect.h);
  if(fx.fade){ctx.save();ctx.fillStyle=`rgba(0,0,0,${fx.fade/100})`;ctx.fillRect(0,0,W,H);ctx.restore();}
  if(message)drawMessage(ctx,message,W,H,band);return rect;
}
// The still the live shows: a 1280 x 720 canvas with the photo placed by its crop.
// A copy of the pause frame with a big countdown number over it (shown just before the live resumes).
export function frameWithCountdown(frame,n,doc=globalThis.document){
  const canvas=doc.createElement('canvas');canvas.width=frame.width;canvas.height=frame.height;
  const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;ctx.drawImage(frame,0,0);
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.round(Math.min(W,H)*.5)}px system-ui,sans-serif`;
  ctx.fillText(String(n),W/2,H/2);return canvas;
}
export function frameFromImage(image,doc=globalThis.document,crop=DEFAULT_CROP,message=null,portrait=false,band=null){
  const W=portrait?PAUSE_PORTRAIT_WIDTH:PAUSE_WIDTH,H=portrait?PAUSE_PORTRAIT_HEIGHT:PAUSE_HEIGHT;
  const canvas=doc.createElement('canvas');canvas.width=W;canvas.height=H;
  paintFrame(canvas.getContext('2d'),image,crop,W,H,message,portrait?null:band);return canvas;
}
// crossOrigin keeps the canvas clean: a picture without it would block the live picture from being captured.
export function loadImage(url,ImageClass=globalThis.Image){
  return new Promise((resolve,reject)=>{const image=new ImageClass();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('This photo could not be loaded for the live. Choose another one.'));image.src=url;});
}
export async function preparePausePhoto(item,{key=KEY,crop=DEFAULT_CROP,cropPortrait={zoom:1,cx:.5,cy:.5},message=null,portraitPan=null,storage=globalThis.localStorage,load=loadImage,frame=frameFromImage}={}){
  const image=await load(item.mediaUrl),note=normalizeMessage(message);await loadMessageFont(note.font);const band=portraitPan===null?null:portraitBand(portraitPan);
  try{storage?.setItem(key,JSON.stringify({id:item.id,title:item.title||'',url:item.mediaUrl,crop,cropPortrait,message:note,portraitPan}));}catch{/* Still works for this session. */}
  return {id:item.id,title:item.title||'',url:item.mediaUrl,crop,cropPortrait,message:note,portraitPan,frame:frame(image,undefined,crop,note,false),portraitFrame:frame(image,undefined,cropPortrait,note,true),image};
}
export async function loadPausePhoto({key=KEY,storage=globalThis.localStorage,load=loadImage,frame=frameFromImage}={}){
  try{const saved=JSON.parse(storage?.getItem(key)||'null');if(!saved?.url)return null;const image=await load(saved.url),crop=saved.crop||DEFAULT_CROP,cropPortrait=saved.cropPortrait||DEFAULT_CROP,note=normalizeMessage(saved.message),_font=await loadMessageFont(saved.message?.font),pan=Number.isFinite(saved.portraitPan)?saved.portraitPan:null,band=pan===null?null:portraitBand(pan);return {...saved,crop,cropPortrait,message:note,frame:frame(image,undefined,crop,note,false),portraitFrame:frame(image,undefined,cropPortrait,note,true),image};}catch{return null;}
}

// Restore the photo from a reference saved with the live on the server (another browser, or after a reload).
export async function restorePausePhoto(saved,{storage=globalThis.localStorage,load=loadImage,frame=frameFromImage}={}){
  if(!saved?.url)return null;
  const image=await load(saved.url),crop=saved.crop||DEFAULT_CROP,cropPortrait=saved.cropPortrait||DEFAULT_CROP,note=normalizeMessage(saved.message),_font=await loadMessageFont(saved.message?.font);
  try{storage?.setItem(KEY,JSON.stringify({id:saved.id||'',title:saved.title||'',url:saved.url,crop,cropPortrait,message:note}));}catch{/* Still works for this session. */}
  return {id:saved.id||'',title:saved.title||'',url:saved.url,crop,cropPortrait,message:note,frame:frame(image,undefined,crop,note),portraitFrame:frame(image,undefined,cropPortrait,note,true),image};
}
