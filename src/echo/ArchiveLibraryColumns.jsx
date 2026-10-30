import {Check,Disc3} from 'lucide-react';
import './archiveLibraryColumns.css';

// The column lists hand-built collections; recordings stay in the player.
export default function ArchiveLibraryColumns({library,collectionId,onCollection,artwork,ar,children}){
  const tr=(en,arabic)=>ar?arabic:en;
  return <div className="home-archive-library has-one-side-column">
    <aside className="archive-category-column" aria-label={tr('Collections','المجموعات')}>
      <header><span>{tr('CHOOSE A COLLECTION','اختر مجموعة')}</span></header>
      
      {!library.collections.length&&<p>{tr('No collections published yet.','لا توجد مجموعات منشورة بعد.')}</p>}
      <div className="archive-folder-stack">
        {library.collections.map((item,i)=>{
          const songs=item.recordingIds.map(id=>library.songs.find(song=>song.id===id)).filter(Boolean);
          const open=collectionId===item.id;
          return <button key={item.id} type="button" className={`archive-category-folder${open?' is-open':''}`} aria-pressed={open} onClick={()=>onCollection(open?'':item.id)} style={{'--folder-index':i}}>
            <span className="archive-folder-object" aria-hidden="true"><i className="archive-folder-back"/>
              <span className="archive-folder-papers">{(songs.length?songs.slice(0,3):[null,null]).map((song,n)=><i key={song?.id||n} style={{'--paper-index':n}}>{song?<img src={item.coverImage||artwork(song)} alt=""/>:<Disc3 size={20}/>}</i>)}</span>
              <span className="archive-folder-front"><strong>{item.title}{open&&<Check size={14} aria-hidden="true"/>}</strong><small>{songs.length} {tr(songs.length===1?'recording':'recordings','تسجيلات')}</small></span>
            </span>
          </button>;
        })}
      </div>
    </aside>
    {children}
  </div>;
}
