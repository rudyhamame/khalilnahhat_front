const songKey=song=>JSON.stringify([song.phase||'',song.song||'',song.artist||'',song.link||'']);
export const savedSuggestedSongs=rows=>rows.filter(row=>!(row.mode==='manual'&&!row.done)&&row.song.trim()&&(row.artist?.trim()||row.legacy)).map(({phase,song,artist,link})=>({phase:phase||'',song:song.trim(),...(artist?.trim()?{artist:artist.trim()}:{}),...(/^https:\/\/\S+$/i.test(String(link||'').trim())?{link:link.trim()}:{})}));

// External changes replace saved rows while preserving unfinished local entries.
// Match full records, including their position, so duplicate songs stay distinct.
export function reconcileSuggestedSongRows(rows,previous,incoming){
 const remaining=[...rows],saved=new Set(previous.map(songKey));
 const next=incoming.map((song,index)=>{
  const at=remaining.findIndex(row=>songKey(row)===songKey(song));
  const local=at<0?null:remaining.splice(at,1)[0];
  return {...local,...song,key:local?.key||`saved:${index}:${songKey(song)}`,legacy:!song.artist};
 });
 return [...next,...remaining.filter(row=>!saved.has(songKey(row))&&(row.mode==='manual'&&!row.done||!row.song?.trim()))];
}
