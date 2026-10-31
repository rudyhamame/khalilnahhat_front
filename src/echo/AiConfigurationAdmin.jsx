import {useEffect,useState} from 'react';
import {Bot,MessageCircle,Phone,Save,RefreshCw,CheckCircle2,ExternalLink,FileAudio} from 'lucide-react';
import {apiRequest} from '../lib/api';
import './aiConfigurationAdmin.css';
import AdministratorServicesConfig from './AdministratorServicesConfig';
const endpoint='/ai-booking/admin';
const money=(value,currency='USD')=>new Intl.NumberFormat('en-CA',{style:'currency',currency,maximumFractionDigits:2}).format((value||0)/100);
const rateLabels={textInput:'Text input',textCached:'Cached text input',textOutput:'Text output',audioInput:'Audio input',audioCached:'Cached audio input',audioOutput:'Audio output'};
export default function AiConfigurationAdmin({token}){
 const [data,setData]=useState(null),[draft,setDraft]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const load=async()=>{setLoading(true);setError('');setMessage('');try{const result=await apiRequest(`${endpoint}/config`,{token});setData(result);setDraft(structuredClone(result.item));}catch(e){setError(e.message);}finally{setLoading(false);}};
 useEffect(()=>{let alive=true;apiRequest(`${endpoint}/config`,{token}).then(result=>{if(alive){setData(result);setDraft(structuredClone(result.item));}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[token]);
 const field=(mode,key,value)=>{setMessage('');setDraft(current=>({...current,[mode]:{...current[mode],[key]:value}}));};
 const price=(key,value)=>field('customerPricing',key,value);
 const selectModel=(mode,id)=>{const model=data.catalog.find(item=>item.id===id&&item.mode===mode);if(!model){setError('That model is no longer in the catalog. Reload configuration and try again.');return;}setError('');setMessage('');setDraft(current=>({...current,[mode]:{...current[mode],...(model.provider?{provider:model.provider}:{}),model:id,...(model.editableRates?{}:{providerRates:{...(model.rates||{})}})}}));};
 const setRate=(mode,key,value)=>{setMessage('');setDraft(current=>({...current,[mode]:{...current[mode],providerRates:{...current[mode].providerRates,[key]:value===''?0:Number(value)}}}));};
 const save=async event=>{event.preventDefault();setSaving(true);setError('');setMessage('');try{const result=await apiRequest(`${endpoint}/config`,{method:'PUT',token,body:draft});setDraft(result.item);setData(current=>({...current,item:result.item}));setMessage('Configuration saved. New AI requests use these settings.');}catch(e){setError(e.message);}finally{setSaving(false);}};
 const dirty=data&&draft&&JSON.stringify(data.item)!==JSON.stringify(draft);
 return <section className="echo-ai-admin eai-wide">
  {loading&&<p role="status" className="eai-notice">Loading AI configuration…</p>}
  {error&&<div role="alert" className="eai-notice is-error">{error}<button type="button" onClick={load}>Reload configuration</button></div>}
  {message&&<p role="status" className="eai-notice is-success"><CheckCircle2 size={17}/>{message}</p>}
  {!loading&&draft&&<form onSubmit={save}>
   <div className="eai-save"><span>{dirty?'Unsaved changes':`Saved revision ${draft.revision}`}</span><button type="button" disabled={saving} onClick={load}><RefreshCw size={15}/>Reload</button><button className="eai-primary" disabled={saving||(!dirty&&draft.revision>0)}><Save size={15}/>{saving?'Saving…':'Save configuration'}</button></div>
   {(()=>{
    const info=mode=>{const config=draft[mode],provider=mode==='chat'||mode==='voice'?(config.provider||'openai'):'openai',model=data.catalog.find(item=>item.id===config.model&&(item.provider||'openai')===provider);return {config,provider,model,rates:model?.editableRates?config.providerRates:model?.rates||config.providerRates};};
    const chat=info('chat'),voice=info('voice'),rateKeys=[...Object.keys(rateLabels),'audioMinute'];
    const changeProvider=value=>{const next=data.catalog.find(m=>m.provider===value&&m.mode==='chat'&&(value!=='openrouter'||m.free));if(next)setDraft(current=>({...current,chat:{...current.chat,provider:value,freeOnly:true,maxOutputTokens:value==='openrouter'?4096:2400,model:next.id,providerRates:value==='alibaba'&&current.chat.provider==='alibaba'?current.chat.providerRates:{...next.rates}}}));else setError('Model catalog unavailable. Reload before selecting this provider.');};
    const changeVoiceProvider=value=>{const next=data.catalog.find(m=>m.mode==='voice'&&(m.provider||'openai')===value);if(next)setDraft(current=>({...current,voice:{...current.voice,provider:value,model:next.id,providerRates:{...next.rates}}}));else setError('No voice model is available for this provider. Reload and try again.');};
    const changeSttProvider=value=>{const next=data.catalog.find(m=>m.mode==='stt'&&(m.provider||'openai')===value);if(next)setDraft(current=>({...current,stt:{...current.stt,provider:value,model:next.id,providerRates:{...next.rates}}}));else setError('No speech-to-text model is available for this provider. Reload and try again.');};
    const modelOptions=(mode,{config,provider,model})=><>{!model&&<option value={config.model}>{config.model} · configured model</option>}{data.catalog.filter(item=>item.mode===mode&&(item.provider||'openai')===provider&&(provider!=='openrouter'||config.freeOnly===false||item.free)).map(item=><option value={item.id} key={item.id}>{item.label}{item.free?' · free':provider==='poe'?item.pricingUnknown?' · cost unlisted':' · paid':''}{item.deprecated?' · legacy':''}</option>)}</>;
    const enabledCell=(mode,config,hint)=><label className="eai-check"><input type="checkbox" checked={config.enabled} onChange={e=>field(mode,'enabled',e.target.checked)}/><span>{config.enabled?'Enabled':'Disabled'}</span><small>{hint}</small></label>;
    const notes=[];
    if(chat.provider==='openrouter'&&chat.config.freeOnly===false)notes.push('Chat: paid models can incur provider charges.');
    for(const [label,x] of [['Chat',chat],['Voice',voice]]){if(x.model?.deprecated)notes.push(`${label}: this model is marked deprecated by OpenAI. Select a current model when ready.`);}
    if(data.providers?.[chat.provider]&&!data.providers[chat.provider].configured)notes.push(`Add ${chat.provider==='openrouter'?'OPENROUTER_API_KEY':chat.provider==='poe'?'POE_API_KEY':chat.provider==='alibaba'?'DASHSCOPE_API_KEY':chat.provider==='ollama'?'OLLAMA_API_KEY':'OPENAI_API_KEY'} in the Render API environment before enabling this provider.`);
    if(chat.provider==='alibaba'&&!data.providers?.alibaba?.configured)notes.push('Use a Model Studio key from the intended account. Set DASHSCOPE_BASE_URL on the API server to the matching workspace API Host followed by /compatible-mode/v1. The key must allow the selected model.');
    if(voice.provider==='alibaba'&&!data.providers?.alibaba?.configured)notes.push('Voice: add DASHSCOPE_API_KEY in the Render API environment before enabling Alibaba Cloud voice. Set DASHSCOPE_BASE_URL to the workspace API Host if the account uses one.');
    if(chat.provider==='ollama')notes.push('Ollama Cloud uses the server OLLAMA_API_KEY. Model availability comes from its live catalog. Usage depends on your Ollama plan; token costs are not estimated. Voice, STT and Administrator stay on their own providers.');
    if(data.catalogError)notes.push(data.catalogError);
    if(draft.stt&&(draft.stt.provider||'openai')==='openai'&&!data.providers?.openai?.configured)notes.push('Configure OPENAI_API_KEY on the API server to enable transcription.');
    if(draft.stt?.provider==='alibaba'){if(!data.providers?.alibaba?.configured)notes.push('STT: add DASHSCOPE_API_KEY in the Render API environment before enabling Alibaba Cloud speech-to-text.');notes.push('STT on Alibaba Cloud returns plain text only, for audio under 7 MB (about 5 minutes). Timed lyrics still use OpenAI Whisper, so keep OPENAI_API_KEY set. Rate is a list-price estimate; verify it in Model Studio.');}
    if(!draft.stt)notes.push('Whisper is the default after deploying the speech-to-text backend update. Reload configuration after deployment.');
    const sttModel=draft.stt&&data.catalog.find(item=>item.id===draft.stt.model);
    return <>
     <h2 className="eai-table-title">Assistants</h2>
     <div className="eai-scroll"><table className="eai-table"><thead><tr><th>Service</th><th>Status</th><th>Provider</th><th>Model</th><th className="n">Requests / 10 min</th><th className="n">Max output tokens</th><th className="n">Max call (s)</th></tr></thead><tbody>
      <tr><td><strong><MessageCircle size={14}/> Chat assistant</strong><small>Text booking · validated order JSON</small></td><td>{enabledCell('chat',chat.config,'')}</td>
       <td><select aria-label="Chat provider" value={chat.provider} onChange={e=>changeProvider(e.target.value)}><option value="openai">OpenAI</option><option value="openrouter">OpenRouter</option><option value="poe">Poe</option><option value="alibaba">Alibaba Cloud (Qwen)</option><option value="ollama">Ollama Cloud</option></select></td>
       <td><select aria-label="Chat model" value={chat.config.model} onChange={e=>selectModel('chat',e.target.value)}>{modelOptions('chat',chat)}</select>{chat.provider==='openrouter'&&<div className="eai-inline"><label className="eai-check"><input type="checkbox" checked={chat.config.freeOnly!==false} onChange={e=>{const freeOnly=e.target.checked;setDraft(current=>({...current,chat:{...current.chat,freeOnly,...(freeOnly&&!chat.model?.free?{model:'openrouter/free',providerRates:{textInput:0,textCached:0,textOutput:0}}:{})}}));}}/><span>Free models only</span></label></div>}</td>
       <td className="n">{chat.config.requestsPer10Min}</td>
       <td className="n">{chat.config.maxOutputTokens}</td><td className="n">—</td></tr>
      <tr><td><strong><Phone size={14}/> Voice assistant</strong><small>Live WebRTC conversations</small></td><td>{enabledCell('voice',voice.config,'')}</td><td><select aria-label="Voice provider" value={voice.provider} onChange={e=>changeVoiceProvider(e.target.value)}><option value="openai">OpenAI</option><option value="openrouter" disabled>OpenRouter (not supported yet)</option><option value="ollama" disabled>Ollama Cloud (not supported here)</option><option value="alibaba">Alibaba Cloud (Qwen)</option></select></td>
       <td><select aria-label="Voice model" value={voice.config.model} onChange={e=>selectModel('voice',e.target.value)}>{modelOptions('voice',voice)}</select></td>
       <td className="n">{voice.config.requestsPer10Min}</td>
       <td className="n">{voice.config.maxOutputTokens}</td>
       <td className="n">{voice.config.maxCallSeconds}<small>{Math.round(voice.config.maxCallSeconds/60*10)/10} min</small></td></tr>
      <AdministratorServicesConfig token={token}/>
      {draft.stt&&<tr><td><strong><FileAudio size={14}/> Speech-to-text (STT)</strong><small>Song audio or vocal track to lyrics</small></td><td>{enabledCell('stt',draft.stt,'')}</td><td><select aria-label="Speech-to-text provider" value={draft.stt.provider||'openai'} onChange={e=>changeSttProvider(e.target.value)}><option value="openai">OpenAI</option><option value="openrouter" disabled>OpenRouter (not supported yet)</option><option value="ollama" disabled>Ollama Cloud (not supported here)</option><option value="alibaba">Alibaba Cloud (Qwen)</option></select></td>
       <td><select aria-label="Transcription model" value={draft.stt.model} onChange={e=>selectModel('stt',e.target.value)}>{data.catalog.filter(item=>item.mode==='stt'&&(item.provider||'openai')===(draft.stt.provider||'openai')).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></td>
       <td className="n">{draft.stt.requestsPer10Min}</td><td className="n">—</td><td className="n">—</td></tr>}
     </tbody></table></div>
     {!!notes.length&&<ul className="eai-notes">{notes.map(note=><li key={note}>{note}</li>)}</ul>}
    </>;
   })()}
  </form>}
 </section>;
}
