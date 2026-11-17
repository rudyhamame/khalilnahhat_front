import {favouriteSongEntries} from './favouriteSongs.mjs';
import {languagesOf,dialectsOf} from './languagePairs.mjs';

const list=value=>Array.isArray(value)?value:String(value||'').split(/[\n,;]+/).map(item=>item.trim()).filter(Boolean);
// The five parts of the booking's "Music preferences" form, read straight from the booking.
export function musicAtoms(booking){
 const music=booking?.order?.music||booking?.music||{},pairs=music.languagePairs||[];
 const languages=languagesOf(pairs).map(language=>({language,dialects:dialectsOf(pairs,language)}));
 const moments=(music.suggestedSongs||[]).filter(row=>row?.song).map(row=>({title:row.song,artist:row.artist||'',moment:row.phase||'',link:row.link||''}));
 const favourites=favouriteSongEntries(music.favouriteSongs).filter(row=>row.song).map(row=>({title:row.song,artist:row.artist,link:row.link}));
 return {languages,genres:list(music.genres),moments,favourites,artists:list(music.favouriteArtists),requestedSongs:moments.length+favourites.length};
}
