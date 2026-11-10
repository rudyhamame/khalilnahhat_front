import {useState} from 'react';
import {Radio,ExternalLink,Square} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {adminToast} from './adminToast';

export const STUDIO_URL='/admin/live-studio';
// The broadcast runs in its own window so refreshing or navigating the dashboard never interrupts it.
export function openStudioWindow(){
 // window.open('', name) returns an already-open Studio without navigating (a navigation would reload it and cut the live).
 const win=window.open('','echo-live-studio','popup=yes,width=1360,height=900');
 if(!win){adminToast('Allow pop-ups for this site to open the Live Studio window.',true);return;}
 let fresh=false;try{fresh=win.location.href==='about:blank';}catch{/* cross-origin means it already holds the studio */}
 if(fresh)win.location.href=STUDIO_URL;else win.focus();
}

export default function LiveStudioLauncher({token,liveStream,onLiveStreamChange}){
 const [busy,setBusy]=useState(false);
 const onAir=Boolean(liveStream?.isLive);
 const end=async()=>{
  if(!window.confirm('End the live stream now?'))return;
  setBusy(true);
  try{const result=await apiRequest('/live-stream/webrtc/end',{method:'POST',token,body:{roomName:liveStream?.webrtcRoomName}});onLiveStreamChange?.(result.item);}
  catch(error){adminToast(error.message||'Could not end the live.',true);}
  finally{setBusy(false);}
 };
 return <section className="studio-launcher" aria-label="Live studio">
  <div className="studio-launcher-card">
   <span className="studio-launcher-icon" data-live={onAir||undefined}><Radio size={30} aria-hidden="true"/></span>
   <span className="studio-launcher-state" data-live={onAir||undefined}>{onAir?'On air':'Offline'}</span>
   <h2>{onAir?(liveStream?.title||'Your live is on air'):'Live Studio'}</h2>
   <p>{onAir?'The broadcast runs in the Studio window, so you can refresh or leave this page freely.':'The broadcast runs in its own window, so refreshing or leaving this dashboard never interrupts your live.'}</p>
   <div className="studio-launcher-actions">
    <button type="button" className="studio-launcher-button is-primary" onClick={openStudioWindow}><ExternalLink size={22} aria-hidden="true"/><span>{onAir?'Open Studio window':'Open Live Studio'}</span></button>
    {onAir&&<button type="button" className="studio-launcher-button is-end" disabled={busy} onClick={end}><Square size={20} fill="currentColor" aria-hidden="true"/><span>{busy?'Ending…':'End live'}</span></button>}
   </div>
  </div>
 </section>;
}
