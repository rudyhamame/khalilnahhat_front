import {useEffect,useState} from 'react';
import {Bot,MessageCircle,Phone,Save,RefreshCw,CheckCircle2,ExternalLink,FileAudio} from 'lucide-react';
import {apiRequest} from '../lib/api';
import './aiConfigurationAdmin.css';
const endpoint='/ai-booking/admin';
const money=(value,currency='USD')=>new Intl.NumberFormat('en-CA',{style:'currency',currency,maximumFractionDigits:2}).format((value||0)/100);
const rateLabels={textInput:'Text input',textCached:'Cached text input',textOutput:'Text output',audioInput:'Audio input',audioCached:'Cached audio input',audioOutput:'Audio output'};
export default function AiConfigurationAdmin({token}){
 const [data,setData]=useState(null),[draft,setDraft]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [modelSearch,setModelSearch]=useState(''),[adminModel,setAdminModel]=useState(null);
 useEffect(()=>{let alive=true;apiRequest('/admin/ai-administrator',{token}).then(result=>{if(alive)setAdminModel(result.model);}).catch(()=>{});return()=>{alive=false;};},[token]);
 const load=async()=>{setLoading(true);setError('');setMessage('');try{const result=await apiRequest(`${endpoint}/config`,{token});setData(result);setDraft(structuredClone(result.item));}catch(e){setError(e.message);}finally{setLoading(false);}};
 useEffect(()=>{let alive=true;apiRequest(`${endpoint}/config`,{token}).then(result=>{if(alive){setData(result);setDraft(structuredClone(result.item));}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[token]);
 const field=(mode,key,value)=>{setMessage('');setDraft(current=>({...current,[mode]:{...current[mode],[key]:value}}));};
 const price=(key,value)=>field('customerPricing',key,value);
 const selectModel=(mode,id)=>{const model=data.catalog.find(item=>item.id===id&&item.mode===mode);setMessage('');setDraft(current=>({...current,[mode]:{...current[mode],model:id,...(model.editableRates?{}:{providerRates:{...model.rates}})}}));};
 const setRate=(mode,key,value)=>{setMessage('');setDraft(current=>({...current,[mode]:{...current[mode],providerRates:{...current[mode].providerRates,[key]:value===''?0:Number(value)}}}));};
 const save=async event=>{event.preventDefault();setSaving(true);setError('');setMessage('');try{const result=await apiRequest(`${endpoint}/config`,{method:'PUT',token,body:draft});setDraft(result.item);setData(current=>({...current,item:result.item}));setMessage('Configuration saved. New AI requests use these settings.');}catch(e){setError(e.message);}finally{setSaving(false);}};
 const dirty=data&&draft&&JSON.stringify(data.item)!==JSON.stringify(draft);
 return <section className="echo-ai-admin">
  {loading&&<p role="status" className="eai-notice">Loading AI configuration…</p>}
  {error&&<div role="alert" className="eai-notice is-error">{error}<button type="button" onClick={load}>Reload configuration</button></div>}
  {message&&<p role="status" className="eai-notice is-success"><CheckCircle2 size={17}/>{message}</p>}
  {!loading&&draft&&<form onSubmit={save}>
   {(()=>{
    const info=mode=>{const config=draft[mode],provider=mode==='chat'?(config.provider||'openai'):'openai',model=data.catalog.find(item=>item.id===config.model&&(item.provider||'openai')===provider);return {config,provider,model,rates:model?.editableRates?config.providerRates:model?.rates||config.providerRates};};
    const chat=info('chat'),voice=info('voice'),rateKeys=[...Object.keys(rateLabels),'audioMinute'];
    const changeProvider=value=>{const next=data.catalog.find(m=>m.provider===value&&m.mode==='chat'&&(value!=='openrouter'||m.free));if(next)setDraft(current=>({...current,chat:{...current.chat,provider:value,freeOnly:true,maxOutputTokens:value==='openrouter'?4096:2400,model:next.id,providerRates:value==='alibaba'&&current.chat.provider==='alibaba'?current.chat.providerRates:{...next.rates}}}));else setError('Model catalog unavailable. Reload before selecting this provider.');};
    const modelOptions=(mode,{config,provider,model})=><>{!model&&<option value={config.model}>{config.model} · configured model</option>}{data.catalog.filter(item=>item.mode===mode&&(item.provider||'openai')===provider&&(provider!=='openrouter'||config.freeOnly===false||item.free)&&(!modelSearch||mode!=='chat'||provider!=='openrouter'||`${item.label} ${item.id}`.toLowerCase().includes(modelSearch.toLowerCase())||item.id===config.model)).map(item=><option value={item.id} key={item.id}>{item.label}{item.free?' · free':''}{item.deprecated?' · legacy':''}</option>)}</>;
    const enabledCell=(mode,config,hint)=><label className="eai-check"><input type="checkbox" checked={config.enabled} onChange={e=>field(mode,'enabled',e.target.checked)}/><span>{config.enabled?'Enabled':'Disabled'}</span><small>{hint}</small></label>;
    const notes=[];
    if(chat.provider==='openrouter')notes.push(`Chat: ${chat.config.freeOnly!==false?'free models only; paid models and paid fallback are blocked.':'paid models can incur provider charges.'}`);
    for(const [label,x] of [['Chat',chat],['Voice',voice]]){if(x.model?.deprecated)notes.push(`${label}: this model is marked deprecated by OpenAI. Select a current model when ready.`);}
    if(data.providers?.[chat.provider]&&!data.providers[chat.provider].configured)notes.push(`Add ${chat.provider==='openrouter'?'OPENROUTER_API_KEY':chat.provider==='alibaba'?'DASHSCOPE_API_KEY':'OPENAI_API_KEY'} in the Render API environment before enabling this provider.`);
    if(chat.provider==='alibaba'&&!data.providers?.alibaba?.configured)notes.push('Use a Model Studio key from the intended account. Set DASHSCOPE_BASE_URL on the API server to the matching workspace API Host followed by /compatible-mode/v1. The key must allow the selected model.');
    if(data.catalogError)notes.push(data.catalogError);
    if(draft.stt&&!data.providers?.openai?.configured)notes.push('Configure OPENAI_API_KEY on the API server to enable transcription.');
    if(!draft.stt)notes.push('Whisper is the default after deploying the speech-to-text backend update. Reload configuration after deployment.');
    const sttModel=draft.stt&&data.catalog.find(item=>item.id===draft.stt.model);
    return <>
     <h2 className="eai-table-title">Assistants</h2>
     <div className="eai-scroll"><table className="eai-table"><thead><tr><th>Service</th><th>Status</th><th>Provider</th><th>Model</th><th className="n">Requests / 10 min</th><th className="n">Max output tokens</th><th className="n">Max call (s)</th></tr></thead><tbody>
      <tr><td><strong><MessageCircle size={14}/> Chat assistant</strong><small>Text booking · validated order JSON</small></td><td>{enabledCell('chat',chat.config,'')}</td>
       <td><select aria-label="Chat provider" value={chat.provider} onChange={e=>changeProvider(e.target.value)}><option value="openai">OpenAI</option><option value="openrouter">OpenRouter</option><option value="alibaba">Alibaba Cloud (Qwen)</option></select></td>
       <td><select aria-label="Chat model" value={chat.config.model} onChange={e=>selectModel('chat',e.target.value)}>{modelOptions('chat',chat)}</select>{chat.provider==='openrouter'&&<div className="eai-inline"><label className="eai-check"><input type="checkbox" checked={chat.config.freeOnly!==false} onChange={e=>{const freeOnly=e.target.checked;setDraft(current=>({...current,chat:{...current.chat,freeOnly,...(freeOnly&&!chat.model?.free?{model:'openrouter/free',providerRates:{textInput:0,textCached:0,textOutput:0}}:{})}}));}}/><span>Free models only</span></label><input type="search" aria-label="Search models" value={modelSearch} onChange={e=>setModelSearch(e.target.value)} placeholder="Search models"/></div>}</td>
       <td className="n"><input aria-label="Chat requests per 10 minutes" required type="number" min="1" max="200" value={chat.config.requestsPer10Min} onChange={e=>field('chat','requestsPer10Min',Number(e.target.value))}/></td>
       <td className="n"><input aria-label="Chat maximum output tokens" required type="number" min="256" max="4096" value={chat.config.maxOutputTokens} onChange={e=>field('chat','maxOutputTokens',Number(e.target.value))}/></td><td className="n">—</td></tr>
      <tr><td><strong><Phone size={14}/> Voice assistant</strong><small>Live WebRTC conversations</small></td><td>{enabledCell('voice',voice.config,'')}</td><td>OpenAI</td>
       <td><select aria-label="Voice model" value={voice.config.model} onChange={e=>selectModel('voice',e.target.value)}>{modelOptions('voice',voice)}</select></td>
       <td className="n"><input aria-label="Voice requests per 10 minutes" required type="number" min="1" max="20" value={voice.config.requestsPer10Min} onChange={e=>field('voice','requestsPer10Min',Number(e.target.value))}/></td>
       <td className="n"><input aria-label="Voice maximum output tokens" required type="number" min="256" max="4096" value={voice.config.maxOutputTokens} onChange={e=>field('voice','maxOutputTokens',Number(e.target.value))}/></td>
       <td className="n"><input aria-label="Voice maximum call seconds" required type="number" min="30" max="900" value={voice.config.maxCallSeconds} onChange={e=>field('voice','maxCallSeconds',Number(e.target.value))}/><small>{Math.round(voice.config.maxCallSeconds/60*10)/10} min</small></td></tr>
      <tr><td><strong><Bot size={14}/> Echo AI Administrator</strong><small>Back-office tasks with approvals</small></td><td><span className="eai-check">{adminModel?.configured?'Enabled':adminModel?'Needs OPENAI_API_KEY':'Loading…'}</span></td><td>OpenAI</td>
       <td>{adminModel?<><code>{adminModel.model}</code><small>Follows the Chat assistant model when Chat uses OpenAI; OPENAI_ADMIN_MODEL on the API overrides it.</small></>:'—'}</td><td className="n">—</td><td className="n">3000</td><td className="n">—</td></tr>
      {draft.stt&&<tr><td><strong><FileAudio size={14}/> Speech-to-text (STT)</strong><small>Song audio or vocal track to lyrics</small></td><td>{enabledCell('stt',draft.stt,'')}</td><td>OpenAI</td>
       <td><select aria-label="Transcription model" value={draft.stt.model} onChange={e=>selectModel('stt',e.target.value)}>{data.catalog.filter(item=>item.mode==='stt').map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></td>
       <td className="n"><input aria-label="STT requests per 10 minutes" required type="number" min="1" max="20" value={draft.stt.requestsPer10Min} onChange={e=>field('stt','requestsPer10Min',Number(e.target.value))}/></td><td className="n">—</td><td className="n">—</td></tr>}
     </tbody></table></div>
     <h2 className="eai-table-title">Provider pricing <small>USD / 1M tokens · STT per audio minute</small></h2>
     <div className="eai-scroll"><table className="eai-table"><thead><tr><th>Service</th>{rateKeys.map(key=><th className="n" key={key}>{rateLabels[key]||'Audio minute'}</th>)}<th>Source</th></tr></thead><tbody>
      {[['chat','Chat',chat],['voice','Voice',voice]].map(([mode,label,x])=><tr key={mode}><td><strong>{label}</strong></td>{rateKeys.map(key=><td className="n" key={key}>{key in x.rates?<input aria-label={`${mode} ${rateLabels[key]} USD per million tokens`} readOnly={!x.model?.editableRates} type="number" min="0" step="0.0001" value={x.rates[key]} onChange={x.model?.editableRates?e=>setRate(mode,key,e.target.value):undefined}/>:'—'}</td>)}<td>{x.model?<a className="eai-source" href={x.model.source} target="_blank" rel="noreferrer">Details <ExternalLink size={12}/>{x.model.checkedOn&&<span>Checked {x.model.checkedOn}</span>}</a>:'—'}</td></tr>)}
      {draft.stt&&<tr><td><strong>STT</strong><small>5 min song ≈ US${(5*draft.stt.providerRates.audioMinute).toFixed(4)}</small></td>{rateKeys.map(key=><td className="n" key={key}>{key==='audioMinute'?<input aria-label="STT USD per audio minute" type="number" step="0.0001" readOnly value={draft.stt.providerRates.audioMinute}/>:'—'}</td>)}<td>{sttModel?<a className="eai-source" href={sttModel.source} target="_blank" rel="noreferrer">Details <ExternalLink size={12}/></a>:'—'}</td></tr>}
     </tbody></table></div>
     <p className="eai-footnote">{chat.model?.editableRates?'Alibaba rates are entered from the Model Studio price list. ':'Read-only rates come from the model catalog and are set automatically when you save. '}Rates only estimate costs; the provider bills your account at its actual rates. STT: admin tool, up to 25 MB per audio file, transcripts fill Lyrics directly, provider charges apply and no customer invoice is created.</p>
     {!!notes.length&&<ul className="eai-notes">{notes.map(note=><li key={note}>{note}</li>)}</ul>}
    </>;
   })()}
   <div className="eai-save"><span>{dirty?'Unsaved changes':`Saved revision ${draft.revision}`}</span><button type="button" disabled={saving} onClick={load}><RefreshCw size={15}/>Reload</button><button className="eai-primary" disabled={saving||(!dirty&&draft.revision>0)}><Save size={15}/>{saving?'Saving…':'Save configuration'}</button></div>
  </form>}
 </section>;
}
