export async function startStudioBroadcast({title,saveRecording,transport='livekit',request,askLocalOnly,hasFolder,makeId=()=>crypto.randomUUID()}){
 try{return await request({title,transport,recordingMode:transport==='ovh'?'ovh':'direct',saveRecording});}
 catch(error){
  if(!saveRecording||![503,507].includes(error.status)||!/record|disk|storage|archive/i.test(error.message))throw error;
  if(!await askLocalOnly())throw new Error('Go live canceled. No recording was started.');
  if(!hasFolder())throw new Error('Choose a recording folder for device-only recording.');
  const result=await request({title,transport:'livekit',recordingMode:'direct',saveRecording:false});
  return {...result,recording:{mode:'local',id:'local-'+makeId()}};
 }
}
