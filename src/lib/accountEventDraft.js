// Serialized writes + optimistic versions prevent stale tabs overwriting a draft.
export function accountEventDraft(request,onState=()=>{}){
  let version=null,blocked=false,disposed=false,chain=Promise.resolve(),loadedDraftId=null;
  const notify=value=>{if(!disposed)onState(value);};
  const enqueue=(operation,{deletion=false}={})=>{
    const result=chain.then(async()=>{
      if(disposed||(!deletion&&blocked)||version===null)return false;
      notify('saving');
      try{await operation();if(disposed)return false;notify('account-saved');return true;}
      catch(error){if(error.status===409)blocked=true;notify(deletion?(error.status===409?'delete-conflict':'delete-failed'):error.status===409?'conflict':'account-failed');return false;}
    });
    chain=result.catch(()=>{});return result;
  };
  return {
    async load(){const {item}=await request('/ai-booking/event-draft');version=item?.version||0;loadedDraftId=item?.draftId||null;return item;},
    save:(order,draftId)=>enqueue(async()=>{const {item}=await request('/ai-booking/event-draft',{method:'PUT',body:{version,draftId,order}});version=item.version;loadedDraftId=item.draftId||draftId;}),
    remove:({draftId}={})=>enqueue(async()=>{
      const deletingId=draftId||loadedDraftId;
      const refresh=async()=>{const {item}=await request('/ai-booking/event-draft');if(item?.draftId&&deletingId&&item.draftId!==deletingId)throw Object.assign(new Error('A different draft is now active.'),{status:409});version=item?.version||0;};
      // A conflicting save must not disable the client's explicit delete action.
      await refresh();
      for(let attempt=0;attempt<3;attempt++){
        if(disposed)return;
        try{if(version>0||deletingId){const result=await request(`/ai-booking/event-draft?version=${version}${deletingId?`&draftId=${encodeURIComponent(deletingId)}`:''}`,{method:'DELETE'});if(result.removed!==true||(deletingId&&result.conversationRemoved!==true))throw Error('Draft and conversation deletion was not confirmed.');}version=0;loadedDraftId=null;blocked=false;return;}
        catch(error){if(error.status!==409||attempt===2)throw error;await refresh();}
      }
    },{deletion:true}),
    block(){blocked=true;notify('conflict');},
    dispose(){disposed=true;},
  };
}
