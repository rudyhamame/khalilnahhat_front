import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Clock3, Disc3, Pause, Play, Plus, Radio, Save, Search, Trash2, Music2, Users, Check, X, Inbox, PenLine, Library, Eye, ListMusic } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { fetchMusicArchiveCatalog } from '../lib/musicArchiveCatalog';
import './djServiceBuilder.css';
import {uuid} from '../lib/uuid.js';
import {useWorkVocabulary} from '../lib/workVocabulary';
import MusicPreferencesPopup from './BookingMusicPreferences';
import LibraryBrowserPopup from './LibraryBrowserPopup';
import {atomFacts,fetchDjWorkTypes} from '../lib/musicOntology';
import {musicAtoms} from '../lib/musicAtoms.mjs';

// Section names are Event moments chosen from Work Elements; a new section starts unnamed (or on the next unused moment).
const makeSegment=(index=0,title='')=>({id:uuid(),title,startsAt:'',endsAt:'',recordingIds:[],manualTracks:[],entries:[],notes:''});
const EMPTY_SEGMENTS=[];
const freshSet=()=>({segments:[makeSegment(0)],notes:''});
// A livestream or standalone list has no event moments: its set is one flat list, so any saved sections are merged into a single one.
const liveSet=value=>{if(!value?.segments?.length)return {segments:[{...makeSegment(0),title:'Set list'}],notes:''};const all=normalizeSet(value).segments,seen=new Set(),entries=all.flatMap(x=>x.entries).filter(e=>!seen.has(e.id)&&seen.add(e.id));return {...value,segments:[{...all[0],title:'Set list',startsAt:'',endsAt:'',notes:'',entries,recordingIds:entries.filter(e=>e.type==='recording').map(e=>e.id),manualTracks:all.flatMap(x=>x.manualTracks)}]};};
const eventOf=b=>b?.order?.event||b?.event||{};
const dateOf=b=>eventOf(b).eventDate||eventOf(b).date||'';
const venueOf=b=>{const v=eventOf(b).venue;return eventOf(b).venueName||(typeof v==='string'?v:v?.name||v?.address)||eventOf(b).city||v?.city||'';};
const timeOf=b=>[eventOf(b).startTime,eventOf(b).endTime].filter(Boolean).join('–');
const normalizeSet=value=>({...value,segments:(value?.segments||[]).map(s=>({...s,manualTracks:s.manualTracks||[],entries:s.entries?.length?s.entries:[...(s.recordingIds||[]).map(id=>({type:'recording',id})),...(s.manualTracks||[]).map(x=>({type:'manual',id:x.id}))]}))});
const initialSet=b=>{const saved=b?.planning?.djSet;return saved?.segments?.length?normalizeSet(structuredClone(saved)):freshSet();};
// The musical inputs of the Add recording form, one column each (saved atom values, merged over the recording's atoms).
const FACT_COLUMNS=['Release year','Audio range','Musicians','BPM','Time signature','Key','Rhythms','Genres','Languages','Vocalists'];
const durationOf=row=>Number(row.durationSeconds||row.audio?.durationSeconds||0);
const formatDuration=n=>n?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`:'Duration not set';

export default function DjServiceBuilder({token,onReviewLiveRequest,liveStream}){
 const [prefsOpen,setPrefsOpen]=useState(false),[libOpen,setLibOpen]=useState(false),[toolsOpen,setToolsOpen]=useState(false),[workTypes,setWorkTypes]=useState([]),[collections,setCollections]=useState([]);
 const [mode,setMode]=useState('booking'),[bookings,setBookings]=useState([]),[allBookings,setAllBookings]=useState([]),[pickOpen,setPickOpen]=useState(false),[recordings,setRecordings]=useState([]),[requests,setRequests]=useState([]);
 useEffect(()=>{if(!pickOpen)return;const k=e=>{if(e.key==='Escape')setPickOpen(false);};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[pickOpen]);
 useEffect(()=>{if(!toolsOpen)return;const k=e=>{if(e.key==='Escape')setToolsOpen(false);};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[toolsOpen]);
 const [livePlans,setLivePlans]=useState([]),[livePlanId,setLivePlanId]=useState('current'),[newStream,setNewStream]=useState('');
 const [standalonePlans,setStandalonePlans]=useState([]),[standaloneId,setStandaloneId]=useState(''),[newList,setNewList]=useState(''),[creating,setCreating]=useState(false);
 const [bookingId,setBookingId]=useState(''),[draft,setDraft]=useState(null),[query,setQuery]=useState(''),[workType,setWorkType]=useState('ALL'),[collectionId,setCollectionId]=useState('ALL'),[manual,setManual]=useState({title:'',artist:''}),[targetSegmentId,setTargetSegmentId]=useState('');
 const [busy,setBusy]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[playingId,setPlayingId]=useState(''),[reviewing,setReviewing]=useState(''),[tab,setTab]=useState('library'),[dirty,setDirty]=useState(false);
 const {data:vocabulary}=useWorkVocabulary(),moments=vocabulary?.moments||EMPTY_SEGMENTS;
 const audio=useRef(null),bookingsRef=useRef(bookings),booking=bookings.find(row=>row.id===bookingId)||null,segments=draft?.segments||EMPTY_SEGMENTS;bookingsRef.current=bookings;
 const standalone=mode==='standalone',flat=mode!=='booking',canEdit=Boolean(draft&&(mode==='booking'?booking:mode==='standalone'?standaloneId:true));
 const canLeave=()=>!saving&&!creating&&(!dirty||window.confirm('Discard unsaved changes to this set list?'));
 const chooseScenario=id=>{if(id===mode||!canLeave())return;setDraft(null);setDirty(false);setNotice('');setError('');setToolsOpen(false);setLibOpen(false);setPrefsOpen(false);setTab('library');setMode(id);};
 const atoms=musicAtoms(booking);
 const load=useCallback(async()=>{setBusy(true);setError('');try{const [services,archive,requestData]=await Promise.all([apiRequest('/service-requests/admin',{token}),fetchMusicArchiveCatalog(),apiRequest('/live-requests/admin',{token})]);const confirmed=(services.items||[]).filter(row=>row.journey.isBooked);setBookings(confirmed);setAllBookings(services.items||[]);setRecordings((archive.recordings||archive.songs||[]).filter(row=>row.published!==false&&row.audioUrl&&row.status!=='ARCHIVED'));setRequests(requestData.items||[]);fetchDjWorkTypes({token}).then(setWorkTypes).catch(()=>setWorkTypes([]));apiRequest('/admin/dj-service-builder/live-plans',{token}).then(data=>setLivePlans(data.items||[])).catch(()=>setLivePlans([]));apiRequest('/admin/music-archive',{token}).then(data=>setCollections(data.collections||[])).catch(()=>setCollections([]));setBookingId(current=>confirmed.some(row=>row.id===current)?current:confirmed[0]?.id||'');}catch(e){setError(e.message||'Could not load set plans and recordings.');}finally{setBusy(false);}},[token]);
 useEffect(()=>{load();const player=audio;return()=>player.current?.pause();},[load]);
 useEffect(()=>{let active=true;const refresh=()=>apiRequest('/live-requests/admin',{token}).then(data=>{if(active)setRequests(data.items||[]);}).catch(()=>{});const timer=window.setInterval(refresh,10000);return()=>{active=false;window.clearInterval(timer);};},[token]);
 useEffect(()=>{if(mode==='booking'){const selected=bookingsRef.current.find(row=>row.id===bookingId);setDraft(selected?initialSet(selected):freshSet());setDirty(false);setNotice('');}},[bookingId,mode]);
 useEffect(()=>{if(mode!=='livestream')return;let active=true;setDraft(null);apiRequest(livePlanId==='current'?'/admin/dj-service-builder/livestream':'/admin/dj-service-builder/live-plans/'+livePlanId,{token}).then(result=>{if(active){setDraft(liveSet(result.djSet));setDirty(false);}}).catch(e=>{if(active)setError(e.message||'Could not load the livestream set.');});return()=>{active=false;};},[mode,token,livePlanId]);
 useEffect(()=>{if(mode!=='standalone')return;let active=true;apiRequest('/admin/dj-service-builder/standalone',{token}).then(data=>{if(active){setStandalonePlans(data.items||[]);setStandaloneId(current=>(data.items||[]).some(row=>row.id===current)?current:data.items?.[0]?.id||'');}}).catch(e=>{if(active)setError(e.message||'Could not load standalone set lists.');});return()=>{active=false;};},[mode,token]);
 useEffect(()=>{if(mode!=='standalone')return;let active=true;setDraft(null);setDirty(false);if(standaloneId)apiRequest('/admin/dj-service-builder/standalone/'+standaloneId,{token}).then(result=>{if(active)setDraft(liveSet(result.djSet));}).catch(e=>{if(active)setError(e.message||'Could not load the standalone set list.');});return()=>{active=false;};},[mode,token,standaloneId]);
 useEffect(()=>{if(segments.length&&!segments.some(s=>s.id===targetSegmentId))setTargetSegmentId(segments[0].id);else if(!segments.length)setTargetSegmentId('');},[segments,targetSegmentId]);
 const types=useMemo(()=>[...new Set(recordings.map(x=>x.workType).filter(Boolean))].sort(),[recordings]);
 const libraryCollections=useMemo(()=>collections.filter(c=>workType==='ALL'||c.workTypeId===workType),[collections,workType]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();const inCollection=collectionId==='ALL'?null:new Set(collections.find(c=>c.id===collectionId)?.recordingIds||[]);return recordings.filter(x=>(!inCollection||inCollection.has(x.id))&&(workType==='ALL'||(x.workType)===workType)&&(!q||`${x.title} ${x.artist||''} ${x.workType||''}`.toLowerCase().includes(q)));},[collections,collectionId,recordings,query,workType]);
 const byId=useMemo(()=>new Map(recordings.map(x=>[x.id,x])),[recordings]);
 const draftRef=useRef(draft);draftRef.current=draft;
 const updateSet=patch=>{setDirty(true);setDraft(current=>({...current,...patch}));};
 const addSection=()=>{const used=new Set(segments.map(item=>item.title)),next=makeSegment(segments.length,moments.find(name=>!used.has(name))||'');updateSet({segments:[...segments,next]});setTargetSegmentId(next.id);};
 const updateSegment=(id,patch)=>updateSet({segments:segments.map(s=>s.id===id?{...s,...patch}:s)});
 const addRecording=(segmentId,id)=>{const s=segments.find(x=>x.id===segmentId);if(s&&!s.recordingIds.includes(id)){updateSegment(segmentId,{recordingIds:[...s.recordingIds,id],entries:[...(s.entries||[]),{type:'recording',id}]});setNotice('Recording added to '+s.title+'.');}};
 const move=(segment,index,direction)=>{const entries=[...(segment.entries||[])],to=index+direction;if(to<0||to>=entries.length)return;[entries[index],entries[to]]=[entries[to],entries[index]];updateSegment(segment.id,{entries,recordingIds:entries.filter(x=>x.type==='recording').map(x=>x.id),manualTracks:entries.filter(x=>x.type==='manual').map(x=>(segment.manualTracks||[]).find(t=>t.id===x.id)).filter(Boolean)});};
 const moveSection=(index,direction)=>{const to=index+direction;if(to<0||to>=segments.length)return;const next=[...segments];[next[index],next[to]]=[next[to],next[index]];updateSet({segments:next});};
 const preview=row=>{const node=audio.current;if(!node||!row.audioUrl)return;if(playingId===row.id){node.pause();node.removeAttribute('src');setPlayingId('');return;}node.pause();node.src=row.audioUrl;node.play().then(()=>setPlayingId(row.id)).catch(()=>setError('This recording could not be previewed.'));};
 const save=async()=>{if(!canEdit||saving)return;setSaving(true);setError('');setNotice('');try{if(mode==='booking'){if(!booking)return;const r=await apiRequest(`/admin/dj-service-builder/${encodeURIComponent(booking.id)}`,{token,method:'PUT',body:{djSet:draft}});setBookings(rows=>rows.map(x=>x.id===booking.id?{...x,planning:r.item?.planning||{...x.planning,djSet:r.djSet||draft}}:x));}else if(mode==='standalone'){const result=await apiRequest('/admin/dj-service-builder/standalone/'+standaloneId,{token,method:'PUT',body:{djSet:draft}});setStandalonePlans(rows=>rows.map(row=>row.id===standaloneId?result.item:row));}else{await apiRequest(livePlanId==='current'?'/admin/dj-service-builder/livestream':'/admin/dj-service-builder/live-plans/'+livePlanId,{token,method:'PUT',body:{djSet:draft}});if(livePlanId!=='current')setLivePlans(rows=>rows.map(x=>x.id===livePlanId?{...x,trackCount}:x));}setDirty(draftRef.current!==draft);setNotice(mode==='booking'?'Booking set saved.':mode==='standalone'?'Standalone set list saved.':'Livestream set saved.');}catch(e){setError(e.message||'The set could not be saved.');}finally{setSaving(false);}};
 const createStream=async event=>{event.preventDefault();const title=newStream.trim();if(!title||!canLeave())return;setCreating(true);setError('');try{const r=await apiRequest('/admin/dj-service-builder/live-plans',{token,method:'POST',body:{title}});setLivePlans(rows=>[r.item,...rows]);setLivePlanId(r.item.id);setNewStream('');setNotice('Live stream created. Add music items to prepare it.');}catch(e){setError(e.message||'The live stream could not be created.');}finally{setCreating(false);}};
 const createStandalone=async event=>{event.preventDefault();const title=newList.trim();if(!title||!canLeave())return;setCreating(true);setError('');try{const result=await apiRequest('/admin/dj-service-builder/standalone',{token,method:'POST',body:{title}});setStandalonePlans(rows=>[result.item,...rows]);setStandaloneId(result.item.id);setNewList('');setNotice('Set list created. Add music items to organize it.');}catch(e){setError(e.message||'The set list could not be created.');}finally{setCreating(false);}};
 const review=async(item,decision)=>{if(!onReviewLiveRequest)return;setReviewing(item.id);setError('');let reviewed=false;try{await onReviewLiveRequest(item.id,{session:item.broadcastSessionId||liveStream?.broadcastSessionId||'',decision});reviewed=true;setRequests(rows=>rows.map(x=>x.id===item.id?{...x,requestStatus:decision==='approved'?'approved':'rejected'}:x));if(decision==='approved'){const current=await apiRequest('/admin/dj-service-builder/livestream',{token});const plan=liveSet(current.djSet);const track={id:`audience-${item.id}`,title:(item.track||item.message||'Audience request').slice(0,200),artist:item.artist||item.requesterName||'',notes:`Audience request · ${item.requesterName||'Listener'}`};if(!plan.segments.length)plan.segments=[makeSegment(0)];const target=plan.segments.find(s=>s.id===targetSegmentId)||plan.segments[0];target.manualTracks=[...(target.manualTracks||[]),track];target.entries=[...(target.entries||[]),{type:'manual',id:track.id}];await apiRequest('/admin/dj-service-builder/livestream',{token,method:'PUT',body:{djSet:plan}});if(mode==='livestream')setDraft(plan);}setNotice(decision==='approved'?'Request accepted and added to the livestream set.':'Request declined.');}catch(e){setError(reviewed?'Request was reviewed, but the livestream set could not be updated: '+(e.message||'retry from the livestream set editor.'):e.message||'Request review failed.');}finally{setReviewing('');}};
 const addManual=(preset)=>{const title=(preset?.title||manual.title).trim(),segment=segments.find(s=>s.id===targetSegmentId)||segments[0];if(!title||!segment)return;const track={id:uuid(),title,artist:(preset?.artist??manual.artist).trim(),notes:''};updateSegment(segment.id,{manualTracks:[...(segment.manualTracks||[]),track],entries:[...(segment.entries||[]),{type:'manual',id:track.id}]});if(!preset)setManual({title:'',artist:''});setNotice('Track added to '+segment.title+'.');};
 if(busy)return <section className="djb"><div className="djb-loading"><span className="djb-spin"/>Loading set plans and recordings…</div></section>;
 const pending=requests.filter(x=>x.requestStatus==='pending_admin');
 const trackCount=segments.reduce((n,s)=>n+(s.entries||[]).length,0);
 const entryRows=s=>(s.entries||[]).map((entry,j)=>({kind:entry.type,id:entry.id,j,row:entry.type==='recording'?byId.get(entry.id):(s.manualTracks||[]).find(t=>t.id===entry.id)})).filter(x=>x.row);
 const runtime=s=>entryRows(s).reduce((n,x)=>n+(x.kind==='recording'?durationOf(x.row):0),0);
 const total=segments.reduce((n,s)=>n+runtime(s),0);
 const clockText=n=>n?`${Math.floor(n/3600)?Math.floor(n/3600)+'h ':''}${Math.floor(n%3600/60)}m`:'—';
 const target=segments.find(s=>s.id===targetSegmentId);
 const inTarget=id=>Boolean(target?.recordingIds.includes(id));
 const removeEntry=(s,x)=>updateSegment(s.id,x.kind==='recording'?{recordingIds:s.recordingIds.filter(v=>v!==x.id),entries:s.entries.filter(v=>v.id!==x.id)}:{manualTracks:s.manualTracks.filter(t=>t.id!==x.id),entries:s.entries.filter(v=>v.id!==x.id)});
 const playBtn=row=><button className="djb-play" type="button" onClick={()=>preview(row)} aria-label={`${playingId===row.id?'Stop':'Preview'} ${row.title}`}>{playingId===row.id?<Pause size={14}/>:<Play size={14}/>}</button>;
 const live=mode==='livestream';
 const factValue=(row,label)=>[...new Set((row.atoms||[]).map(atom=>Object.fromEntries(atomFacts(atom))[label]).filter(value=>value!==''&&value!=null))].join(' / ')||'—';
 return <section className="djb" aria-label="Set list builder">
  <div className="djb-workspace">
  <div className="djb-main">
  <div className="djb-intro">
  <section className="djb-scenarios" aria-label="Set list scenario">
   <div className="djb-switch" role="group" aria-label="Choose your scenario">
    {[['booking','Booking','Plan music by event moment.',CalendarDays],['livestream','Live stream','Build one continuous running order.',Radio],['standalone','Standalone','No event or goal. Organize a reusable set list.',ListMusic]].map(([id,title,description,Icon])=><button key={id} type="button" aria-pressed={mode===id} className={mode===id?'on':''} disabled={saving||creating} onClick={()=>chooseScenario(id)}><span className="djb-scenario-icon"><Icon size={23}/></span><span><strong>{title}</strong><small>{description}</small></span><span className="djb-scenario-check" aria-hidden="true">{mode===id&&<Check size={14}/>}</span></button>)}
   </div>
  </section>
  <div className="djb-booking-row">
  {mode==='booking'&&<button type="button" className="djb-pick-chip" aria-haspopup="dialog" disabled={!allBookings.length} onClick={()=>setPickOpen(true)}><CalendarDays size={16}/><span><small>Booking</small><b>{booking?`${booking.customerName||'Client event'} · ${dateOf(booking)||'Date not set'}`:allBookings.length?'Choose a booking':'No bookings yet'}</b></span><ChevronDown size={16}/></button>}
  <ul className="djb-stats" aria-label="Set summary">{!flat&&<li><b>{segments.length}</b>moments</li>}<li><b>{trackCount}</b>tracks</li><li><b>{clockText(total)}</b>library runtime</li></ul><button type="button" className="djb-save" disabled={!canEdit||!dirty||saving} onClick={save}><Save size={15}/>{saving?'Saving…':'Save set list'}</button></div>

  </div>
  <div className="djb-body">
  <aside className="djb-items" aria-label={standalone?'Standalone set lists':live?'Live streams':'Bookings'}>
   <header className="djb-items-header"><div><span className="djb-eyebrow">{standalone?'Standalone set lists':live?'Live streams':'Bookings'}</span><b>{standalone?standalonePlans.length:live?livePlans.length+1:allBookings.length} {standalone?'lists':live?'streams':'bookings'}</b></div><button type="button" className="djb-tools-trigger" aria-haspopup="dialog" aria-expanded={toolsOpen} disabled={!canEdit||saving} onClick={()=>setToolsOpen(true)}><Plus size={16}/>Add music items</button></header>
   {live&&<form className="djb-new-stream" onSubmit={createStream}><input aria-label="New live stream title" value={newStream} maxLength={180} placeholder="New live stream title" onChange={e=>setNewStream(e.target.value)}/><button type="submit" className="djb-tools-trigger" disabled={!newStream.trim()||saving||creating}><Plus size={16}/>New live stream</button></form>}
   {standalone&&<form className="djb-new-stream" onSubmit={createStandalone}><input aria-label="New set list title" value={newList} maxLength={180} placeholder="New set list title" onChange={e=>setNewList(e.target.value)}/><button type="submit" className="djb-tools-trigger" disabled={!newList.trim()||creating||saving}><Plus size={16}/>{creating?'Creating…':'New set list'}</button></form>}
   <ul className="djb-items-list">
    {standalone?(standalonePlans.length?standalonePlans.map(item=><li key={item.id}><button type="button" disabled={saving||creating} aria-pressed={standaloneId===item.id} onClick={()=>{if(standaloneId!==item.id&&canLeave()){setDraft(null);setDirty(false);setError('');setNotice('');setStandaloneId(item.id);}}}><b>{item.title}</b><small>{item.trackCount} track{item.trackCount===1?'':'s'}</small></button></li>):<li className="djb-empty">Create a set list to organize music without a booking or live stream.</li>):live?[{id:'current',title:'Current live stream',meta:''},...livePlans.map(x=>({id:x.id,title:x.title,meta:`${x.trackCount} track${x.trackCount===1?'':'s'}${x.createdAt?' · '+new Date(x.createdAt).toLocaleDateString():''}`}))].map(x=><li key={x.id}><button type="button" aria-pressed={livePlanId===x.id} disabled={saving} onClick={()=>{if(livePlanId!==x.id&&canLeave())setLivePlanId(x.id);}}><b>{x.title}</b>{x.meta&&<small>{x.meta}</small>}</button></li>)
    :allBookings.length?allBookings.map(x=>{const ok=Boolean(x.journey?.isBooked);return <li key={x.id}><button type="button" disabled={!ok} title={ok?'':'Only confirmed bookings can have a set list'} aria-pressed={bookingId===x.id} onClick={()=>{if(bookingId!==x.id&&canLeave())setBookingId(x.id);}}><b>{x.customerName||'Client event'}</b><small>{[x.requestNumber||x.id,dateOf(x),venueOf(x)].filter(Boolean).join(' · ')}</small><small className={`djb-status${ok?' is-ok':''}`}>{x.journey?.label||(ok?'Confirmed':'Not confirmed')}</small></button></li>;}):<li className="djb-empty">No bookings yet.</li>}
   </ul>
  </aside>
  <aside className="djb-output" aria-label="Live set preview">
   <header className="djb-output-heading"><div><span className="djb-eyebrow"><Eye size={13}/>Live preview</span></div><span className="djb-preview-state">{dirty?'Unsaved changes':'Saved version'}</span></header>
   <div className="djb-preview-table-wrap"><table className="djb-preview-table"><thead><tr><th scope="col">Recording</th>{FACT_COLUMNS.map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{segments.map(segment=><Fragment key={segment.id}>{!flat&&<tr className="djb-preview-section"><th colSpan={FACT_COLUMNS.length+1}>{segment.title||'Untitled moment'}</th></tr>}{entryRows(segment).map(item=><tr key={item.id}><th scope="row"><strong>{item.row.title}</strong>{item.row.artist&&<small>{item.row.artist}</small>}</th>{FACT_COLUMNS.map(label=><td key={label}>{factValue(item.row,label)}</td>)}</tr>)}</Fragment>)}{!trackCount&&<tr><td colSpan={FACT_COLUMNS.length+1} className="djb-preview-empty">{canEdit?'Add music items to build your set list.':standalone?'Create or choose a standalone set list to begin.':'Choose a set to begin.'}</td></tr>}</tbody></table></div>
   {draft?.notes&&<div className="djb-output-notes"><strong>Music notes</strong><p>{draft.notes}</p></div>}
  </aside>
  </div>
  {live&&<div className="djb-live"><Radio size={16}/><b>{liveStream?.title||'Livestream set'}</b><small>{liveStream?.isLive?'Live now':'Ready for the next livestream'}</small></div>}
  {mode==='booking'&&pickOpen&&<div className="djb-float-backdrop" onClick={()=>setPickOpen(false)}><div className="djb-float" role="dialog" aria-label="Choose a booking" onClick={e=>e.stopPropagation()}>
   <header><div><span className="djb-eyebrow">Booking</span><h2>Choose a booking</h2></div><button type="button" className="djb-ghost" onClick={()=>setPickOpen(false)} aria-label="Close booking list"><X size={16}/></button></header>
   {allBookings.length?<ul className="djb-bookings" aria-label="Choose a booking">{[...allBookings].sort((a,b)=>b.journey.isBooked-a.journey.isBooked).map(x=>{const ok=x.journey.isBooked,on=x.id===bookingId,xe=eventOf(x),g=xe.guestCount||xe.guests;return <li key={x.id}><button type="button" disabled={!ok} aria-pressed={on} className={on?'on':''} onClick={()=>{if(!canLeave())return;if(on)setBookingId('');else{setBookingId(x.id);setPickOpen(false);}}}>
   <span className="djb-bk-ico"><CalendarDays size={18}/></span>
   <span className="djb-bk-body"><strong>{x.customerName||'Client event'}</strong><small>{x.requestNumber||x.id}<i className={ok?'is-ok':''}>{x.journey.label}</i></small>
    <span className="djb-bk-meta"><span><CalendarDays size={13}/>{dateOf(x)||'Date not set'}</span>{timeOf(x)&&<span><Clock3 size={13}/>{timeOf(x)}</span>}<span><Disc3 size={13}/>{venueOf(x)||'Venue not set'}</span>{g&&<span><Users size={13}/>{g} guests</span>}</span></span>
   <span className="djb-bk-check" aria-hidden="true">{on&&<Check size={16}/>}</span>
  </button></li>;})}</ul>:<p className="djb-empty">{busy?'Loading bookings…':'No bookings yet.'}</p>}
  </div></div>}
  {error&&<p className="djb-msg is-error" role="alert">{error}</p>}{notice&&<p className="djb-msg" role="status">{notice}</p>}

  <div className="djb-grid">
   {toolsOpen&&<div className="djb-tools-backdrop" onClick={()=>setToolsOpen(false)}><aside className="djb-tools" role="dialog" aria-modal="true" aria-label="Add music items" onClick={e=>e.stopPropagation()}>
    <header className="djb-tools-modal-heading"><div><span className="djb-eyebrow">Set editor</span><h2>Add music items</h2></div><button type="button" className="djb-ghost" onClick={()=>setToolsOpen(false)} aria-label="Close Add music items"><X size={16}/></button></header>

    {canEdit&&<label className="djb-notes"><span>{mode==='booking'?'Booking music notes':'Set list notes'}</span><textarea value={draft?.notes||''} onChange={e=>updateSet({notes:e.target.value})} placeholder="Preferences, must-play and do-not-play songs, cues, transitions…"/></label>}
    {!canEdit?null:<>
     {!flat&&<div className="djb-moments" role="group" aria-label="Event moments">
      {segments.map((m,i)=><button key={m.id} type="button" aria-pressed={targetSegmentId===m.id} onClick={()=>setTargetSegmentId(m.id)}><b>{String(i+1).padStart(2,'0')}</b>{m.title||'Untitled moment'}<i>{entryRows(m).length}</i></button>)}
      <button type="button" className="djb-moment-add" onClick={addSection}><Plus size={14}/>Add event moment</button>
     </div>}
     {!flat&&!segments.length&&<p className="djb-empty">Your set is empty. Add an event moment to begin.</p>}
     {(()=>{const s=segments.find(x=>x.id===targetSegmentId);if(!s)return null;const i=segments.indexOf(s),rows=entryRows(s),secs=runtime(s);
      return <article className={`djb-moment${flat?' is-flat':''}`}>
       {!flat&&<header>
        <select className="djb-name" aria-label="Event moment" value={s.title} onChange={e=>updateSegment(s.id,{title:e.target.value})}><option value="">{moments.length?'Choose an event moment':'Add event moments in Work Elements'}</option>{moments.map(name=><option key={name} value={name}>{name}</option>)}{s.title&&!moments.includes(s.title)&&<option value={s.title}>{s.title} (not in Event moments)</option>}</select>
        <label className="djb-time"><Clock3 size={13}/><input aria-label="Section start time" type="time" value={s.startsAt||''} onChange={e=>updateSegment(s.id,{startsAt:e.target.value})}/></label>
        <span className="djb-sum">{rows.length} track{rows.length===1?'':'s'}{secs?` · ${clockText(secs)}`:''}</span>
        <div className="djb-icons">
         <button type="button" onClick={()=>moveSection(i,-1)} disabled={i===0} aria-label="Move moment earlier"><ChevronUp size={15}/></button>
         <button type="button" onClick={()=>moveSection(i,1)} disabled={i===segments.length-1} aria-label="Move moment later"><ChevronDown size={15}/></button>
         <button type="button" onClick={()=>updateSet({segments:segments.filter(x=>x.id!==s.id)})} aria-label={`Remove ${s.title||'moment'}`}><Trash2 size={15}/></button>
        </div>
       </header>}
       {rows.length===0?<p className="djb-empty">Nothing here yet. Add a recording below, or enter a song manually.</p>:<ol className="djb-tracks">{rows.map((x,n)=><li key={x.id} className={x.kind==='manual'?'is-manual':''}>
        {x.kind==="recording"?playBtn(x.row):<span className="djb-manual-ico"><Music2 size={14}/></span>}
        <span className="djb-n">{String(n+1).padStart(2,'0')}</span>
        <div className="djb-meta"><strong>{x.row.title}</strong><small>{x.kind==='recording'?`${x.row.artist||x.row.workType||x.row.workType||'Recording'} · ${formatDuration(durationOf(x.row))}`:x.row.notes||x.row.artist||'Manual track'}</small></div>
        <em>{x.kind==='recording'?'Library':'Manual'}</em>
        <div className="djb-icons"><button type="button" onClick={()=>move(s,x.j,-1)} disabled={x.j===0} aria-label={`Move ${x.row.title} up`}><ChevronUp size={15}/></button><button type="button" onClick={()=>move(s,x.j,1)} disabled={x.j===(s.entries||[]).length-1} aria-label={`Move ${x.row.title} down`}><ChevronDown size={15}/></button><button type="button" onClick={()=>removeEntry(s,x)} aria-label={`Remove ${x.row.title}`}><X size={15}/></button></div>
       </li>)}</ol>}
       {!flat&&<input className="djb-cue" value={s.notes||''} onChange={e=>updateSegment(s.id,{notes:e.target.value})} placeholder="Cue or note for this moment"/>}
      </article>;})()}
    </>}

    <h3 className="djb-step-title" id="djb-sources-title">Choose where to add the music from</h3>
    <div className="djb-tabs" role="group" aria-labelledby="djb-sources-title">
     {[['library','Library',Library,visible.length,'Choose from your published recordings.'],['manual','Song / cue',PenLine,0,'Type a song or cue that is not in the library.'],...(!standalone?[['requests','Requests',Inbox,mode==='booking'?atoms.requestedSongs:pending.length,mode==='booking'?'Songs and tastes from the booking’s Music preferences.':'Review the songs the audience asked for.']]:[])].map(([id,label,Icon,count,description])=><button key={id} aria-pressed={tab===id} className={tab===id?'on':''} type="button" onClick={()=>{setTab(id);if(id==='library')setLibOpen(true);}}><Icon size={15}/><span className="djb-tab-name">{label}{id!=='manual'&&count>0&&<i>{count}</i>}</span><small>{description}</small></button>)}
    </div>
    {tab==='library'&&<div className="djb-panel">
     <div className="djb-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search recordings" aria-label="Search recordings"/></div>
     <div className="djb-chips" role="group" aria-label="Filter by type">{['ALL',...types].map(t=><button key={t} type="button" aria-pressed={workType===t} onClick={()=>{setWorkType(t);setCollectionId('ALL');}}>{t==='ALL'?'All':t}</button>)}<a className="djb-chip-add" href="/admin/echo?tab=work-elements" target="_blank" rel="noreferrer"><Plus size={13}/>Add work type</a></div>
     {libraryCollections.length>0&&<div className="djb-chips djb-collection-chips" role="group" aria-label="Choose a collection"><span className="djb-chips-label">Collections</span>{[{id:'ALL',title:'All collections'},...libraryCollections].map(c=><button key={c.id} type="button" aria-pressed={collectionId===c.id} onClick={()=>setCollectionId(c.id)}>{c.title||c.name||'Collection'}{c.id!=='ALL'&&<small>{(c.recordingIds||[]).length}</small>}</button>)}</div>}
     <p className="djb-count">{visible.length} recording{visible.length===1?'':'s'}</p>
     <div className="djb-music-table-wrap"><table className="djb-music-table"><thead><tr><th scope="col">Preview</th><th scope="col">Music item</th><th scope="col">Type</th><th scope="col">Duration</th><th scope="col">Action</th></tr></thead><tbody>{visible.map(row=>{const added=inTarget(row.id);return <tr key={row.id}><td>{playBtn(row)}</td><th scope="row"><span className="djb-meta"><strong>{row.title}</strong><small>{row.artist||'Artist not set'}</small></span></th><td>{row.workType||'Recording'}</td><td>{durationOf(row)?formatDuration(durationOf(row)):'—'}</td><td><button type="button" className="djb-add" disabled={!targetSegmentId||added||!canEdit} onClick={()=>addRecording(targetSegmentId,row.id)}>{added?<Check size={14}/>:<Plus size={14}/>}{added?'Added':'Add'}</button></td></tr>;})}</tbody></table></div>
     {!visible.length&&<p className="djb-empty">No recordings match.</p>}
    </div>}
    {tab==='manual'&&<form className="djb-panel djb-form" onSubmit={e=>{e.preventDefault();addManual();}}>
     <p className="djb-hint">A song or DJ cue that isn’t in your recordings.</p>
     <input value={manual.title} onChange={e=>setManual({...manual,title:e.target.value})} placeholder="Song or cue name" aria-label="Song or cue name"/>
     <input value={manual.artist} onChange={e=>setManual({...manual,artist:e.target.value})} placeholder="Artist (optional)" aria-label="Artist"/>
     <button type="submit" className="djb-add wide" disabled={!manual.title.trim()||!targetSegmentId||!canEdit}><Plus size={14}/>Add to {flat?"the set list":target?.title||"a section"}</button>
    </form>}
    {tab==='requests'&&mode==='booking'&&<div className="djb-panel">
     {booking?<><div className="djb-prefs-summary">{[['Language & dialect',atoms.languages.length],['Music genres',atoms.genres.length],['Songs for event moments',atoms.moments.length],['Favourite songs',atoms.favourites.length],['Favourite artists',atoms.artists.length]].map(([label,count],index)=><span key={label}><em>{index+1}</em>{label}<b>{count}</b></span>)}</div>
      <button type="button" className="djb-ghost djb-prefs-open" onClick={()=>setPrefsOpen(true)}>Open all music preferences</button>
      {atoms.requestedSongs?<ul className="djb-req">{[...atoms.moments,...atoms.favourites].map((row,index)=><li key={index}><div className="djb-meta"><strong>{row.title}</strong><small>{[row.moment,row.artist].filter(Boolean).join(' · ')||'Requested in the booking'}</small></div><button className="djb-add" type="button" onClick={()=>addManual(row)}><Plus size={14}/>Add</button></li>)}</ul>:<p className="djb-empty">The client has not added songs to the Music preferences yet.</p>}</>:<p className="djb-empty">Choose a booking to see its music preferences.</p>}
    </div>}
    {tab==='requests'&&mode==='livestream'&&<div className="djb-panel">
     {pending.length?<ul className="djb-req">{pending.map(item=>{const canReview=Boolean(liveStream?.isLive&&item.broadcastSessionId===liveStream.broadcastSessionId);return <li key={item.id}><div className="djb-meta"><strong>{item.track||item.message||'Song request'}</strong><small>{item.artist||item.requesterName||'Audience'}{item.requesterName&&item.artist?` · ${item.requesterName}`:''}</small>{!canReview&&<small className="djb-warn">Start this livestream to review</small>}</div>
      <button className="djb-add" type="button" disabled={Boolean(reviewing)||!canReview} onClick={()=>review(item,'approved')}><Check size={14}/>Add</button><button className="djb-decline" type="button" disabled={Boolean(reviewing)||!canReview} onClick={()=>review(item,'rejected')}>Decline</button></li>;})}</ul>:<p className="djb-empty">No requests are waiting for review.</p>}
    </div>}
   </aside></div>}
  </div>
  </div>

  </div><audio ref={audio} preload="none" onEnded={()=>setPlayingId('')} onPause={()=>setPlayingId('')}/>
   {libOpen&&<LibraryBrowserPopup workTypes={workTypes} collections={collections} recordings={recordings} isAdded={inTarget} onAdd={id=>addRecording(targetSegmentId,id)} onClose={()=>setLibOpen(false)}/>}
  {prefsOpen&&booking&&<MusicPreferencesPopup booking={booking} onClose={()=>setPrefsOpen(false)} onAddSong={addManual}/>}
 </section>;
}
