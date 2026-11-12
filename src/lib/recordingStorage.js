// Where the copies of a live recording are. "On OVH" means OVH really received parts: nothing is sent while the live is on air,
// so a recording in progress with no received bytes is only on the computer.
export function storedOn(item,file){
 const inCloud=item.partCount>0;
 const onOvh=item.status==='local'?false:item.status==='recording'?item.bytes>0:(!inCloud||Boolean(item.cleanupPending));
 return {onComputer:Boolean(file)||item.status==='local',onOvh,inCloud};
}
