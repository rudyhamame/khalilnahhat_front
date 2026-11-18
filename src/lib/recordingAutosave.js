// Acknowledge only server-owned fields. User fields and local playback URLs stay untouched.
export function acknowledgeRecordingAutosave(current,submitted,item){
 const acknowledgement={revision:item.revision??submitted.value.revision??0,status:item.status||submitted.value.status||'DRAFT'};
 return {
  editor:{...current,id:item.id,value:{...current.value,...acknowledgement}},
  baseline:JSON.stringify({...submitted.value,...acknowledgement}),
 };
}
