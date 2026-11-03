const names=new Set(['update_event_draft','show_app_section','read_booking_data']);

// Complete function arguments are actionable before the spoken response ends.
// All provider event shapes share one call ID, one execution and one receipt.
export function createVoiceDraftTools({execute,send,isCurrent=()=>true}){
 const calls=new Map();let pending=0,active=false,completed=false,continuation=false;
 const resume=()=>{if(isCurrent()&&!active&&completed&&!pending&&continuation){continuation=false;send({type:'response.create'});}};
 return {
  begin(){active=true;completed=false;},
  finish(status){active=false;completed=status==='completed';resume();},
  run(item){
   if(!names.has(item?.name)||typeof item.call_id!=='string'||typeof item.arguments!=='string'||['incomplete','in_progress'].includes(item.status))return Promise.resolve(false);
   if(calls.has(item.call_id))return calls.get(item.call_id);
   pending++;
   const task=Promise.resolve().then(async()=>{
    if(!isCurrent())return false;
    let result;
    try{result=await execute(item);}catch{result={draftUpdated:false,updatedFields:[],rejectedFields:[],reason:'invalid_arguments',submitted:false};}
    if(isCurrent()){send({type:'conversation.item.create',item:{type:'function_call_output',call_id:item.call_id,output:JSON.stringify(result)}});continuation=true;}
    return true;
   }).finally(()=>{pending--;resume();});
   calls.set(item.call_id,task);return task;
  },
 };
}
