// A display-only collection keeps older, unfiled recordings browsable without
// pretending that they are published albums or changing the stored catalog.
export function archiveLibrary(catalog){
  const categories=catalog.categories.map(item=>({...item}));
  const albums=catalog.albums.map(item=>({...item}));
  const songs=catalog.songs.filter(item=>item.audioUrl).map(item=>{
    if(albums.some(album=>album.id===item.albumId))return item;
    const legacy=String(item.category||'').trim();
    const categoryId=legacy?`legacy:${legacy}`:'unfiled';
    if(!categories.some(category=>category.id===categoryId))categories.push({id:categoryId,title:legacy||'Recordings',isLegacy:true});
    const albumId=`loose:${categoryId}`;
    if(!albums.some(album=>album.id===albumId))albums.push({id:albumId,categoryId,title:'Unfiled recordings',coverImage:item.coverImage||'',isLoose:true});
    return {...item,albumId};
  });
  return {categories,albums,songs};
}
