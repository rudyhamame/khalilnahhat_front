import {useEffect,useState} from 'react';
import {Instagram,RefreshCw,Save,Unplug,ExternalLink} from 'lucide-react';
import {apiRequest} from '../lib/api';
import InstagramProfileCard from './InstagramProfileCard';
import './instagramAdmin.css';

const defaults={enabled:true,caption:'Arabic & multicultural celebrations.\nToronto & the Greater Toronto Area.',website:'https://www.djkhalilnahhat.ca'};
export default function InstagramAdmin({token}){
 const [saved,setSaved]=useState(null),[draft,setDraft]=useState(defaults),[accessToken,setAccessToken]=useState(''),[busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const apply=item=>{setSaved(item);setDraft({enabled:item.enabled,caption:item.caption||defaults.caption,website:item.website||''});};
 useEffect(()=>{let alive=true;apiRequest('/admin/instagram',{token}).then(({item})=>{if(alive)apply(item);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setBusy(false);});return()=>{alive=false;};},[token]);
 const change=(key,value)=>{setDraft(d=>({...d,[key]:value}));setNotice('');};
 const run=async(action)=>{setBusy(true);setError('');setNotice('');try{await action();}catch(e){if(!e.cancelled)setError(e.message);}finally{setBusy(false);}};
 const save=event=>{event.preventDefault();run(async()=>{const {item}=await apiRequest('/admin/instagram',{method:'PUT',token,body:{...draft,...(accessToken.trim()?{accessToken:accessToken.trim()}:{})}});apply(item);setAccessToken('');setNotice(item.enabled?'Instagram connected. The About page shows the saved card.':'Settings saved. The Instagram card is hidden from About.');});};
 const refresh=()=>run(async()=>{const {item}=await apiRequest('/admin/instagram/refresh',{method:'POST',token});apply(item);setNotice('Instagram figures updated.');});
 const disconnect=()=>run(async()=>{const {item}=await apiRequest('/admin/instagram',{method:'DELETE',token,deleteMessage:'Disconnect Instagram and remove its saved access token? The Instagram card will be hidden from About.'});apply(item);setAccessToken('');setNotice('Instagram disconnected. The saved token has been removed.');});
 return <section className="instagram-admin">
  <header><div><h1><Instagram size={22}/>Instagram</h1><p>Connect your account and show its real figures on About.</p></div>{saved?.connected&&<button type="button" onClick={refresh} disabled={busy}><RefreshCw size={15}/>Refresh figures</button>}</header>
  {error&&<p className="ig-admin-error" role="alert">{error}</p>}{notice&&<p className="ig-admin-notice" role="status">{notice}</p>}
  {saved?.error&&<p className="ig-admin-error" role="alert">{saved.error} The last successful figures stay on the card until the connection is restored.</p>}
  <div className="ig-admin-layout"><form onSubmit={save}>
   <fieldset disabled={busy||!saved}><legend>Account connection</legend>
    <span className={`ig-admin-status${saved?.connected?' is-connected':''}`}>{saved?.connected?`Connected · @${saved.profile?.username||'Instagram'}`:'Not connected'}</span>
    <label>Instagram access token<input type="password" name="instagramAccessToken" value={accessToken} onChange={e=>setAccessToken(e.target.value)} autoComplete="new-password" spellCheck={false} maxLength={4096} placeholder={saved?.connected?'Saved privately · enter a token only to replace it':'Paste the token generated in Meta’s app dashboard'} required={!saved?.connected}/></label>
    <p className="ig-admin-hint">Use a Business or Creator account. In your Meta app, open Instagram → API setup with Instagram business login → Generate token. Grant profile access (instagram_business_basic). Enter the long-lived access token here, rather than your Instagram password.</p>
    <a className="ig-admin-docs" href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">Open Meta app dashboard<ExternalLink size={13}/></a>
    {saved&&!saved.encryptionConfigured&&<p className="ig-admin-error">Server setup needed: configure ECHO_INSTAGRAM_ENCRYPTION_KEY or SESSION_ENCRYPTION_KEY before saving a token.</p>}
    <label className="ig-admin-check"><input type="checkbox" checked={draft.enabled} onChange={e=>change('enabled',e.target.checked)}/>Show Instagram card on About</label>
    <label>Card bio<textarea rows={3} maxLength={300} value={draft.caption} onChange={e=>change('caption',e.target.value)}/></label>
    <label>Website link<input type="url" value={draft.website} onChange={e=>change('website',e.target.value)} placeholder="https://your-website.com"/></label>
    <div className="ig-admin-buttons"><button type="submit" disabled={busy||!saved?.encryptionConfigured}><Save size={15}/>{busy?'Working…':saved?.connected?'Save settings':'Connect Instagram'}</button>{saved?.connected&&<button type="button" onClick={disconnect} disabled={busy}><Unplug size={15}/>Disconnect</button>}</div>
   </fieldset>
  </form><aside className="ig-admin-preview"><h2>About page preview</h2><InstagramProfileCard item={{...saved,...draft,enabled:true}}/>
   <p>Profile photo, name and counts come from Instagram. The bio and website use the fields here. Figures refresh when the card is visited, at most every 15 minutes. Until you connect, counts appear as —.</p>
   {saved?.syncedAt&&<p>Last synced: {new Date(saved.syncedAt).toLocaleString()}</p>}
   {saved?.expiresAt&&<p>Token valid until: {new Date(saved.expiresAt).toLocaleString()}</p>}
   <p>The access token is encrypted on the server and is never included in the public card. Long-lived tokens are renewed automatically when eligible; reconnect here if Instagram revokes access.</p>
   <a href="/about" target="_blank" rel="noopener noreferrer">View About page<ExternalLink size={13}/></a>
  </aside></div>
 </section>;
}
