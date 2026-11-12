import {useSyncExternalStore} from 'react';
import {Check,Circle,Loader2} from 'lucide-react';
import {STEPS,subscribeAutomation,getAutomation} from '../lib/recordingAutomation';
import './automationStatus.css';

// "Automation Recording Addition": a step tracker. Each step is waiting, running or done.
export default function AutomationStatus({audioUrl}){
 const {running,waiting,finished}=useSyncExternalStore(subscribeAutomation,getAutomation);
 if(!audioUrl||(!running&&!waiting.length&&!finished.length))return null;
 const stateOf=id=>id===running?'running':finished.includes(id)?'done':waiting.includes(id)?'waiting':'idle';
 const doneCount=STEPS.filter(step=>stateOf(step.id)==='done').length,busy=Boolean(running||waiting.length);
 return <section className="automation-status" role="status" aria-live="polite" aria-label="Automation Recording Addition">
  <header><strong>Automation Recording Addition</strong><span>{busy?`${doneCount} of ${STEPS.length} done`:'Complete'}</span></header>
  <ol>{STEPS.map(step=>{const state=stateOf(step.id);return <li key={step.id} data-state={state}>
   <span className="automation-icon" aria-hidden="true">{state==='done'?<Check size={13} strokeWidth={3}/>:state==='running'?<Loader2 size={13} strokeWidth={2.5}/>:<Circle size={9} strokeWidth={2.5}/>}</span>
   <span>{step.label}</span><small>{state==='done'?'Done':state==='running'?'Working…':state==='waiting'?'Queued':'Not needed'}</small>
  </li>;})}</ol>
  <div className="automation-meter" aria-hidden="true"><i style={{width:`${doneCount/STEPS.length*100}%`}}/></div>
 </section>;
}
