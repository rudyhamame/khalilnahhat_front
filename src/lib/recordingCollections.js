// A recording sits in at most one collection, and only in one of its own work type.
// Returns the collection updates needed so that `recordingId` is in `chosenId` and in no other collection
// (collections of a different work type are always left, e.g. after the work type changed).
export function collectionPatches(collections,recordingId,recordingType,chosenId){
 const patches=[];
 for(const collection of collections){
  const ids=collection.recordingIds||[],has=ids.includes(recordingId);
  const should=collection.id===chosenId&&(!collection.workTypeId||collection.workTypeId===recordingType);
  if(should&&!has)patches.push({id:collection.id,recordingIds:[...ids,recordingId]});
  else if(!should&&has)patches.push({id:collection.id,recordingIds:ids.filter(id=>id!==recordingId)});
 }
 return patches;
}
