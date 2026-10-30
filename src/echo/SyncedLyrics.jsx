import {useEffect,useLayoutEffect,useRef} from 'react';
import {hasArabic,currentLine} from './LyricsStage';

// mode "line": one elegant line under the title, shrunk just enough to fit the width (never cropped).
// mode "off": nothing is shown. mode "stage": the big full-player lyric is shown elsewhere, so this stays screen-reader only.
export default function SyncedLyrics({timing,position,active,ar,mode='line'}){
 const lines=timing?.lines,ready=Array.isArray(lines)&&lines.length>0;
 const found=ready?currentLine(lines,position,active):null,text=found?.line.text.trim()||'';
 const element=useRef(null);
 const fit=()=>{const node=element.current;if(!node)return;node.style.setProperty('--lyric-fit','1');const overflow=node.scrollWidth-node.clientWidth;if(overflow>0)node.style.setProperty('--lyric-fit',String(Math.max(.3,node.clientWidth/node.scrollWidth*.98)));};
 useLayoutEffect(fit,[text,mode]);
 useEffect(()=>{const node=element.current;if(!node)return undefined;const observer=new ResizeObserver(fit);observer.observe(node.parentElement);document.fonts?.ready.then(fit);return()=>observer.disconnect();},[ready,mode]);
 if(!ready||mode==='off')return null;
 return <section className={`home-synced-lyrics${mode==='stage'?' is-sr-only':''}`} aria-label={ar?'كلمات متزامنة':'Synchronized lyrics'}>
  <p ref={element} key={found?.index??-1} className={`home-synced-lyrics-current${hasArabic(text)?' is-arabic':''}`} dir="auto" aria-live="polite">{text||'♪'}</p>
 </section>;
}
