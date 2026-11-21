import {useEffect,useState} from 'react';
import AdminSelect from './AdminSelect';
import {apiRequest,setLiveStreamGoal} from '../lib/api';
import {LIVE_GOALS} from '../lib/liveGoals';

// ECHO ON AIR: what the session is for. The goals are the admin's "Live goal" list in Work Elements; the select groups them under "Live goal". Saved as soon as it changes.
export default function LiveGoalPicker({token,goal,onChange,onPick,invalid=false}){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[options,setOptions]=useState([]);
  useEffect(()=>{let live=true;apiRequest('/music-ontology/preset/liveGoal').then(r=>live&&setOptions(r.items||[])).catch(()=>{});return()=>{live=false;};},[]);
  // Streams saved before the list existed hold an old slug; match it to the option with the same name.
  const legacy=LIVE_GOALS.find(item=>item.id===goal)?.en.toLowerCase();
  const current=goal===''?'':(options.find(item=>item.id===goal)||options.find(item=>item.value.toLowerCase()===legacy))?.id||'';
  const choose=async id=>{
    if(busy||id===current)return;
    setBusy(true);setError('');
    try{const result=await setLiveStreamGoal(id,token);onChange?.(result.item);onPick?.(id);}
    catch(e){setError(e.message||'Could not set the goal.');}
    finally{setBusy(false);}
  };
  return <label className={`live-goal-picker${invalid?' is-invalid':''}`}>
    <span>LIVE STREAM GOAL <b className="studio-required" aria-hidden="true">*</b></span>
    <AdminSelect aria-label="On-air goal (required)" aria-required="true" aria-invalid={invalid} value={current} disabled={busy} onChange={event=>choose(event.target.value)}>
      <option value="" disabled>Choose a goal…</option>
      <optgroup label="Live goal">{options.map(item=><option key={item.id} value={item.id}>{item.value}</option>)}</optgroup>
    </AdminSelect>
    {error&&<small className="live-goal-error" role="alert">{error}</small>}
  </label>;
}
