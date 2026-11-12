// Automation Recording Addition: the one process that fills a new recording's facts from its audio.
// Every automatic step (tempo, key, name and type) registers here instead of starting itself.
// Steps run ONE AT A TIME, cheapest first, each at most once per audio file, with a pause between them so the page stays responsive.
// ponytail: single global queue (one admin editor at a time); move the Whisper steps to a Web Worker if they still feel heavy.
export const STEPS=[{id:'bpm',label:'Tempo'},{id:'key',label:'Key'},{id:'info',label:'Name and type'}];
const rank=id=>STEPS.findIndex(step=>step.id===id);
const done=new Set(),pending=new Map(),listeners=new Set();
let running=null,current='';
const snapshot=()=>({running:running?.step||'',waiting:[...pending.values()].map(item=>item.step),finished:[...done].filter(key=>key.startsWith(`${current}|`)).map(key=>key.split('|')[1])});
let state=snapshot();
const emit=()=>{state=snapshot();listeners.forEach(listener=>listener());};
export const subscribeAutomation=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
export const getAutomation=()=>state;
async function pump(){
 if(running||!pending.size)return;
 const [key,item]=[...pending.entries()].sort((a,b)=>rank(a[1].step)-rank(b[1].step))[0];
 pending.delete(key);running=item;emit();
 try{if(item.audioUrl===current)await item.run();}catch{/* each step shows its own error */}
 done.add(key);running=null;emit();
 await new Promise(resolve=>setTimeout(resolve,300)); // let the page breathe before the next step
 pump();
}
// run: the step's own function (returns a promise). Ignored when this step already ran for this audio, or is queued.
export function automate(audioUrl,step,run,scope='all'){
 const key=`${audioUrl}|${step}|${scope}`;
 if(!audioUrl||done.has(key)||pending.has(key)||running?.key===key)return;
 if(audioUrl!==current){current=audioUrl;for(const [id,item] of pending)if(item.audioUrl!==audioUrl)pending.delete(id);}
 pending.set(key,{audioUrl,step,run,key});emit();pump();
}
