const entities={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>','#39':"'"};
const decode=value=>String(value||'').replace(/&(amp|quot|apos|lt|gt|#39);/g,(_,name)=>entities[name]);
// Turns a YouTube search result into a song entry, so the client needs no typing: "Artist - Song (Official Video)" is split, otherwise the channel names the artist.
export function songFromVideo(item){
 const title=decode(item?.title).replace(/\s*[\(\[](official|lyrics?|audio|video|music video|hd|4k)[^\)\]]*[\)\]]/gi,'').trim();
 const channel=decode(item?.channelTitle).replace(/\s*-\s*topic$/i,'').replace(/\s*vevo$/i,'').trim();
 const split=title.split(/\s+[-–—]\s+/);
 const [artist,song]=split.length>=2?[split[0].trim(),split.slice(1).join(' - ').trim()]:[channel,title];
 return {song:(song||title).slice(0,200),artist:(artist||channel).slice(0,200),link:typeof item?.url==='string'?item.url:''};
}
