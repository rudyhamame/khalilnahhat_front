import {useState} from 'react';
import {Check,Disc3} from 'lucide-react';
import './archiveLibraryColumns.css';

export default function ArchiveLibraryColumns({library,category,albumId,onCategory,onAlbum,artwork,ar,children}){
  const tr=(en,arabic)=>ar?arabic:en;
  const [categoryChosen,setCategoryChosen]=useState(()=>Boolean(category));
  const albums=library.albums.filter(item=>!category||item.categoryId===category);
  const title=item=>item.isLoose?tr('Unfiled recordings','تسجيلات غير مصنفة في ألبوم'):item.title;
  const cover=item=>item.coverImage||artwork(library.songs.find(song=>song.albumId===item.id)||{});
  const choose=id=>{setCategoryChosen(true);onCategory(id);};
  return <div className="home-archive-library">
    <aside className="archive-category-column" aria-label={tr('Category folders','مجلدات الفئات')}>
      <header><span>{tr('CHOOSE A CATEGORY','اختر فئة')}</span></header>
      <div className="archive-folder-stack">
        {[{id:'',title:tr('All recordings','كل التسجيلات')},...library.categories].map((item,i)=>{
          const contents=library.albums.filter(album=>!item.id||album.categoryId===item.id);
          return <button key={item.id} type="button" className={`archive-category-folder${categoryChosen&&category===item.id?' is-open':''}`} aria-pressed={categoryChosen&&category===item.id} onClick={()=>choose(item.id)} style={{'--folder-index':i}}>
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
      <header><span>{categoryChosen?(library.categories.find(item=>item.id===category)?.title||tr('ALL CATEGORIES','كل الفئات')):tr('CHOOSE AN ALBUM','اختر ألبومًا')}</span></header>
      <div className="archive-album-grid" role="group" aria-label={tr('Albums','الألبومات')}>
        {categoryChosen&&albums.map(item=><button key={`${category}:${item.id}`} type="button" className={`archive-album-card${albumId===item.id?' is-current':''}`} aria-pressed={albumId===item.id} aria-label={`${tr('Select album','اختر الألبوم')} ${title(item)}`} onClick={()=>onAlbum(item.id)}>
          <img src={cover(item)} alt="" loading="lazy"/><strong>{title(item)}</strong>{item.year&&<small>{item.year}</small>}
        </button>)}
        {categoryChosen&&!albums.length&&<p className="archive-album-empty">{tr('No published albums in this category yet.','لا توجد ألبومات منشورة في هذه الفئة بعد.')}</p>}
      </div>
      {albumId&&<button type="button" className="archive-album-all" onClick={()=>onAlbum('')}>{tr('All recordings in category','كل تسجيلات الفئة')}</button>}
    </aside>
  </div>;
}
