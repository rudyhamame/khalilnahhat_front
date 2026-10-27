import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Check,ChevronDown,ChevronUp,Disc3} from 'lucide-react';
import './archiveLibraryColumns.css';

export default function ArchiveLibraryColumns({library,category,albumId,onCategory,onAlbum,artwork,ar,children}){
  const tr=(en,arabic)=>ar?arabic:en;
  const [flights,setFlights]=useState(null);
  const [categoryChosen,setCategoryChosen]=useState(()=>Boolean(category));
  const wheel=useRef(null),timer=useRef(null);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  const albums=library.albums.filter(item=>!category||item.categoryId===category);
  const index=Math.max(0,albums.findIndex(item=>item.id===albumId));
  const title=item=>item.isLoose?tr('Unfiled recordings','تسجيلات غير مصنفة في ألبوم'):item.title;
  const cover=item=>item.coverImage||artwork(library.songs.find(song=>song.albumId===item.id)||{});
  const choose=(event,id)=>{
    setCategoryChosen(true);
    const next=library.albums.filter(item=>!id||item.categoryId===id);
    const source=event.currentTarget.getBoundingClientRect(),target=wheel.current?.getBoundingClientRect();
    clearTimeout(timer.current);
    if(target&&next.length&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const token=Date.now();
      const arrivalY=target.top+16+(target.width<100?27:target.width<150?39:45);
      setFlights({token,items:next.slice(0,5).map((item,i)=>({id:item.id,cover:cover(item),x:source.left+source.width*.5-30,y:source.top+source.height*.45-30,dx:target.left+target.width*.5-source.left-source.width*.5,dy:arrivalY-source.top-source.height*.45+i*32,delay:i*90}))});
      timer.current=setTimeout(()=>setFlights(null),1500);
    }else setFlights(null);
    onCategory(id);
  };
  const step=delta=>{if(categoryChosen&&albums.length)onAlbum(albums[(index+delta+albums.length)%albums.length].id);};
  return <div className="home-archive-library">
    <aside className="archive-category-column" aria-label={tr('Category folders','مجلدات الفئات')}>
      <header><span>{tr('THE COLLECTION','المجموعة')}</span><h3>{tr('Categories','الفئات')}</h3></header>
      <div className="archive-folder-stack">
        {[{id:'',title:tr('All recordings','كل التسجيلات')},...library.categories].map((item,i)=>{
          const contents=library.albums.filter(album=>!item.id||album.categoryId===item.id);
          return <button key={item.id} type="button" className={`archive-category-folder${categoryChosen&&category===item.id?' is-open':''}`} aria-pressed={categoryChosen&&category===item.id} onClick={event=>choose(event,item.id)} style={{'--folder-index':i}}>
            <span className="archive-folder-object" aria-hidden="true"><i className="archive-folder-back"/>
              <span className="archive-folder-papers">{(contents.length?contents.slice(0,3):[null,null]).map((album,n)=><i key={album?.id||n} style={{'--paper-index':n}}>{album?<img src={cover(album)} alt=""/>:<Disc3 size={20}/>}</i>)}</span>
              <span className="archive-folder-front"><strong>{item.title}{categoryChosen&&category===item.id&&<Check size={14} aria-hidden="true"/>}</strong><small>{contents.length} {tr(contents.length===1?'collection':'collections','مجموعات')}</small></span>
            </span>
          </button>;
        })}
      </div>
    </aside>
    {children}
    <aside className="archive-album-column" aria-label={tr('Albums in selected category','ألبومات الفئة المختارة')}>
      <header><span>{categoryChosen?(library.categories.find(item=>item.id===category)?.title||tr('ALL CATEGORIES','كل الفئات')):tr('CHOOSE A CATEGORY','اختر فئة')}</span><h3>{tr('Albums','الألبومات')}</h3></header>
      <div className="archive-album-wheel" ref={wheel} role="group" aria-label={tr('Album wheel','عجلة الألبومات')} onKeyDown={event=>{if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();step(event.key==='ArrowUp'?-1:1);}}}>
        {categoryChosen&&albums.map((item,i)=>({item,offset:(i-index+albums.length)%albums.length})).filter(({offset})=>offset<=2).map(({item,offset})=><button key={`${category}:${item.id}`} type="button" className={`archive-wheel-album${offset===0?' is-current':''}${flights?' is-arriving':''}`} style={{'--album-offset':offset,'--album-depth':offset,zIndex:5-offset}} aria-pressed={albumId===item.id} aria-label={`${tr('Select album','اختر الألبوم')} ${title(item)}`} onClick={()=>onAlbum(item.id)}>
          <img src={cover(item)} alt="" loading="lazy"/><strong>{title(item)}</strong>{item.year&&<small>{item.year}</small>}
        </button>)}
        {!categoryChosen&&<div className="archive-album-placeholder" role="status"><span aria-hidden="true"><Disc3 size={35} strokeWidth={1}/></span><strong>{tr('Choose a category','اختر فئة')}</strong><p>{tr('Its albums will appear here.','ستظهر ألبوماتها هنا.')}</p></div>}
        {categoryChosen&&!albums.length&&<p className="archive-album-empty">{tr('No published albums in this category yet.','لا توجد ألبومات منشورة في هذه الفئة بعد.')}</p>}
      </div>
      {categoryChosen&&<footer><button type="button" disabled={albums.length<2} aria-label={tr('Previous album','الألبوم السابق')} onClick={()=>step(-1)}><ChevronUp size={18}/></button><span aria-live="polite">{albums.length?`${index+1} / ${albums.length}`:'0 / 0'}</span><button type="button" disabled={albums.length<2} aria-label={tr('Next album','الألبوم التالي')} onClick={()=>step(1)}><ChevronDown size={18}/></button></footer>}
      {albumId&&<button type="button" className="archive-album-all" onClick={()=>onAlbum('')}>{tr('All recordings in category','كل تسجيلات الفئة')}</button>}
    </aside>
    {flights&&createPortal(<div className="archive-album-flights" key={flights.token} aria-hidden="true">{flights.items.map(item=><img key={item.id} src={item.cover} alt="" style={{left:item.x,top:item.y,'--flight-x':`${item.dx}px`,'--flight-y':`${item.dy}px`,animationDelay:`${item.delay}ms`}}/>)}</div>,document.body)}
  </div>;
}
