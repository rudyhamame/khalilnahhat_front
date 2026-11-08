export const destinationLabels={youtube:'YouTube',instagram:'Instagram',tiktok:'TikTok'};
export function destinationSources(items,roomName,orientation){
 if(!roomName)return [];
 return (items||[]).filter(item=>{
  if(!destinationLabels[item.platform]||item.roomName!==roomName)return false;
  if(!['starting','live','stopping','failed','error'].includes(item.state))return false;
  const format=item.format?.toLowerCase()||'';
  const output=format.includes('portrait')?'portrait':format.includes('landscape')?'landscape':item.platform==='youtube'?'landscape':'portrait';
  return output===orientation;
 });
}
export function destinationSourceState(state,unavailable=false){
 return unavailable?'Status unavailable':({starting:'Starting',live:'Sending',stopping:'Stopping',failed:'Failed',error:'Error'})[state]||'Not sending';
}
