import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Clock3, Disc3, Pause, Play, Plus, Radio, RefreshCw, Save, Search, Trash2, Music2, Users, Check, X, Inbox, PenLine, Library, ListMusic, Eye } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { fetchMusicArchiveCatalog } from '../lib/musicArchiveCatalog';
import './djServiceBuilder.css';
import {uuid} from '../lib/uuid.js';
import {useWorkVocabulary} from '../lib/workVocabulary';

// Section names are Event moments chosen from Work Elements; a new section starts unnamed (or on the next unused moment).
const makeSegment=(index=0,title='')=>({id:uuid(),title,startsAt:'',endsAt:'',recordingIds:[],manualTracks:[],entries:[],notes:''});
const EMPTY_SEGMENTS=[];
const freshSet=()=>({segments:[makeSegment(0)],notes:''});
// A livestream has no event moments: its set is one flat list, so any saved sections are merged into a single one.
const liveSet=value=>{if(!value?.segments?.length)return {segments:[{...makeSegment(0),title:'Set list'}],notes:''};const all=normalizeSet(value).segments,seen=new Set(),entries=all.flatMap(x=>x.entries).filter(e=>!seen.has(e.id)&&seen.add(e.id));return {...value,segments:[{...all[0],title:'Set list',startsAt:'',endsAt:'',notes:'',entries,recordingIds:entries.filter(e=>e.type==='recording').map(e=>e.id),manualTracks:all.flatMap(x=>x.manualTracks)}]};};
const eventOf=b=>b?.order?.event||b?.event||{};
const dateOf=b=>eventOf(b).eventDate||eventOf(b).date||'';
const venueOf=b=>{const v=eventOf(b).venue;return eventOf(b).venueName||(typeof v==='string'?v:v?.name||v?.address)||eventOf(b).city||v?.city||'';};
const timeOf=b=>[eventOf(b).startTime,eventOf(b).endTime].filter(Boolean).join('–');
const normalizeSet=value=>({...value,segments:(value?.segments||[]).map(s=>({...s,manualTracks:s.manualTracks||[],entries:s.entries?.length?s.entries:[...(s.recordingIds||[]).map(id=>({type:'recording',id})),...(s.manualTracks||[]).map(x=>({type:'manual',id:x.id}))]}))});
const initialSet=b=>{const saved=b?.planning?.djSet;return saved?.segments?.length?normalizeSet(structuredClone(saved)):freshSet();};
const durationOf=row=>Number(row.durationSeconds||row.audio?.durationSeconds||0);
const formatDuration=n=>n?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`:'Duration not set';

export default function DjServiceBuilder({token,onReviewLiveRequest,liveStream}){
 const [mode,setMode]=useState('booking'),[bookings,setBookings]=useState([]),[recordings,setRecordings]=useState([]),[requests,setRequests]=useState([]);
 const [bookingId,setBookingId]=useState(''),[draft,setDraft]=useState(null),[query,setQuery]=useState(''),[workType,setWorkType]=useState('ALL'),[manual,setManual]=useState({title:'',artist:''}),[targetSegmentId,setTargetSegmentId]=useState('');
 const [busy,setBusy]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[playingId,setPlayingId]=useState(''),[reviewing,setReviewing]=useState(''),[tab,setTab]=useState('library'),[dirty,setDirty]=useState(false);
 const {data:vocabulary}=useWorkVocabulary(),moments=vocabulary?.moments||EMPTY_SEGMENTS;
 const audio=useRef(null),bookingsRef=useRef(bookings),booking=bookings.find(row=>row.id===bookingId)||null,segments=draft?.segments||EMPTY_SEGMENTS;bookingsRef.current=bookings;
 const load=useCallback(async()=>{setBusy(true);setError('');try{const [services,archive,requestData]=await Promise.all([apiRequest('/service-requests/admin',{token}),fetchMusicArchiveCatalog(),apiRequest('/live-requests/admin',{token})]);const confirmed=(services.items||[]).filter(row=>row.status==='confirmed');setBookings(confirmed);setRecordings((archive.recordings||archive.songs||[]).filter(row=>row.published!==false&&row.audioUrl&&row.archivalStatus!=='ARCHIVED'&&row.publicationStatus!=='WITHDRAWN'));setRequests(requestData.items||[]);setBookingId(current=>confirmed.some(row=>row.id===current)?current:confirmed[0]?.id||'');}catch(e){setError(e.message||'Could not load set plans and recordings.');}finally{setBusy(false);}},[token]);
 useEffect(()=>{load();const player=audio;return()=>player.current?.pause();},[load]);
 useEffect(()=>{let active=true;const refresh=()=>apiRequest('/live-requests/admin',{token}).then(data=>{if(active)setRequests(data.items||[]);}).catch(()=>{});const timer=window.setInterval(refresh,10000);return()=>{active=false;window.clearInterval(timer);};},[token]);
 useEffect(()=>{if(mode==='booking'){const selected=bookingsRef.current.find(row=>row.id===bookingId);setDraft(selected?initialSet(selected):freshSet());setDirty(false);setNotice('');}},[bookingId,mode]);
 useEffect(()=>{if(mode!=='livestream')return;let active=true;setDraft(null);apiRequest('/admin/dj-service-builder/livestream',{token}).then(result=>{if(active){setDraft(liveSet(result.djSet));setDirty(false);}}).catch(e=>{if(active)setError(e.message||'Could not load the livestream set.');});return()=>{active=false;};},[mode,token]);
 useEffect(()=>{if(segments.length&&!segments.some(s=>s.id===targetSegmentId))setTargetSegmentId(segments[0].id);else if(!segments.length)setTargetSegmentId('');},[segments,targetSegmentId]);
 const types=useMemo(()=>[...new Set(recordings.map(x=>x.recordingType||x.workType).filter(Boolean))].sort(),[recordings]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();return recordings.filter(x=>(workType==='ALL'||(x.recordingType||x.workType)===workType)&&(!q||`${x.title} ${x.artist||''} ${x.recordingType||x.workType||''}`.toLowerCase().includes(q)));},[recordings,query,workType]);
 const byId=useMemo(()=>new Map(recordings.map(x=>[x.id,x])),[recordings]);
 const updateSet=patch=>{setDirty(true);setDraft(current=>({...current,...patch}));};
 const addSection=()=>{const used=new Set(segments.map(item=>item.title)),next=makeSegment(segments.length,moments.find(name=>!used.has(name))||'');updateSet({segments:[...segments,next]});setTargetSegmentId(next.id);};
 const updateSegment=(id,patch)=>updateSet({segments:segments.map(s=>s.id===id?{...s,...patch}:s)});
 const addRecording=(segmentId,id)=>{const s=segments.find(x=>x.id===segmentId);if(s&&!s.recordingIds.includes(id)){updateSegment(segmentId,{recordingIds:[...s.recordingIds,id],entries:[...(s.entries||[]),{type:'recording',id}]});setNotice('Recording added to '+s.title+'.');}};
 const move=(segment,index,direction)=>{const entries=[...(segment.entries||[])],to=index+direction;if(to<0||to>=entries.length)return;[entries[index],entries[to]]=[entries[to],entries[index]];updateSegment(segment.id,{entries,recordingIds:entries.filter(x=>x.type==='recording').map(x=>x.id),manualTracks:entries.filter(x=>x.type==='manual').map(x=>(segment.manualTracks||[]).find(t=>t.id===x.id)).filter(Boolean)});};
 const moveSection=(index,direction)=>{const to=index+direction;if(to<0||to>=segments.length)return;const next=[...segments];[next[index],next[to]]=[next[to],next[index]];updateSet({segments:next});};
 const preview=row=>{const node=audio.current;if(!node||!row.audioUrl)return;if(playingId===row.id){node.pause();node.removeAttribute('src');setPlayingId('');return;}node.pause();node.src=row.audioUrl;node.play().then(()=>setPlayingId(row.id)).catch(()=>setError('This recording could not be previewed.'));};
 const save=async()=>{if(!draft)return;setSaving(true);setError('');setNotice('');try{if(mode==='booking'){if(!booking)return;const r=await apiRequest(`/admin/dj-service-builder/${encodeURIComponent(booking.id)}`,{token,method:'PUT',body:{djSet:draft}});setBookings(rows=>rows.map(x=>x.id===booking.id?{...x,planning:r.item?.planning||{...x.planning,djSet:r.djSet||draft}}:x));}else await apiRequest('/admin/dj-service-builder/livestream',{token,method:'PUT',body:{djSet:draft}});setDirty(false);setNotice(mode==='booking'?'Booking set saved.':'Livestream set saved.');}catch(e){setError(e.message||'The set could not be saved.');}finally{setSaving(false);}};
 const review=async(item,decision)=>{if(!onReviewLiveRequest)return;setReviewing(item.id);setError('');let reviewed=false;try{await onReviewLiveRequest(item.id,{session:item.broadcastSessionId||liveStream?.broadcastSessionId||'',decision});reviewed=true;setRequests(rows=>rows.map(x=>x.id===item.id?{...x,requestStatus:decision==='approved'?'approved':'rejected'}:x));if(decision==='approved'){const current=await apiRequest('/admin/dj-service-builder/livestream',{token});const plan=liveSet(current.djSet);const track={id:`audience-${item.id}`,title:(item.track||item.message||'Audience request').slice(0,200),artist:item.artist||item.requesterName||'',notes:`Audience request · ${item.requesterName||'Listener'}`};if(!plan.segments.length)plan.segments=[makeSegment(0)];const target=plan.segments.find(s=>s.id===targetSegmentId)||plan.segments[0];target.manualTracks=[...(target.manualTracks||[]),track];target.entries=[...(target.entries||[]),{type:'manual',id:track.id}];await apiRequest('/admin/dj-service-builder/livestream',{token,method:'PUT',body:{djSet:plan}});if(mode==='livestream')setDraft(plan);}setNotice(decision==='approved'?'Request accepted and added to the livestream set.':'Request declined.');}catch(e){setError(reviewed?'Request was reviewed, but the livestream set could not be updated: '+(e.message||'retry from the livestream set editor.'):e.message||'Request review failed.');}finally{setReviewing('');}};
 const addManual=()=>{const title=manual.title.trim(),segment=segments.find(s=>s.id===targetSegmentId)||segments[0];if(!title||!segment)return;const track={id:uuid(),title,artist:manual.artist.trim(),notes:''};updateSegment(segment.id,{manualTracks:[...(segment.manualTracks||[]),track],entries:[...(segment.entries||[]),{type:'manual',id:track.id}]});setManual({title:'',artist:''});setNotice('Manual track added to '+segment.title+'.');};
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
 const ev=eventOf(booking||{}),when=dateOf(booking),live=mode==='livestream';
 return <section className="djb" aria-label="Set list builder">
  <header className="djb-top">
   <div className="djb-title" aria-hidden="true"/>
   <button type="button" className="djb-ghost" onClick={load} aria-label="Refresh recordings, bookings and requests"><RefreshCw size={15}/></button>
   <button type="button" className="djb-save" onClick={save} disabled={saving||!draft||(mode==='booking'&&!booking)}><Save size={16}/>{saving?'Saving…':dirty?'Save changes':'Save set list'}{dirty&&<i aria-hidden="true"/>}</button>
  </header>
  <section className="djb-scenarios" aria-label="Set list scenario">
   <p>What are you preparing for?</p>
   <div className="djb-switch" role="group" aria-label="Choose your scenario">
    {[['booking','Booking','Plan music by event moment.',CalendarDays],['livestream','Live stream','Build one continuous running order.',Radio]].map(([id,title,description,Icon])=><button key={id} type="button" aria-pressed={mode===id} className={mode===id?'on':''} onClick={()=>setMode(id)}><span className="djb-scenario-icon"><Icon size={23}/></span><span><strong>{title}</strong><small>{description}</small></span><span className="djb-scenario-check" aria-hidden="true">{mode===id&&<Check size={14}/>}</span></button>)}
   </div>
  </section>
  {error&&<p className="djb-msg is-error" role="alert">{error}</p>}{notice&&<p className="djb-msg" role="status">{notice}</p>}

  <div className="djb-context">
   {mode==='booking'?<>
    <label className="djb-pick"><span>Confirmed booking</span><select value={bookingId} onChange={e=>setBookingId(e.target.value)}><option value="">Choose a booking…</option>{bookings.map(x=><option key={x.id} value={x.id}>{x.requestNumber||x.id} · {x.customerName} · {dateOf(x)||'Date not set'}</option>)}</select></label>
    {booking?<ul className="djb-facts"><li><b>{booking.customerName||'Client event'}</b></li><li><CalendarDays size={14}/>{when||'Date not set'}</li>{timeOf(booking)&&<li><Clock3 size={14}/>{timeOf(booking)}</li>}<li><Disc3 size={14}/>{venueOf(booking)||'Venue not set'}</li>{(ev.guestCount||ev.guests)&&<li><Users size={14}/>{ev.guestCount||ev.guests} guests</li>}</ul>:<p className="djb-hint">{bookings.length?'Pick a booking to plan its music.':'No confirmed bookings yet.'}</p>}
   </>:<div className="djb-live"><Radio size={16}/><b>{liveStream?.title||'Livestream set'}</b><small>{liveStream?.isLive?'Live now':'Ready for the next livestream'}</small></div>}
   <ul className="djb-stats" aria-label="Set summary">{!live&&<li><b>{segments.length}</b>moments</li>}<li><b>{trackCount}</b>tracks</li><li><b>{clockText(total)}</b>library runtime</li></ul>
  </div>

  <div className="djb-workspace">
  <div className="djb-grid">

   <section className="djb-set" aria-label="Your set list">
    <div className="djb-panel-heading"><div><span className="djb-eyebrow">Organize</span><h2>{live?'Running order':'Event moments'}</h2><p>{live?'Arrange tracks in the order you want to play them.':'Choose a moment, then add tracks from the music panel.'}</p></div><ListMusic size={21}/></div>

    {mode==='booking'&&booking&&<label className="djb-notes"><span>Booking music notes</span><textarea value={draft?.notes||''} onChange={e=>updateSet({notes:e.target.value})} placeholder="Preferences, must-play and do-not-play songs, cues, transitions…"/></label>}
    {(!live&&!booking)?<p className="djb-empty big">Choose a confirmed booking above to start planning its music.</p>:<><ol className="djb-timeline">
     {segments.map((s,i)=>{const rows=entryRows(s),on=targetSegmentId===s.id,secs=runtime(s);
      return <li key={s.id} className={`djb-section${on?' is-target':''}${live?' is-flat':''}`}>
       {!live&&<div className="djb-rail"><span>{String(i+1).padStart(2,'0')}</span></div>}
       <article>
        {!live&&<header>
         <select className="djb-name" aria-label="Event moment" value={s.title} onChange={e=>updateSegment(s.id,{title:e.target.value})}><option value="">{moments.length?'Choose an event moment':'Add event moments in Work Elements'}</option>{moments.map(name=><option key={name} value={name}>{name}</option>)}{s.title&&!moments.includes(s.title)&&<option value={s.title}>{s.title} (not in Event moments)</option>}</select>
         <label className="djb-time"><Clock3 size={13}/><input aria-label="Section start time" type="time" value={s.startsAt||''} onChange={e=>updateSegment(s.id,{startsAt:e.target.value})}/></label>
         <span className="djb-sum">{rows.length} track{rows.length===1?'':'s'}{secs?` · ${clockText(secs)}`:''}</span>
         <div className="djb-icons">
          <button type="button" onClick={()=>moveSection(i,-1)} disabled={i===0} aria-label="Move section up"><ChevronUp size={15}/></button>
          <button type="button" onClick={()=>moveSection(i,1)} disabled={i===segments.length-1} aria-label="Move section down"><ChevronDown size={15}/></button>
          <button type="button" onClick={()=>updateSet({segments:segments.filter(x=>x.id!==s.id)})} aria-label={`Remove ${s.title}`}><Trash2 size={15}/></button>
         </div>
        </header>}
        {!live&&<button type="button" className="djb-target" aria-pressed={on} onClick={()=>setTargetSegmentId(s.id)}>{on?<><Check size={13}/>Selected · add music here</>:'Select this moment'}</button>}
        {rows.length===0?<p className="djb-empty">Choose tracks from Add music, or enter a song manually.</p>:<ol className="djb-tracks">{rows.map((x,n)=><li key={x.id} className={x.kind==='manual'?'is-manual':''}>
         {x.kind==="recording"?playBtn(x.row):<span className="djb-manual-ico"><Music2 size={14}/></span>}
         <span className="djb-n">{String(n+1).padStart(2,'0')}</span>
         <div className="djb-meta"><strong>{x.row.title}</strong><small>{x.kind==='recording'?`${x.row.artist||x.row.recordingType||x.row.workType||'Recording'} · ${formatDuration(durationOf(x.row))}`:x.row.notes||x.row.artist||'Manual track'}</small></div>
         <em>{x.kind==='recording'?'Library':'Manual'}</em>
         <div className="djb-icons"><button type="button" onClick={()=>move(s,x.j,-1)} disabled={x.j===0} aria-label={`Move ${x.row.title} up`}><ChevronUp size={15}/></button><button type="button" onClick={()=>move(s,x.j,1)} disabled={x.j===(s.entries||[]).length-1} aria-label={`Move ${x.row.title} down`}><ChevronDown size={15}/></button><button type="button" onClick={()=>removeEntry(s,x)} aria-label={`Remove ${x.row.title}`}><X size={15}/></button></div>
        </li>)}</ol>}
        {!live&&<input className="djb-cue" value={s.notes||''} onChange={e=>updateSegment(s.id,{notes:e.target.value})} placeholder="Section cue or note"/>}
       </article>
      </li>;})}
    </ol>
    {!segments.length&&!live&&<p className="djb-empty big">Your set is empty. Add a section to begin.</p>}
    {!live&&<button type="button" className="djb-add-section" onClick={addSection}><Plus size={16}/>Add event moment</button>}</>}
   </section>

   <aside className="djb-tools" aria-label="Add music">
    <div className="djb-panel-heading"><div><span className="djb-eyebrow">Choose</span><h2>Add music</h2><p>Preview a recording, then add it to your set.</p></div><Library size={21}/></div>

    {!live&&<div className="djb-dest"><label><span>Target event moment</span><select value={targetSegmentId} onChange={e=>setTargetSegmentId(e.target.value)} disabled={!segments.length||(!live&&!booking)}><option value="">Choose a section</option>{segments.map((s,i)=><option key={s.id} value={s.id}>{String(i+1).padStart(2,'0')} · {s.title||'Untitled moment'}</option>)}</select></label></div>}
    <div className="djb-tabs" role="group" aria-label="Music sources">
     {[['library','Library',Library,visible.length],['manual','Song / cue',PenLine,0],['requests','Requests',Inbox,pending.length]].map(([id,label,Icon,count])=><button key={id} aria-pressed={tab===id} className={tab===id?'on':''} type="button" onClick={()=>setTab(id)}><Icon size={15}/>{label}{id!=='manual'&&count>0&&<i>{count}</i>}</button>)}
    </div>
    <p className="djb-destination"><span>Adding to</span><strong>{!live&&!booking?'Choose a booking':live?'Live stream set':target?.title||'Untitled moment'}</strong></p>
    {tab==='library'&&<div className="djb-panel">
     <div className="djb-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search recordings" aria-label="Search recordings"/></div>
     <div className="djb-chips" role="group" aria-label="Filter by type">{['ALL',...types].map(t=><button key={t} type="button" aria-pressed={workType===t} onClick={()=>setWorkType(t)}>{t==='ALL'?'All':t}</button>)}</div>
     <ul className="djb-lib">{visible.map(row=>{const added=inTarget(row.id);return <li key={row.id}>{playBtn(row)}<div className="djb-meta"><strong>{row.title}</strong><small>{row.artist||row.recordingType||row.workType||'Recording'}{durationOf(row)?` · ${formatDuration(durationOf(row))}`:''}</small></div><button type="button" className="djb-add" disabled={!targetSegmentId||added||(!live&&!booking)} onClick={()=>addRecording(targetSegmentId,row.id)}>{added?<Check size={14}/>:<Plus size={14}/>}{added?'Added':'Add'}</button></li>;})}</ul>
     {!visible.length&&<p className="djb-empty">No recordings match.</p>}
    </div>}
    {tab==='manual'&&<form className="djb-panel djb-form" onSubmit={e=>{e.preventDefault();addManual();}}>
     <p className="djb-hint">A song or DJ cue that isn’t in your recordings.</p>
     <input value={manual.title} onChange={e=>setManual({...manual,title:e.target.value})} placeholder="Song or cue name" aria-label="Song or cue name"/>
     <input value={manual.artist} onChange={e=>setManual({...manual,artist:e.target.value})} placeholder="Artist (optional)" aria-label="Artist"/>
     <button type="submit" className="djb-add wide" disabled={!manual.title.trim()||!targetSegmentId||(!live&&!booking)}><Plus size={14}/>Add to {live?"the set list":target?.title||"a section"}</button>
    </form>}
    {tab==='requests'&&<div className="djb-panel">
     {pending.length?<ul className="djb-req">{pending.map(item=>{const canReview=Boolean(liveStream?.isLive&&item.broadcastSessionId===liveStream.broadcastSessionId);return <li key={item.id}><div className="djb-meta"><strong>{item.track||item.message||'Song request'}</strong><small>{item.artist||item.requesterName||'Audience'}{item.requesterName&&item.artist?` · ${item.requesterName}`:''}</small>{!canReview&&<small className="djb-warn">Start this livestream to review</small>}</div>
      <button className="djb-add" type="button" disabled={Boolean(reviewing)||!canReview} onClick={()=>review(item,'approved')}><Check size={14}/>Add</button><button className="djb-decline" type="button" disabled={Boolean(reviewing)||!canReview} onClick={()=>review(item,'rejected')}>Decline</button></li>;})}</ul>:<p className="djb-empty">No requests are waiting for review.</p>}
    </div>}
   </aside>
  </div>
  <aside className="djb-output" aria-label="Live set preview">
   <header className="djb-output-heading"><div><span className="djb-eyebrow"><Eye size={13}/>Live preview</span><h2>Your set at a glance</h2></div><span className="djb-preview-state">{dirty?'Unsaved changes':'Saved version'}</span></header>
   <div className="djb-output-title"><span>{live?'LIVE STREAM':'BOOKING'}</span><h3>{live?liveStream?.title||'Live stream set':booking?.customerName||'Choose a booking'}</h3><p>{live?'One continuous set':`${when||'Date not set'}${venueOf(booking)?' · '+venueOf(booking):''}`}</p></div>
   <div className="djb-output-totals"><span><b>{trackCount}</b> tracks</span><span><b>{clockText(total)}</b> known runtime</span></div>
   <p className="djb-output-help">Updates as you organize. Songs without a duration are excluded from runtime.</p>
   <ol className="djb-output-moments">{(live||booking)&&segments.map((segment,index)=><li key={segment.id} className={targetSegmentId===segment.id?'is-current':''}>
    <div className="djb-output-moment"><span>{String(index+1).padStart(2,'0')}</span><div><h4>{live?'Running order':segment.title||'Untitled moment'}</h4><small>{segment.startsAt?segment.startsAt+' · ':''}{entryRows(segment).length} tracks{runtime(segment)?' · '+clockText(runtime(segment)):''}</small></div></div>
    {entryRows(segment).length?<ol>{entryRows(segment).map((entry,index)=><li key={entry.id}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{entry.row.title}</strong><small>{entry.row.artist|| (entry.kind==='manual'?'Song / cue':'Library recording')}</small></div><time>{entry.kind==='recording'&&durationOf(entry.row)?formatDuration(durationOf(entry.row)):'—'}</time></li>)}</ol>:<p className="djb-output-empty">No tracks added yet</p>}
    {segment.notes&&<p className="djb-output-cue">Cue: {segment.notes}</p>}
   </li>)}</ol>
   {draft?.notes&&<div className="djb-output-notes"><strong>Music notes</strong><p>{draft.notes}</p></div>}
  </aside>
  </div><audio ref={audio} preload="none" onEnded={()=>setPlayingId('')} onPause={()=>setPlayingId('')}/>
 </section>;
}
