import {useEffect,useState} from 'react';
import {Box,Upload} from 'lucide-react';
import {apiBaseUrl,apiRequest} from '../lib/api';
import GeneratedModelViewer from './GeneratedModelViewer';
const root='/admin/equipment-3d';
export default function Equipment3DGenerator({token,name,value,onChange,onBusyChange}){
 const [config,setConfig]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[local,setLocal]=useState('');
 useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false);},[busy,onBusyChange]);
 useEffect(()=>{apiRequest(root+'/config',{token}).then(setConfig).catch(e=>setError(e.status===404?'Deploy the backend update to enable 3D uploads.':e.message));},[token]);
 useEffect(()=>()=>{if(local)URL.revokeObjectURL(local);},[local]);
 const maxMB=config?.maxMB||25;
 const choose=async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  setError('');setNotice('');
  if(!/\.glb$/i.test(file.name)||file.size>maxMB*1024*1024){setError('Choose a .glb file under '+maxMB+' MB.');return;}
  setBusy(true);
  try{
   const body=new FormData();body.append('model',file);
   const response=await fetch(apiBaseUrl+root+'/upload',{method:'POST',headers:{Authorization:'Bearer '+token},body,signal:AbortSignal.timeout(120000)});
   const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.message||'The upload failed.');
   setLocal(URL.createObjectURL(file));onChange({modelJobId:data.item.id,modelUrl:data.item.modelUrl});setNotice('Model uploaded. Save equipment to publish it.');
  }catch(e){setError(e.name==='TimeoutError'?'Upload timed out. Try again.':e.message);}finally{setBusy(false);}
 };
 const preview=local||value.modelUrl;
 return <section className="equipment-ai-builder" aria-label="3D equipment model"><header><Box size={18}/><div><h4>3D model</h4><small>Upload a .glb file · up to {maxMB} MB</small></div></header>
  {config&&!config.storageConfigured&&<p className="equipment-ai-message">Model storage is not configured on the backend.</p>}
  <label className="equipment-glb-drop"><Upload size={28} strokeWidth={1.4}/><b>{value.modelUrl?'Replace 3D model':'Upload 3D model'}</b><small>Click to choose a .glb file</small><input type="file" accept=".glb,model/gltf-binary" disabled={busy||(config&&!config.storageConfigured)} onChange={choose}/></label>
  {busy&&<p role="status">Uploading…</p>}
  {preview&&<GeneratedModelViewer key={preview} src={preview} name={name||'Equipment'}/>}
  {value.modelUrl&&<button type="button" disabled={busy} onClick={()=>{onChange({modelJobId:null,modelUrl:''});setLocal('');setNotice('Model removed from this draft. Save equipment to apply.');}}>Remove model</button>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="equipment-ai-error">{error}</p>}
 </section>;
}
