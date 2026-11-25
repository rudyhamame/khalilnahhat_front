const editable=(element,win)=>Boolean(element&&element instanceof win.HTMLElement&&(element.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName)));

export function installAccessViewport(win=window,doc=document){
 const root=doc.documentElement,viewport=win.visualViewport;
 let stable=0,frame=0,timer=0,disposed=false,needsReveal=false;
 const reveal=()=>{
  const input=doc.activeElement;if(!editable(input,win)||!root.hasAttribute('data-access-editing'))return;
  const field=input.closest('.access-field')||input;
  const rect=field.getBoundingClientRect(),top=(viewport?.offsetTop||0)+12,bottom=(viewport?.offsetTop||0)+(viewport?.height||win.innerHeight)-20;
  const offset=(from,to)=>rect.bottom>to?rect.bottom-to:rect.top<from?rect.top-from:0;
  // The access page owns keyboard scrolling; the character scene stays put.
  let node=input.parentElement;
  while(node&&node!==root){
   const style=win.getComputedStyle(node);
   if(/auto|scroll/.test(style.overflowY)&&node.scrollHeight>node.clientHeight){
    const bounds=node.getBoundingClientRect?.(),delta=offset(Math.max(top,bounds?bounds.top+12:top),Math.min(bottom,bounds?bounds.bottom-12:bottom));
    if(Math.abs(delta)>=1)node.scrollTop+=delta/(parseFloat(win.getComputedStyle(root).zoom)||1);
    return;
   }
   node=node.parentElement;
  }
  if(Math.abs(offset(top,bottom))>=1)input.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
 };
 const measure=()=>{
  frame=0;if(disposed||viewport&&Math.abs(viewport.scale-1)>.01)return;
  const zoom=parseFloat(win.getComputedStyle(root).zoom)||1;
  const height=Math.min(win.innerHeight,viewport?.height||win.innerHeight);
  const editing=editable(doc.activeElement,win);
  // Freeze the baseline throughout the keyboard animation; updating it at each
  // small resize would hide the accumulated keyboard height change.
  if(!stable||height>stable||!editing&&height>=stable-120)stable=height;
  const keyboard=editing&&height<stable-120;
  root.style.setProperty('--echo-access-height',`${stable/zoom}px`);
  root.style.setProperty('--echo-access-visible-height',`${height/zoom}px`);
  root.style.setProperty('--echo-kb-lift','0px');
  root.style.setProperty('--echo-access-keyboard-inset',`${Math.max(0,stable-height)/zoom}px`);
  root.toggleAttribute('data-access-editing',editing);
  root.toggleAttribute('data-access-keyboard',keyboard);
  // CSS reflows to the visual viewport before the focused field is measured.
  if(editing&&needsReveal)reveal();
  needsReveal=false;
 };
 const queue=(revealInput=true)=>{needsReveal ||= Boolean(revealInput);if(!disposed&&!frame)frame=win.requestAnimationFrame(measure);};
 const scrolled=()=>queue(false);
 const focus=()=>{queue();win.clearTimeout(timer);timer=win.setTimeout(queue,180);};
 root.classList.add('echo-access-open');measure();
 win.addEventListener('resize',queue);viewport?.addEventListener('resize',queue);viewport?.addEventListener('scroll',scrolled);
 doc.addEventListener('focusin',focus);doc.addEventListener('focusout',focus);
 return()=>{
  disposed=true;win.cancelAnimationFrame(frame);win.clearTimeout(timer);
  win.removeEventListener('resize',queue);viewport?.removeEventListener('resize',queue);viewport?.removeEventListener('scroll',scrolled);
  doc.removeEventListener('focusin',focus);doc.removeEventListener('focusout',focus);
  root.classList.remove('echo-access-open');root.removeAttribute('data-access-keyboard');root.removeAttribute('data-access-editing');
  for(const name of ['--echo-access-height','--echo-access-visible-height','--echo-access-keyboard-inset','--echo-kb-lift'])root.style.removeProperty(name);
 };
}
