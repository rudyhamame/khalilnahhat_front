import {useEffect,useState} from 'react';
import {Box,Image,Type,RefreshCw,Sparkles} from 'lucide-react';
import {apiBaseUrl,apiRequest} from '../lib/api';
import GeneratedModelViewer from './GeneratedModelViewer';
const root='/admin/equipment-3d';
const running=status=>['SUBMITTING','PENDING','IN_PROGRESS'].includes(status);
export default function Equipment3DGenerator({token,name,value,onChange,onBusyChange}){
 const [config,setConfig]=useState(null),[mode,setMode]=useState('photo'),[prompt,setPrompt]=useState(''),[file,setFile]=useState(null),[photo,setPhoto]=useState('');
 const [job,setJob]=useState(null),[recent,setRecent]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false);},[busy,onBusyChange]);
 const list=()=>apiRequest(root+'/jobs',{token}).then(data=>setRecent(data.items||[]));
 useEffect(()=>{let alive=true;Promise.all([apiRequest(root+'/config',{token}),apiRequest(root+'/jobs',{token})]).then(([config,data])=>{if(alive){setConfig(config);setRecent(data.items||[]);}}).catch(e=>{if(alive)setError(e.status===404?'Deploy the Meshy backend update to enable 3D generation.':e.message);});return()=>{alive=false;};},[token]);
 useEffect(()=>{if(!file){setPhoto('');return;}const url=URL.createObjectURL(file);setPhoto(url);return()=>URL.revokeObjectURL(url);},[file]);
 useEffect(()=>{
  if(!job?.id||!running(job.status))return;
  let alive=true,timer;const controller=new AbortController(),started=Date.now();
  const poll=async()=>{try{const data=await apiRequest(root+'/jobs/'+job.id,{token,signal:controller.signal});if(alive){setJob(data.item);if(running(data.item.status)&&Date.now()-started<30*60*1000)timer=setTimeout(poll,5000);else if(running(data.item.status))setError('Generation is taking longer than usual. Use Refresh status to check again.');}}catch(e){if(alive){setError(e.message);timer=setTimeout(poll,15000);}}};
  timer=setTimeout(poll,5000);return()=>{alive=false;controller.abort();clearTimeout(timer);};
 },[job?.id,job?.status,token]);
 const generate=async()=>{
  setBusy(true);setError('');setNotice('');
  try{
   const body=new FormData();body.append('mode',mode);body.append('requestId',crypto.randomUUID());if(mode==='text')body.append('prompt',prompt);else body.append('photo',file);
   const response=await fetch(apiBaseUrl+root+'/jobs',{method:'POST',headers:{Authorization:'Bearer '+token},body,signal:AbortSignal.timeout(60000)});
   const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.message||'The generation could not start.');
   setJob(data.item);await list();
  }catch(e){setError(e.name==='TimeoutError'?'Submission timed out. Check Recent generations before trying again.':e.message);}finally{setBusy(false);}
 };
 const action=async(type)=>{
  setBusy(true);setError('');setNotice('');
  try{const data=await apiRequest(root+'/jobs/'+job.id+(type==='refresh'?'':'/'+type),{token,method:type==='refresh'?'GET':'POST'});setJob(data.item);
   if(type==='store'){onChange({modelJobId:data.item.id,modelUrl:data.item.modelUrl});setNotice('Model selected. Save equipment to publish it.');}
   await list();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const active=busy||running(job?.status),usable=config?.configured&&config?.storageConfigured;
 const choose=event=>{const selected=event.target.files?.[0];setError('');if(!selected){setFile(null);return;}if(!['image/png','image/jpeg','image/webp'].includes(selected.type)||selected.size>8*1024*1024||!selected.size){setError('Choose a JPG, PNG or WebP photo under 8 MB.');event.target.value='';setFile(null);return;}setFile(selected);};
 const preview=job?.status==='SUCCEEDED'?job.previewUrl:value.modelUrl;
 return <section className="equipment-ai-builder" aria-label="AI 3D equipment builder"><header><Box size={18}/><div><h4>AI 3D model</h4><small>Meshy 7.1 · Photo or text → 360° model</small></div></header>
  {config&&!config.configured&&<p className="equipment-ai-message">Connect Meshy by setting MESHY_API_KEY on the backend. Your Meshy account needs API access and API credits.</p>}
  {config&&!config.storageConfigured&&<p className="equipment-ai-message">Model storage is not configured on the backend.</p>}
  <div className="equipment-ai-modes" role="group" aria-label="3D generation source">{[['photo','Photo',Image],['text','Text',Type]].map(([id,label,Icon])=><button key={id} type="button" disabled={active} aria-pressed={mode===id} onClick={()=>setMode(id)}><Icon size={14}/>{label}</button>)}</div>
  {mode==='photo'?<label>Equipment photo<input type="file" accept=".jpg,.jpeg,.png,.webp" disabled={active} onChange={choose}/><small>One clear object, fully visible · JPG, PNG or WebP · up to 8 MB</small>{photo&&<img className="equipment-ai-reference" src={photo} alt="Equipment reference"/>}</label>:<label>Describe the object<textarea maxLength={800} rows={4} disabled={active} placeholder={'Example: A black PA speaker cabinet with a metal front grille, two side handles and rear input panel. One isolated object.'} value={prompt} onChange={e=>setPrompt(e.target.value)}/><small>{prompt.length}/800 characters</small></label>}
  <p className="equipment-ai-cost">{mode==='photo'?'30 Meshy API credits · includes textures':'20 Meshy API credits · shape preview. Optional textures cost 10 more.'} <a href="https://docs.meshy.ai/en/api/pricing" target="_blank" rel="noreferrer">Pricing</a></p>
  <button type="button" className="catalog-save" disabled={!usable||active||(mode==='photo'?!file:prompt.trim().length<10)} onClick={generate}><Sparkles size={14}/>{busy?'Working…':'Generate 3D model'}</button>
  {recent.length>0&&<label>Recent generations<select disabled={busy} value={job?.id||''} onChange={e=>{const selected=recent.find(row=>row.id===e.target.value);setJob(selected||null);setError('');setNotice('');}}><option value="">Choose a generation…</option>{recent.map(row=><option key={row.id} value={row.id}>{new Date(row.createdAt).toLocaleString()} · {row.mode} · {row.status}</option>)}</select></label>}
  {job&&<div className="equipment-ai-progress"><div><span>{job.phase==='refine'?'Adding textures':job.mode==='photo'?'Photo to 3D':'Text to 3D'} · {job.status.toLowerCase().replaceAll('_',' ')}</span><button type="button" disabled={busy} onClick={()=>action('refresh')} aria-label="Refresh generation status"><RefreshCw size={13}/></button></div>{running(job.status)&&<progress max={100} value={job.progress}/>}<small>{job.credits} API credits for this generation{job.phase==='refine'?' including textures':''}</small>{job.message&&<p role="status">{job.message}</p>}</div>}
  {preview&&<GeneratedModelViewer key={preview} src={preview} name={name||'Equipment'}/>}
  {job?.status==='SUCCEEDED'&&<div className="equipment-ai-actions">{job.mode==='text'&&job.phase==='preview'&&<button type="button" disabled={busy||!usable} onClick={()=>action('texture')}>Add textures · 10 credits</button>}<button type="button" className="catalog-save" disabled={busy||job.id===value.modelJobId} onClick={()=>action('store')}>{busy?'Saving model…':job.id===value.modelJobId?'Model selected':'Use this model'}</button></div>}
  {value.modelUrl&&<button type="button" disabled={busy} onClick={()=>{onChange({modelJobId:null,modelUrl:''});setJob(null);setNotice('Model removed from this draft. Save equipment to apply.');}}>Remove selected model</button>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="equipment-ai-error">{error}</p>}
 </section>;
}
