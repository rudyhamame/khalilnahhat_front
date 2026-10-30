import {useState} from 'react';
import AdminSelect from './AdminSelect';
import {setLiveStreamGoal} from '../lib/api';
import {LIVE_GOALS,liveGoal} from '../lib/liveGoals';

// ECHO ON AIR: what the session is for. Saved as soon as it changes and shown on the public live section.
export default function LiveGoalPicker({token,goal,onChange}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const current=liveGoal(goal).id;
  const choose=async id=>{
    if(busy||id===current)return;
    setBusy(true);setError('');
    try{const result=await setLiveStreamGoal(id,token);onChange?.(result.item);}
    catch(e){setError(e.message||'Could not set the goal.');}
    finally{setBusy(false);}
  };
  return <label className="live-goal-picker">
    <span>LIVE STREAM GOAL</span>
    <AdminSelect aria-label="On-air goal" value={current} disabled={busy} onChange={event=>choose(event.target.value)}>
      {LIVE_GOALS.map(item=><option key={item.id} value={item.id}>{item.en}</option>)}
    </AdminSelect>
    {error&&<small className="live-goal-error" role="alert">{error}</small>}
  </label>;
}
