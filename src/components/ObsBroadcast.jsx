import {useState} from 'react';
import {apiRequest} from '../lib/api';

// Cleanup only: new OBS connections are no longer supported.
export default function ObsBroadcast({token,item,onUpdate}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const roomName=item?.obs?.roomName;
 if(!roomName)return null;
 const disconnect=async()=>{
  setBusy(true);setError('');
  try {
   const result=await apiRequest('/live-stream/obs/end',{token,method:'POST',body:{roomName}});
   onUpdate?.(result.item);
  }catch(error){setError(error.message||'Could not disconnect the legacy connection. Please retry.');}
  finally{setBusy(false);}
 };
 return <div className="obs-controls">
  <p>OBS broadcasting has been discontinued. Disconnect this legacy session to use the browser studio or Android app.</p>
  <button type="button" className="admin-live-control" disabled={busy} onClick={disconnect}>{busy?'Disconnecting…':'Disconnect legacy OBS'}</button>
  {error&&<p role="alert">{error}</p>}
 </div>;
}
