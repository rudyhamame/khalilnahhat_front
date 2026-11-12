// The photo viewers see while the live is paused: chosen from the site's gallery. Only a reference (id, title, link) is kept in this browser.
const KEY='echo-pause-photo';
export const PAUSE_WIDTH=1280,PAUSE_HEIGHT=720;
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
export function paintFrame(ctx,image,crop=DEFAULT_CROP,W=PAUSE_WIDTH,H=PAUSE_HEIGHT){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  const [iw,ih]=sizeOf(image),rect=cropRect(iw,ih,crop,W,H);ctx.drawImage(image,rect.x,rect.y,rect.w,rect.h);return rect;
}
// The still the live shows: a 1280 x 720 canvas with the photo placed by its crop.
export function frameFromImage(image,doc=globalThis.document,crop=DEFAULT_CROP){
  const canvas=doc.createElement('canvas');canvas.width=PAUSE_WIDTH;canvas.height=PAUSE_HEIGHT;
  paintFrame(canvas.getContext('2d'),image,crop);return canvas;
}
// crossOrigin keeps the canvas clean: a picture without it would block the live picture from being captured.
export function loadImage(url,ImageClass=globalThis.Image){
  return new Promise((resolve,reject)=>{const image=new ImageClass();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('This photo could not be loaded for the live. Choose another one.'));image.src=url;});
}
export async function preparePausePhoto(item,{crop=DEFAULT_CROP,storage=globalThis.localStorage,load=loadImage,frame=frameFromImage}={}){
  const image=await load(item.mediaUrl);
  try{storage?.setItem(KEY,JSON.stringify({id:item.id,title:item.title||'',url:item.mediaUrl,crop}));}catch{/* Still works for this session. */}
  return {id:item.id,title:item.title||'',url:item.mediaUrl,crop,frame:frame(image,undefined,crop),image};
}
export async function loadPausePhoto({storage=globalThis.localStorage,load=loadImage,frame=frameFromImage}={}){
  try{const saved=JSON.parse(storage?.getItem(KEY)||'null');if(!saved?.url)return null;const image=await load(saved.url),crop=saved.crop||DEFAULT_CROP;return {...saved,crop,frame:frame(image,undefined,crop),image};}catch{return null;}
}

// Restore the photo from a reference saved with the live on the server (another browser, or after a reload).
export async function restorePausePhoto(saved,{storage=globalThis.localStorage,load=loadImage,frame=frameFromImage}={}){
  if(!saved?.url)return null;
  const image=await load(saved.url),crop=saved.crop||DEFAULT_CROP;
  try{storage?.setItem(KEY,JSON.stringify({id:saved.id||'',title:saved.title||'',url:saved.url,crop}));}catch{/* Still works for this session. */}
  return {id:saved.id||'',title:saved.title||'',url:saved.url,crop,frame:frame(image,undefined,crop),image};
}
