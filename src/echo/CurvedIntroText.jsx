import {useId,useLayoutEffect,useRef,useState} from 'react';

// Keep one readable phrase on the outer halo. Each word follows the audio
// clock and can seek to its own aligned start, by pointer or keyboard.
export default function CurvedIntroText({narration,cueIndex=0,activeWord=0,speaking=false,started=false,onWordSelect,language='ar'}){
 const ref=useRef(null),id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const cue=narration.cues[cueIndex];
 const [layout,setLayout]=useState({width:1000,height:600,font:28,cy:300});
 useLayoutEffect(()=>{
  const element=ref.current,context=document.createElement('canvas').getContext('2d');
  let alive=true;
  const update=()=>{
   if(!alive||!element.clientWidth||!element.clientHeight)return;
   const width=element.clientWidth,height=element.clientHeight,css=getComputedStyle(element.querySelector('svg'));
   const desired=parseFloat(css.fontSize)||28;
   context.font=`700 ${desired}px ${css.fontFamily}`;
   const available=Math.min(height*.46,width*.46)*Math.PI*.9;
   const measured=context.measureText(cue.text).width;
   const font=Math.min(desired,desired*available/Math.max(1,measured));
   const portrait=element.closest('.hero-introduction')?.querySelector('.echo-continuous-artist');
   const voucher=document.querySelector('.echo-voucher-ribbon');
   const radius=Math.min(height*.46,width*.46);
   let cy=height/2;
   if(portrait&&voucher){
    const art=portrait.getBoundingClientRect(),badge=voucher.getBoundingClientRect();
    // The portrait's shared canvas has transparent space above the crown.
    const headTop=art.top+art.height*.045;
    const middle=(badge.bottom+headTop)/2;
    const baseline=middle+font*.35-element.getBoundingClientRect().top;
    cy=radius+baseline;
   }
   setLayout({width,height,font,cy});
  };
  const observer=new ResizeObserver(update);observer.observe(element);document.fonts?.ready.then(update);update();
  return()=>{alive=false;observer.disconnect();};
 },[cue.text]);
 const {width,height,font,cy}=layout,cx=width/2,radius=Math.min(height*.46,width*.46);
 const ar=language==='ar';
 return <div ref={ref} className="echo-hero-description intro-chunk curved-intro-text hero-narration-lyrics" data-started={started||undefined} dir={ar?'rtl':'ltr'} lang={ar?'ar':'en'}>
  <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" role="group" aria-label={ar?'كلمات المقدّمة — اختاروا كلمة للانتقال إلها':'Introduction lyrics — select any word to return to it'}>
   <defs><path id={`intro-${id}`} d={`M ${cx-radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx+radius} ${cy}`}/></defs>
   <g className="hero-narration-arcs"><text direction={ar?'rtl':'ltr'} textAnchor="middle" className="is-current" style={{fontSize:font,fontWeight:700}}><textPath href={`#intro-${id}`} startOffset="50%">{narration.words.slice(cue.from,cue.to).map((word,index)=>{
    const absoluteIndex=cue.from+index;
    return <tspan key={absoluteIndex} role="button" tabIndex={0} aria-label={ar?`اسمعوا من كلمة ${word.text}`:`Listen from ${word.text}`} aria-current={started&&absoluteIndex===activeWord?'true':undefined} onClick={()=>onWordSelect?.(word.start)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onWordSelect?.(word.start);}}} className={started&&speaking&&absoluteIndex===activeWord?'is-spoken':started&&absoluteIndex<activeWord?'was-spoken':undefined}>{word.text}{index<cue.to-cue.from-1?' ':''}</tspan>;
   })}</textPath></text></g>
  </svg>
 </div>;
}
