import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {X,ImageOff} from 'lucide-react';
import {fetchGallery} from '../lib/galleryApi';
import {loadImage} from '../lib/pausePhoto';
// Pick one photo from the site's gallery for the Photo viewer. The picture is turned into a file (same as a photo from the device).
const LONG_SIDE=1920;
export async function galleryPhotoFile(item,load=loadImage,doc=globalThis.document){
  const image=await load(item.mediaUrl),scale=Math.min(1,LONG_SIDE/Math.max(image.naturalWidth,image.naturalHeight)),canvas=doc.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise((done,fail)=>canvas.toBlob(value=>value?done(value):fail(new Error('This photo could not be prepared.')),'image/jpeg',.92));
  const name=(item.title||'gallery-photo').replace(/[\\/:*?"<>|]+/g,' ').trim()||'gallery-photo';
  return new File([blob],`${name}.jpg`,{type:'image/jpeg'});
}
export default function GalleryPhotoPicker({token,onPick,onClose}){
  const [items,setItems]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState('');
  useEffect(()=>{let cancelled=false;fetchGallery(['photo'],{token}).then(list=>{if(!cancelled)setItems(list);}).catch(()=>{if(!cancelled)setError('The gallery could not be loaded.');});return()=>{cancelled=true;};},[token]);
  useEffect(()=>{const key=event=>{if(event.key==='Escape')onClose();};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[onClose]);
  const choose=async item=>{setBusy(item.id);setError('');try{onPick(await galleryPhotoFile(item));}catch(problem){setError(problem.message||'This photo could not be loaded.');setBusy('');}};
  return createPortal(<div className="pause-picker" role="dialog" aria-modal="true" aria-label="Choose a photo from the gallery" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="pause-picker-card"><header><div><h3>Gallery</h3><p>Choose the photo to show as the video.</p></div><button type="button" aria-label="Close" onClick={onClose}><X size={16}/></button></header>
      {error&&<p className="studio-help is-warning" role="alert">{error}</p>}
      {!items&&!error&&<p className="pause-picker-note" role="status">Loading the gallery…</p>}
      {items&&!items.length&&<p className="pause-picker-note"><ImageOff size={16} aria-hidden="true"/> No photos in the gallery yet. Add some in Echo → Gallery.</p>}
      {items?.length>0&&<ul className="pause-picker-grid">{items.map(item=><li key={item.id}><button type="button" disabled={Boolean(busy)} onClick={()=>void choose(item)} aria-label={item.title||'Gallery photo'}><img src={item.mediaUrl} alt="" loading="lazy"/>{busy===item.id&&<span>Loading…</span>}</button></li>)}</ul>}
    </div></div>,document.body);
}
