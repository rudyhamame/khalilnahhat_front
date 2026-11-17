import {Plus} from 'lucide-react';
import {musicAtoms} from '../lib/musicAtoms.mjs';
import MovableWindow from './MovableWindow';

export default function MusicPreferencesPopup({booking,onClose,onAddSong}){
 const atoms=musicAtoms(booking);
 const song=(row,index)=><li key={index}><span><b>{row.title}</b>{(row.artist||row.moment)&&<small>{[row.moment,row.artist].filter(Boolean).join(' · ')}</small>}</span>{onAddSong&&<button type="button" className="djb-add" onClick={()=>onAddSong(row)}><Plus size={13}/>Add</button>}</li>;
 const group=(number,title,count,body)=><section className="djb-prefs-group"><h4><span>{number}</span>{title}<i>{count}</i></h4>{count?body:<p className="djb-empty">Nothing chosen yet.</p>}</section>;
 return <MovableWindow title="Music preferences" label="Music preferences from the booking" subtitle={booking?.customerName||'Client event'} onClose={onClose}>
  <div className="djb-prefs-body">
   {group(1,'Language & dialect',atoms.languages.length,<ul className="djb-prefs-tags">{atoms.languages.map(item=><li key={item.language}>{item.language}{item.dialects.length>0&&<small>{item.dialects.join(', ')}</small>}</li>)}</ul>)}
   {group(2,'Music genres',atoms.genres.length,<ul className="djb-prefs-tags">{atoms.genres.map(item=><li key={item}>{item}</li>)}</ul>)}
   {group(3,'Songs for event moments',atoms.moments.length,<ul className="djb-prefs-songs">{atoms.moments.map(song)}</ul>)}
   {group(4,'Favourite songs',atoms.favourites.length,<ul className="djb-prefs-songs">{atoms.favourites.map(song)}</ul>)}
   {group(5,'Favourite artists',atoms.artists.length,<ul className="djb-prefs-tags">{atoms.artists.map(item=><li key={item}>{item}</li>)}</ul>)}
  </div>
 </MovableWindow>;
}
