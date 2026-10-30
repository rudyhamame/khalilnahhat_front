import {useEffect,useLayoutEffect,useRef,useState} from 'react';

// [family, size multiplier, font-style]. One is picked at random per lyric line.
const LATIN_FONTS=[['Great Vibes',1.3],['Dancing Script',1.05],['Pacifico',.88],['Playfair Display',1,'italic'],['Cinzel Decorative',.82],['Abril Fatface',.95],['Lobster',1],['Satisfy',1.15]];
const ARABIC_FONTS=[['Aref Ruqaa',1.1],['Reem Kufi',1],['Lalezar',1.05],['Amiri',1.05],['Mirza',1.05]];
// Each line is laid out straight or along a curve (weighted towards curves). Curves are single-line Latin text only.
const LAYOUTS=['straight','arc-up','arc-down','wave','arc-up','arc-down','wave'];
export const hasArabic=text=>/[؀-ۿ]/.test(text);
export const currentLine=(lines,position,active)=>{const i=active?lines.findLastIndex(line=>position>=line.start&&position<line.end):-1;return i<0?null:{index:i,line:lines[i]};};

// Path (in stage pixels) the text follows, plus its approximate length for sizing.
function curve(layout,w,h){
 const x0=w*.06,x1=w*.94,mid=w/2;
 if(layout==='arc-up')return {d:`M${x0},${h*.68} Q${mid},${h*.02} ${x1},${h*.68}`,length:(x1-x0)*1.12};
 if(layout==='arc-down')return {d:`M${x0},${h*.32} Q${mid},${h*.98} ${x1},${h*.32}`,length:(x1-x0)*1.12};
 return {d:`M${x0},${h*.5} C${w*.28},${h*.12} ${w*.42},${h*.12} ${mid},${h*.5} S${w*.72},${h*.88} ${x1},${h*.5}`,length:(x1-x0)*1.2};
}

// Draws the current lyric across the whole player: a random display font and layout per line, words appearing in step with the song.
export default function LyricsStage({timing,position,active}){
 const box=useRef(null),textRef=useRef(null),pathRef=useRef(null),lineRef=useRef(null),passes=useRef(0),picks=useRef(new Map()),previous=useRef('');
 const [size,setSize]=useState({w:0,h:0}),[fit,setFit]=useState({key:'',fs:0,done:false});
 useEffect(()=>{const element=box.current;if(!element)return undefined;const observer=new ResizeObserver(([entry])=>setSize({w:entry.contentRect.width,h:entry.contentRect.height}));observer.observe(element);return()=>observer.disconnect();},[]);
 const found=currentLine(timing.lines,position,active),text=found?.line.text.trim()||'',words=text.split(/\s+/).filter(Boolean);
 let pick=null;
 if(found&&words.length){
  if(!picks.current.has(found.index)){
   const arabic=hasArabic(text),set=arabic?ARABIC_FONTS:LATIN_FONTS,choices=set.filter(([family])=>family!==previous.current),font=choices[Math.floor(Math.random()*choices.length)];
   const curvedOk=!arabic&&words.length<=9&&text.length<=52;
   picks.current.set(found.index,{font,layout:curvedOk?LAYOUTS[Math.floor(Math.random()*LAYOUTS.length)]:'straight'});previous.current=font[0];
   if(picks.current.size>200)picks.current.delete(picks.current.keys().next().value);
  }
  pick=picks.current.get(found.index);
 }
 const curved=Boolean(pick&&pick.layout!=='straight'&&size.w>0),key=pick?`${found.index}|${pick.layout}|${size.w}|${size.h}`:'';
 const analytic=pick&&!curved&&size.w>0?(()=>{const longest=Math.max(...words.map(word=>word.length));return Math.max(22,Math.min(200,Math.min(Math.sqrt(.4*size.w*size.h/(.62*Math.max(text.length,1))),size.w*.85/(Math.max(longest,1)*.58))*pick.font[1]));})():100;
 const fs=fit.key===key?fit.fs:analytic;
 // Measure the real text and shrink/grow it until it sits inside the stage (script fonts overhang their advance widths).
 useLayoutEffect(()=>{
  if(!pick||!size.w)return;
  if(fit.key!==key){passes.current=0;setFit({key,fs:analytic,done:false});return;}
  if(fit.done)return;
  const {w,h}=size;let factor=1;
  if(curved){
   const text=textRef.current,path=pathRef.current;if(!text||!path)return;
   const natural=text.getComputedTextLength(),bbox=text.getBBox();if(!(natural>0)||!(bbox.width>0))return;
   factor=Math.min(path.getTotalLength()*.86/natural,w*.94/bbox.width,h*.94/bbox.height);
   if(bbox.x<w*.03||bbox.x+bbox.width>w*.97||bbox.y<h*.03||bbox.y+bbox.height>h*.97)factor=Math.min(factor,.92);
  }else{
   const element=lineRef.current;if(!element)return;
   const width=Math.max(...[...element.children].map(child=>child.offsetLeft+child.offsetWidth))-Math.min(...[...element.children].map(child=>child.offsetLeft)),rect=element.getBoundingClientRect();
   factor=Math.min(1,w*.9/Math.max(width,1),h*.9/Math.max(rect.height,1));
  }
  passes.current++;
  if((factor>.97&&factor<1.03)||passes.current>8)setFit({key,fs:fit.fs,done:true});
  else setFit({key,fs:Math.max(14,Math.min(220,fit.fs*factor)),done:false});
 },[key,fit,size.w,size.h]);
 useEffect(()=>{const fonts=document.fonts;if(!fonts?.addEventListener)return undefined;const again=()=>{passes.current=0;setFit(value=>({...value,done:false}));};fonts.addEventListener('loadingdone',again);return()=>fonts.removeEventListener('loadingdone',again);},[]);
 let line=null;
 if(pick){
  const {w,h}=size,{font,layout}=pick,duration=Math.max(.4,found.line.end-found.line.start),ready=fit.key===key&&fit.done;
  const progress=Math.min(1,Math.max(0,(position-found.line.start)/(duration*.75))),shown=Math.ceil(progress*words.length);
  if(curved){
   const {d}=curve(layout,w,h),pathId=`lyric-path-${found.index}`;
   line=<svg key={found.index} className={`home-lyrics-stage-curve is-${layout}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{opacity:ready?1:0}}><defs><path ref={pathRef} id={pathId} d={d}/></defs><text ref={textRef} style={{fontFamily:`'${font[0]}',serif`,fontStyle:font[2]||'normal',fontSize:fs}} textAnchor="middle"><textPath href={`#${pathId}`} startOffset="50%">{words.map((word,i)=><tspan key={i} className={i<shown?'is-on':undefined}>{word}{i<words.length-1?' ':''}</tspan>)}</textPath></text></svg>;
  }else{
   line=<p key={found.index} ref={lineRef} dir="auto" className="home-lyrics-stage-line" style={{fontFamily:`'${font[0]}',serif`,fontStyle:font[2]||'normal',fontSize:fs,opacity:ready?1:0}}>{words.map((word,i)=><span key={i} className={i<shown?'is-on':undefined}>{word}</span>)}</p>;
  }
 }
 return <><div className={`home-lyrics-dim${active?' is-on':''}`} aria-hidden="true"/><div ref={box} className="home-lyrics-stage" aria-hidden="true">{line}</div></>;
}
