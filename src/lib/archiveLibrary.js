// Only recordings with playable audio are browsable; collections are shown as the admin built them.
export function archiveLibrary(catalog){
  return {collections:catalog.collections.map(item=>({...item})),songs:catalog.songs.filter(item=>item.audioUrl)};
}
