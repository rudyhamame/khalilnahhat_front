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
 return <section id="admin-live-stream" className="admin-panel admin-live-stream-panel studio-launcher" aria-label="Live studio" style={{display:'grid',gap:14,maxWidth:560,padding:24}}>
  <h2 style={{margin:0,display:'flex',alignItems:'center',gap:8}}><Radio size={18} aria-hidden="true"/>Live Studio</h2>
  <p style={{margin:0,opacity:.75,lineHeight:1.5}}>{onAir?`On air${liveStream?.title?`: ${liveStream.title}`:''}. The broadcast runs in the Studio window, so you can refresh or leave this page freely.`:'The broadcast runs in its own window, so refreshing or leaving this dashboard never interrupts your live.'}</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
   <button type="button" className="admin-live-fullscreen studio-go-live" onClick={openStudioWindow}><ExternalLink size={16} aria-hidden="true"/><span>{onAir?'Open Studio window':'Open Live Studio'}</span></button>
   {onAir&&<button type="button" className="admin-live-fullscreen studio-go-live is-live" disabled={busy} onClick={end}><Square size={16} fill="currentColor" aria-hidden="true"/><span>{busy?'Ending…':'End live'}</span></button>}
  </div>
 </section>;
}
