import {useEffect,useState} from 'react';
import {Clapperboard,FileText,Download,Music2} from 'lucide-react';
import {fetchOntologyRecordings} from '../lib/musicOntology';
import {POSTING_PLATFORMS,postingGoalId,customPostingGoal} from '../lib/postingFormats';
import AudioVisualStudio from './AudioVisualStudio';
import VideoEditorAdmin from './VideoEditorAdmin';
import './postingStudio.css';

const TOOLS=[['video','Video editor',Clapperboard],['audio','Audio + photo/video',Music2],['copy','Post copy',FileText]];
const readSaved=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
export default function PostingStudio({token,search=''}){
 const query=new URLSearchParams(search),requested=query.get('tool');
 const [tool,setTool]=useState(TOOLS.some(([id])=>id===requested)?requested:'video');
 const [platform,setPlatform]=useState('instagram'),[typeId,setTypeId]=useState('reel'),[aspect,setAspect]=useState('9:16'),[custom,setCustom]=useState(null);
 const [items,setItems]=useState([]);
 const [exporting,setExporting]=useState(false);
 const [copy,setCopy]=useState(()=>readSaved('echo-posting-copy:v1')||{title:'',caption:'',tags:''});
 // The recordings the audio tool can use as a source (the Social cards tool moved to the Android admin app).
 useEffect(()=>{let alive=true;fetchOntologyRecordings({},{token}).then(records=>{if(alive)setItems(records);}).catch(()=>{});return()=>{alive=false;};},[token]);
 useEffect(()=>{try{localStorage.setItem('echo-posting-copy:v1',JSON.stringify(copy));}catch{/* Drafting still works without storage. */}},[copy]);
 const types=POSTING_PLATFORMS[platform].types.filter(type=>type.kind==='video'),type=types.find(row=>row.id===typeId)||types[0],ratio=type.ratios.includes(aspect)?aspect:type.ratios[0];
 const goal=custom?customPostingGoal(custom.w,custom.h)?.[0]:postingGoalId(platform,type.id,ratio);
 const chooseTool=id=>{setTool(id);const url=new URL(window.location.href);if(url.pathname==='/admin/echo')url.searchParams.set('tab','posting-studio');else url.searchParams.delete('tab');url.searchParams.set('tool',id);window.history.replaceState({},'',url);};
 const downloadCopy=()=>{const text=[copy.title,copy.caption,copy.tags].filter(Boolean).join('\n\n'),url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`${platform}-post.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <section className="posting-studio" aria-label="Posting studio">
  <nav className="posting-tools" aria-label="Posting tools">{TOOLS.map(([id,label,Icon])=><button key={id} type="button" aria-pressed={tool===id} disabled={exporting} onClick={()=>chooseTool(id)}><Icon size={17}/>{label}</button>)}</nav>
  {tool==='video'&&<><div className="posting-format-controls"><label>Platform<select value={platform} onChange={event=>{setPlatform(event.target.value);setCustom(null);}}>{Object.entries(POSTING_PLATFORMS).map(([id,row])=><option key={id} value={id}>{row.label}</option>)}</select></label><label>Post type<select value={type.id} onChange={event=>{setTypeId(event.target.value);setCustom(null);}}>{types.map(row=><option key={row.id} value={row.id}>{row.label}</option>)}</select></label><label>Aspect ratio<select value={custom?'custom':ratio} onChange={event=>event.target.value==='custom'?setCustom({w:1080,h:1920}):(setAspect(event.target.value),setCustom(null))}>{type.ratios.map(key=><option key={key} value={key}>{key}</option>)}<option value="custom">Custom</option></select></label>{custom&&['w','h'].map(key=><label key={key}>{key==='w'?'Width':'Height'}<input type="number" min="320" max="3840" value={custom[key]} onChange={event=>setCustom(current=>({...current,[key]:Number(event.target.value)}))}/></label>)}</div>{custom&&!goal&&<p role="alert">Use dimensions from 320 to 3840 pixels and an aspect ratio between 1:4 and 4:1.</p>}{platform==='youtube'&&type.id==='video'&&ratio!=='16:9'&&<p className="posting-hint">YouTube classifies square or vertical videos up to three minutes as Shorts.</p>}<p className="posting-hint">Choose a recording and open Edit video to trim and render in this format.</p>{platform==='echo'&&<p className="posting-hint">Echo Reels use portrait 9:16 video. Render the clip, then use Publish to Echo Reels on the finished render below. Other platforms and unpublished renders stay out of the Music page.</p>}<div className="posting-video"><VideoEditorAdmin token={token} search={search} initialGoal={goal||''}/></div></>}
  <div className="posting-audio-workspace" hidden={tool!=='audio'}><AudioVisualStudio token={token} recordings={items} onBusyChange={setExporting}/></div>
  {tool==='copy'&&<div className="posting-copy"><label>Platform<select value={platform} onChange={event=>setPlatform(event.target.value)}>{Object.entries(POSTING_PLATFORMS).map(([id,row])=><option key={id} value={id}>{row.label}</option>)}</select></label><label>Title<input maxLength={200} value={copy.title} onChange={event=>setCopy(current=>({...current,title:event.target.value}))}/></label><label>Caption / description / text post<textarea rows="8" value={copy.caption} onChange={event=>setCopy(current=>({...current,caption:event.target.value}))}/></label><label>Hashtags<input value={copy.tags} onChange={event=>setCopy(current=>({...current,tags:event.target.value}))}/></label><small>{copy.caption.length} characters · Draft saved in this browser</small><button type="button" disabled={!copy.title&&!copy.caption&&!copy.tags} onClick={downloadCopy}><Download size={16}/>Download post copy</button></div>}
 </section>;
}
