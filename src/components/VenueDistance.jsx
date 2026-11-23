import {useEffect,useState} from 'react';
import {Car} from 'lucide-react';
import {apiRequest} from '../lib/api';

// Distance from the signed-in administrator's home address to the booking's venue (set the address in the Admins tab).
export default function VenueDistance({requestId,token}){
  const [state,setState]=useState({status:'loading'});
  useEffect(()=>{
    let current=true;setState({status:'loading'});
    apiRequest(`/admin/service-requests/${encodeURIComponent(requestId)}/distance`,{token}).then(result=>{if(current)setState(result);}).catch(()=>{if(current)setState({status:'unavailable'});});
    return()=>{current=false;};
  },[requestId,token]);
  if(state.status==='loading')return <p className="venue-distance" role="status">Measuring the distance…</p>;
  if(state.status==='no-home')return <p className="venue-distance is-hint"><Car size={14} aria-hidden="true"/>Add your home address in <a href="/admin/echo?tab=admins">Admins</a> to see the distance to the venue.</p>;
  if(state.status==='venue-not-found')return <p className="venue-distance is-hint"><Car size={14} aria-hidden="true"/>The venue address could not be found on the map.</p>;
  if(state.status!=='ok')return <p className="venue-distance is-hint"><Car size={14} aria-hidden="true"/>The distance is unavailable right now.</p>;
  return <p className="venue-distance"><Car size={14} aria-hidden="true"/><strong>{state.km} km</strong>{state.minutes!=null&&<span> · about {state.minutes} min</span>}<span className="venue-distance-note">{state.driving?'by road':'straight line'} from your home</span></p>;
}
