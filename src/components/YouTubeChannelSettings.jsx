import {useEffect,useState} from 'react';
import {ExternalLink,RefreshCw,Save,Unplug} from 'lucide-react';
import {apiRequest} from '../lib/api';
import YouTubeSubscribe from '../echo/YouTubeSubscribe';
import './youtubeChannelSettings.css';

// Admin > YouTube: the channel behind the public Subscribe button, plus an optional YouTube Data API key (a secret, stored
// encrypted on the server and never shown again) used to show the channel's name, picture and subscriber count.
// Passwords are never asked for: signing in to Google/YouTube happens in YouTube's own pages, never in this form.
// A server without the channel routes answers "Route not found": say what to do instead of showing the raw error.
const explain=e=>/route not found/i.test(e?.message||'')?'This server does not have the YouTube channel feature yet. Deploy the latest back end (khalil-back), then reload this page.':e.message;
const defaults={channel:'@djkhalilnahhat8943',enabled:true};
export default function YouTubeChannelSettings({token}){
 const [saved,setSaved]=useState(null),[draft,setDraft]=useState(defaults),[apiKey,setApiKey]=useState(''),[removeKey,setRemoveKey]=useState(false);
 const [busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const apply=item=>{setSaved(item);setDraft({channel:item.handle?`@${item.handle}`:item.channelId||defaults.channel,enabled:item.enabled});setRemoveKey(false);};
 useEffect(()=>{
  let alive=true;
  apiRequest('/admin/youtube-channel',{token}).then(({item})=>{if(alive)apply(item);}).catch(e=>{if(alive)setError(explain(e));}).finally(()=>{if(alive)setBusy(false);});
  return()=>{alive=false;};
 },[token]);
 const change=(key,value)=>{setDraft(d=>({...d,[key]:value}));setNotice('');};
 const run=async action=>{setBusy(true);setError('');setNotice('');try{await action();}catch(e){if(!e.cancelled)setError(explain(e));}finally{setBusy(false);}};
 const save=event=>{event.preventDefault();run(async()=>{
  const {item}=await apiRequest('/admin/youtube-channel',{method:'PUT',token,body:{...draft,...(apiKey.trim()?{apiKey:apiKey.trim()}:{}),...(removeKey?{removeApiKey:true}:{})}});
  apply(item);setApiKey('');setNotice('YouTube channel saved.');
 });};
 const refresh=()=>run(async()=>{const {item}=await apiRequest('/admin/youtube-channel/refresh',{method:'POST',token});apply(item);setNotice('Channel figures updated.');});
 const disconnect=()=>run(async()=>{const {item}=await apiRequest('/admin/youtube-channel',{method:'DELETE',token,deleteMessage:'Remove the saved channel and API key? The Subscribe button falls back to the default channel.'});apply(item);setApiKey('');setNotice('YouTube channel removed.');});
 const preview={...(saved||{}),configured:Boolean(saved?.configured||draft.channel),enabled:true,url:saved?.url||''};
 return <section className="yt-admin" aria-label="YouTube channel for the Subscribe button" aria-busy={busy}>
  <header><div><h3>Subscribe button channel</h3><p>The channel people subscribe to from About and other pages, in English and Arabic.</p></div>
   {saved?.hasApiKey&&<button type="button" onClick={refresh} disabled={busy}><RefreshCw size={15} aria-hidden="true"/>Refresh figures</button>}</header>
  {error&&<p className="yt-admin-error" role="alert">{error}</p>}{notice&&<p className="yt-admin-notice" role="status">{notice}</p>}
  {saved?.error&&<p className="yt-admin-error" role="alert">{saved.error} The last successful figures stay on the button until this is fixed.</p>}
  <div className="yt-admin-layout">
   <form onSubmit={save}>
    <fieldset disabled={busy||!saved}>
     <legend>Channel and API key</legend>
     <span className={`yt-admin-status${saved?.configured?' is-connected':''}`}>{saved?.configured?`Saved · ${saved.title||saved.handle&&`@${saved.handle}`||saved.channelId}`:'Not saved yet · the default public channel is used'}</span>
     <label>YouTube channel<input type="text" name="youtubeChannel" value={draft.channel} onChange={e=>change('channel',e.target.value)} maxLength={300} spellCheck={false} dir="ltr" placeholder="@yourhandle or https://www.youtube.com/@yourhandle" required/></label>
     <label>YouTube Data API key (optional)<input type="password" name="youtubeApiKey" value={apiKey} onChange={e=>{setApiKey(e.target.value);setNotice('');}} autoComplete="new-password" spellCheck={false} maxLength={200} dir="ltr" placeholder={saved?.hasApiKey?'Saved · enter a new key to replace it':'AIza…'}/></label>
     <p className="yt-admin-hint">Without a key the button still works. With one, the channel’s name, picture and subscriber count are shown. Create the key in Google Cloud Console → APIs &amp; Services → enable “YouTube Data API v3” → Credentials → API key. The key is encrypted on the server and is never shown again.</p>
     <a className="yt-admin-docs" href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer">Open YouTube Data API<ExternalLink size={13} aria-hidden="true"/></a>
     {saved&&!saved.encryptionConfigured&&<p className="yt-admin-error">Server setup needed: configure ECHO_YOUTUBE_ENCRYPTION_KEY or SESSION_ENCRYPTION_KEY before saving an API key.</p>}
     {saved?.hasApiKey&&<label className="yt-admin-check"><input type="checkbox" checked={removeKey} onChange={e=>setRemoveKey(e.target.checked)}/>Remove the saved API key when saving</label>}
     <label className="yt-admin-check"><input type="checkbox" checked={draft.enabled} onChange={e=>change('enabled',e.target.checked)}/>Show the Subscribe button on the website</label>
     <div className="yt-admin-buttons"><button type="submit" disabled={busy||(apiKey.trim()&&!saved?.encryptionConfigured)}><Save size={15} aria-hidden="true"/>{busy?'Working…':'Save channel'}</button>
      {saved?.configured&&<button type="button" onClick={disconnect} disabled={busy}><Unplug size={15} aria-hidden="true"/>Remove</button>}</div>
    </fieldset>
   </form>
   <aside className="yt-admin-preview"><h4>Website preview</h4>
    <YouTubeSubscribe item={preview}/>
    <YouTubeSubscribe ar item={preview}/>
    {saved?.syncedAt&&<p>Last synced: {new Date(saved.syncedAt).toLocaleString()}</p>}
    <p>The preview opens YouTube’s own subscribe confirmation. Figures refresh when the button is visited, at most every 15 minutes.</p>
   </aside>
  </div>
 </section>;
}
