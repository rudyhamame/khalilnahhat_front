import {recordingTypeLabel,recordingComponents,fetchDjWorkTypes} from '../lib/musicOntology';
import {SlidersHorizontal,X,Disc3,Play,Pause,LoaderCircle} from 'lucide-react';
import {useEffect,useId,useState} from 'react';
import {apiRequest} from '../lib/api';
import OntologyFilters from './OntologyFilters';
import {archivePlayerCommand} from '../lib/archivePlayerBridge';
import './musicOntology.css';
export default function OntologyPlayerBrowser({library,children,filters,onFilters,song,player,loading,error,ar}){
 const [vocabulary,setVocabulary]=useState([]),[workTypes,setWorkTypes]=useState([]),[filtersOpen,setFiltersOpen]=useState(false);
 const filterId=useId();
 const filterCount=Object.entries(filters).filter(([key,v])=>v!==''&&v!=null&&!(key==='bpmScope'&&v==='work')).length;
 useEffect(()=>{const controller=new AbortController();apiRequest('/music-ontology/vocabulary',{signal:controller.signal}).then(r=>setVocabulary(r.items||[])).catch(()=>{});fetchDjWorkTypes().then(setWorkTypes).catch(()=>{});return()=>controller.abort();},[]);
 useEffect(()=>{if(!filtersOpen)return undefined;const onKey=event=>{if(event.key==='Escape')setFiltersOpen(false);};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[filtersOpen]);
 const tr=(en,arabic)=>ar?arabic:en;
 const shown=library.songs;
 return <div className="home-archive-library ontology-player-browser" dir={ar?'rtl':'ltr'}><aside id={filterId} className="archive-filter-column" data-open={filtersOpen||undefined} inert={!filtersOpen} aria-label={tr('Explore & filter recordings','استكشف وصفّ التسجيلات')}><div className="archive-filter-bar"><span>{filterCount>0?`${filterCount} ${tr('active','نشطة')} · `:''}{shown.length} {tr('results','نتائج')}</span><button type="button" onClick={()=>setFiltersOpen(false)} aria-label={tr('Close recording filters','إغلاق مرشحات التسجيلات')}><X size={15}/></button></div>{error&&<p role="alert">{error}</p>}<OntologyFilters inline value={filters} onChange={onFilters} vocabulary={vocabulary} workTypes={workTypes}/></aside><aside className="ontology-player-explore archive-recording-column" aria-label={tr('Recordings to play','تسجيلات للتشغيل')}><header><span>{tr('RECORDINGS','التسجيلات')}</span><div className="archive-heading-tools"><small>{shown.length}</small><button type="button" className="archive-filter-toggle" aria-expanded={filtersOpen} aria-controls={filterId} aria-label={tr('Explore & filter recordings','استكشف وصفّ التسجيلات')} title={tr('Explore & filter recordings','استكشف وصفّ التسجيلات')} onClick={()=>setFiltersOpen(open=>!open)}><SlidersHorizontal size={16}/>{filterCount>0&&<b>{filterCount}</b>}</button></div></header>{error&&<p role="alert">{error}</p>}<div className="archive-playable-recordings">{shown.filter(row=>row.audioUrl).map(row=>{
 const content=recordingComponents(row),current=player.track?.id===row.id;
 const playing=current&&player.playing,busy=current&&(player.preparing||player.buffering);
 const names=items=>[...new Set(items.filter(Boolean))].join(' · ');
 const genres=names([...(row.recordingMetadata?.genres||[]),...content.flatMap(item=>item.melody?.genres||[])].map(item=>item.name));
 const language=names(content.map(item=>item.lyrics?.language?.name));
 const dialect=names(content.map(item=>item.lyrics?.dialect?.name));
 const duration=row.duration||(Number.isFinite(row.audio?.durationSeconds)?Math.floor(row.audio.durationSeconds/60)+':'+String(Math.floor(row.audio.durationSeconds%60)).padStart(2,'0'):'');
 const play=()=>{if(current)archivePlayerCommand(playing||busy?'pause':'toggle');else window.dispatchEvent(new CustomEvent('echo:archive-play',{detail:{id:row.id,ids:shown.filter(item=>item.audioUrl).map(item=>item.id),inline:true}}));};
 const hash=[...String(row.id)].reduce((sum,char)=>(sum*31+char.charCodeAt(0))>>>0,7),cap=['ivory','amber','orange'][hash%3];
 return <button type="button" className="archive-playable-recording" data-cap={cap} key={row.id} aria-label={(playing||busy?tr('Pause','إيقاف مؤقت'):tr('Play','تشغيل'))+' '+row.title} aria-current={current?'true':undefined} data-selected={song?.id===row.id||undefined} onClick={play}><span className="cap-state" aria-hidden="true">{busy?<LoaderCircle size={13}/>:playing?<Pause size={12} fill="currentColor"/>:<Play size={12} fill="currentColor"/>}</span><strong dir="auto">{row.title}</strong>{(row.recordingType||duration)&&<small className="cap-meta">{row.recordingType&&((ar?row.recordingTypeDefinition?.nameArabic:row.recordingTypeDefinition?.name)||recordingTypeLabel(row.recordingType))}{duration&&<time> · {duration}</time>}</small>}</button>;
 })}</div>{!loading&&!error&&!shown.some(row=>row.audioUrl)&&<p className="archive-recordings-empty">{tr('No matching recordings.','لا توجد تسجيلات مطابقة.')}</p>}</aside>{children}</div>;
}
