export async function startStudioBroadcast({title,saveRecording,outputs,setListId='none',transport='livekit',request,askLocalOnly,hasFolder,localOnly=false,makeId=()=>crypto.randomUUID()}){
 // Cloud saving turned off: the recording stays in the chosen folder and nothing is uploaded.
 if(localOnly&&saveRecording&&transport!=='ovh'){
  if(!hasFolder())throw new Error('Choose a recording folder for device-only recording.');
  const result=await request({title,transport:'livekit',setListId,recordingMode:'direct',saveRecording:false,...(outputs?{outputs}:{})});
  return {...result,recording:{mode:'local',id:'local-'+makeId()}};
 }
 try{return await request({title,transport,setListId,recordingMode:transport==='ovh'?'ovh':'direct',saveRecording,...(outputs?{outputs}:{})});}
 catch(error){
  if(!saveRecording||![503,507].includes(error.status)||!/record|disk|storage|archive/i.test(error.message))throw error;
  if(!await askLocalOnly())throw new Error('Go live canceled. No recording was started.');
  if(!hasFolder())throw new Error('Choose a recording folder for device-only recording.');
  const result=await request({title,transport:'livekit',setListId,recordingMode:'direct',saveRecording:false,...(outputs?{outputs}:{})});
  return {...result,recording:{mode:'local',id:'local-'+makeId()}};
 }
}
