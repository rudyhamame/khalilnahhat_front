import {useSyncExternalStore} from 'react';
import {STEPS,subscribeAutomation,getAutomation} from '../lib/recordingAutomation';

// Shows the "Automation Recording Addition" progress: each step is waiting, running or done.
export default function AutomationStatus({audioUrl}){
 const {running,waiting,finished}=useSyncExternalStore(subscribeAutomation,getAutomation);
 if(!audioUrl||(!running&&!waiting.length&&!finished.length))return null;
 const mark=id=>id===running?'…':finished.includes(id)?'✓':waiting.includes(id)?'·':'';
 return <p className="automation-status" role="status"><strong>Automation Recording Addition: </strong>{STEPS.map(step=>`${step.label} ${mark(step.id)}`.trim()).join(' · ')}</p>;
}
