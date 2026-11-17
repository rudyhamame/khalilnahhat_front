import {ExternalLink,Images} from 'lucide-react';

export const POSTING_STUDIO_URL='/admin/posting-studio';

// Keep one dedicated tab alive, just like the Live Studio window. Opening it
// again focuses the existing workspace instead of duplicating an export job.
export function openPostingStudioTab(search=''){
 const source=new URLSearchParams(search||window.location.search),target=new URL(POSTING_STUDIO_URL,window.location.origin);
 for(const [key,value] of source)if(key!=='tab')target.searchParams.append(key,value);
 const tab=window.open('','echo-posting-studio');
 if(!tab)return;
 let fresh=false;try{fresh=tab.location.href==='about:blank';}catch{/* An existing cross-origin tab can still be focused. */}
 if(fresh)tab.location.href=target.href;else tab.focus();
}

export default function PostingStudioLauncher({search=''}){
 return <section className="posting-studio-launcher" aria-label="Posting studio launcher">
  <div className="posting-studio-launcher-card">
   <span className="posting-studio-launcher-icon"><Images size={30} aria-hidden="true"/></span>
   <span className="posting-studio-launcher-state">Creative workspace</span>
   <h2>Posting Studio</h2>
   <p>Posting Studio runs in its own full-screen tab so video editing and exports stay open while you continue using the dashboard.</p>
   <button type="button" className="posting-studio-launcher-button" onClick={()=>openPostingStudioTab(search)}><ExternalLink size={22} aria-hidden="true"/><span>Open Posting Studio</span></button>
  </div>
 </section>;
}
