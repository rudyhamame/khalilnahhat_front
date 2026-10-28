import {useEffect,useRef,useState} from 'react';
import {Camera,Quote,ChevronLeft,ChevronRight,Video,Music2,Pause,Play} from 'lucide-react';
import {DEMO_REVIEWS} from './HeroReviews';
import {GALLERY_PREVIEWS} from './HeroGallery';
import {useSeasonalRecordings,DEFAULT_SEASONAL_AUDIO} from './seasonalMusic';
import {ARCHIVE_PLAYER_STATE,readArchivePlayerState,archivePlayerCommand} from '../lib/archivePlayerBridge';
import SeasonalTreeInspector from './SeasonalTreeInspector';
import {useSeasonalPlayer} from './seasonalPlayerContext';
import './seasonalTree.css';
const slots=[[49,28],[34,41],[65,42],[24,56],[50,57],[76,57],[17,76],[39,78],[62,77],[84,78]];
export default function SeasonalTree({reviews=[],media=[],loading=false,ar=false,lights=true,audio=DEFAULT_SEASONAL_AUDIO,audioState,onAudioPlay,onAudioSeek}){
 const globalPlayer=useSeasonalPlayer(),minimized=useRef(false);
 const [page,setPage]=useState(0),[selected,setSelected]=useState(null),tr=(en,arabic)=>ar?arabic:en;
 const {tracks:christmasTracks,error:musicError}=useSeasonalRecordings(audio);
 const [archivePlayer,setArchivePlayer]=useState(readArchivePlayerState);
 const playedHere=useRef(false),ownedTrack=useRef(null),audioIds=useRef([]);audioIds.current=christmasTracks.map(track=>track.id);
 useEffect(()=>{const update=event=>setArchivePlayer(event.detail);window.addEventListener(ARCHIVE_PLAYER_STATE,update);return()=>{window.removeEventListener(ARCHIVE_PLAYER_STATE,update);if(!minimized.current&&playedHere.current&&readArchivePlayerState().track?.id===ownedTrack.current)archivePlayerCommand('pause');};},[]);
 const selectionKey=audio.archiveIds?.join('|')||'';
 useEffect(()=>{if(!onAudioPlay&&playedHere.current&&(!audio.enabled||!selectionKey.split('|').includes(ownedTrack.current))){if(readArchivePlayerState().track?.id===ownedTrack.current)archivePlayerCommand('pause');ownedTrack.current=null;}},[audio.enabled,selectionKey,onAudioPlay]);
 const player=audioState||archivePlayer;
 const playAudio=track=>{if(onAudioPlay){onAudioPlay(track);return;}playedHere.current=true;ownedTrack.current=track.id;if(player.track?.id===track.id&&player.enabled){archivePlayerCommand(player.playing||player.preparing?'pause':'toggle');}else{window.dispatchEvent(new CustomEvent('echo:archive-play',{detail:{id:track.id,ids:audioIds.current,inline:true}}));}};
 const scene=useRef(null),returnFocus=useRef(null);
 const openItem=(item,event)=>{const rect=scene.current?.getBoundingClientRect();if(!rect)return;returnFocus.current=event.currentTarget;if(item.type==='video')stopPlayback();const selection={item,origin:{left:rect.left,top:rect.top,width:rect.width,height:rect.height}};minimized.current=false;setSelected(selection);if(globalPlayer&&!onAudioPlay)globalPlayer({...selection,key:crypto.randomUUID(),tree:treeContents,ar,ids:audioIds.current,onClose:()=>{setSelected(current=>current?.item===item?null:current);requestAnimationFrame(()=>returnFocus.current?.isConnected&&returnFocus.current.focus({preventScroll:true}));},onMinimized:value=>{minimized.current=value;setSelected(current=>current?{...current,minimized:value}:current);}});};
 const closeItem=()=>{setSelected(null);requestAnimationFrame(()=>returnFocus.current?.focus({preventScroll:true}));};
 const stopPlayback=()=>{if(onAudioPlay){if(player.track&&(player.playing||player.preparing))onAudioPlay(player.track);}else if(player.playing||player.preparing)archivePlayerCommand('pause');};
 const realReviews=reviews.filter(item=>item.published!==false&&(item.text||item.textAr));
 const realPhotos=media.filter(item=>item.kind==='photo'&&item.mediaUrl&&item.published!==false);
 const videoItems=media.filter(item=>item.kind==='video'&&item.mediaUrl&&item.published!==false);
 const reviewItems=realReviews.length?realReviews:loading?[]:DEMO_REVIEWS;
 const photoItems=realPhotos.length?realPhotos:loading?[]:GALLERY_PREVIEWS;
 const items=christmasTracks.map(track=>({...track,type:'audio'}));for(let i=0;i<Math.max(reviewItems.length,photoItems.length,videoItems.length);i++){if(reviewItems[i])items.push({...reviewItems[i],type:'review'});if(photoItems[i])items.push({...photoItems[i],type:'photo'});if(videoItems[i])items.push({...videoItems[i],type:'video'});}
 const pages=Math.max(1,Math.ceil(items.length/slots.length)),active=page%pages;
 const treeContents=<>
   <img className="seasonal-tree-art" src="/echo/christmas-memory-tree.webp" alt="" width="1049" height="1500"/>
   {lights&&<div className="seasonal-tree-lights" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{left:`${22+(i%5)*14}%`,top:`${35+Math.floor(i/5)*14}%`,'--delay':`${i*.3}s`}}/>)}</div>}
   {items.slice(active*slots.length,(active+1)*slots.length).map((item,i)=><button type="button" key={`${item.type}-${item.id||i}`} className={`seasonal-ornament is-${item.type}`} style={{left:`${slots[i][0]}%`,top:`${slots[i][1]}%`,'--tilt':`${i%2?-6:7}deg`}} onClick={event=>openItem(item,event)} aria-haspopup="dialog" aria-label={item.type==='audio'?`${tr('Open audio','افتح الصوت')}: ${item.title}`:item.type==='video'?`${tr('Open video','افتح الفيديو')}: ${ar&&item.titleAr?item.titleAr:item.title}`:item.type==='photo'?`${tr('Open photo','افتح الصورة')}: ${ar&&item.titleAr?item.titleAr:item.title||tr('Event gallery','صور الفعاليات')}`:`${tr('Read review by','اقرأ رأي')} ${item.name}`}>
    {item.type==='audio'?<>{player.track?.id===item.id&&(player.playing||player.preparing)?<Pause size={18}/>:<Music2 size={18}/>}<span>{item.title}</span><Play size={10}/></>:item.type==='video'?<><Video size={22}/><span>{ar&&item.titleAr?item.titleAr:item.title}</span></>:item.type==='photo'?<><img src={item.mediaUrl} alt="" loading="lazy"/><Camera size={10}/></>:<><Quote size={16}/><span>{item.name?.split(' ')[0]||tr('Review','رأي')}</span></>}
   </button>)}
 </>;
 return <section className={`seasonal-tree${lights?' has-lights':''}${selected&&!selected.minimized?' is-inspecting':''}`} aria-label={tr('Christmas memories tree','شجرة ذكريات الميلاد')} dir={ar?'rtl':'ltr'}>
  <header><span>{tr('A SEASON OF MEMORIES','موسم من الذكريات')}</span><p>{tr('A little magic. Your favourite moments.','قليل من السحر. ولحظاتكم المفضلة.')}</p></header>
  <div className="seasonal-tree-stage"><div className="seasonal-tree-scene" dir="ltr" ref={scene}>
   {treeContents}
  </div></div>
  <footer><span>{loading?tr('Loading memories…','جارٍ تحميل الذكريات…'):tr('Tap a decoration to open a memory','اضغط على الزينة لفتح ذكرى')}</span>{pages>1&&<div><button type="button" onClick={()=>setPage((active-1+pages)%pages)} aria-label={tr('Previous decorations','الزينة السابقة')}><ChevronLeft size={16}/></button><span aria-live="polite">{active+1} / {pages}</span><button type="button" onClick={()=>setPage((active+1)%pages)} aria-label={tr('More decorations','المزيد من الزينة')}><ChevronRight size={16}/></button></div>}</footer>
  {(musicError||(player.error&&christmasTracks.some(track=>track.id===player.track?.id)))&&<p className="seasonal-music-error" role="status">{ar?'تعذر تشغيل الموسيقى. حاول مرة أخرى.':musicError||player.error}</p>}
  {selected&&(!globalPlayer||onAudioPlay)&&<SeasonalTreeInspector item={selected.item} origin={selected.origin} tree={treeContents} ar={ar} player={player} onPlay={playAudio} onSeek={value=>onAudioSeek?onAudioSeek(value):archivePlayerCommand('seek',value)} onStop={stopPlayback} onClose={closeItem} onMinimized={value=>{minimized.current=value;setSelected(current=>({...current,minimized:value}));}}/>}
 </section>;
}
