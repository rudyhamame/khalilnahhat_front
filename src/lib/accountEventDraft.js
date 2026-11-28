import {withoutPending} from './pendingFiles.js';
import {aiFields,getPath,normalizeEventOrder} from './eventOrderCore.mjs';
function savedValuesMatch(order,saved){
 if(!saved||typeof saved!=='object')return false;
 const expected=normalizeEventOrder(order),actual=normalizeEventOrder(saved);
 const value=(source,path)=>path==='equipment'?(source.equipment||[]).map(({id,quantity})=>({id,quantity})):getPath(source,path);
 return aiFields.filter(field=>field.locked!=='account').every(field=>JSON.stringify(value(expected,field.key))===JSON.stringify(value(actual,field.key)));
}
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
    save:(fullOrder,draftId)=>enqueue(async()=>{
      const order=withoutPending(fullOrder);
      const {item}=await request('/ai-booking/event-draft',{method:'PUT',body:{version,draftId,order}});
      if(!Number.isSafeInteger(item?.version)||item.version<=version)throw Error('Draft save was not confirmed.');
      version=item.version;
      if(draftId&&item.draftId!==draftId||!savedValuesMatch(order,item.order))throw Error('The saved draft does not contain the requested changes.');
      loadedDraftId=item.draftId||draftId;
    }),
    remove:({draftId}={})=>enqueue(async()=>{
      const deletingId=draftId||loadedDraftId;
      const refresh=async()=>{const {item}=await request('/ai-booking/event-draft');if(item?.draftId&&deletingId&&item.draftId!==deletingId)throw Object.assign(new Error('A different draft is now active.'),{status:409});version=item?.version||0;};
      // A conflicting save must not disable the client's explicit delete action.
      await refresh();
      for(let attempt=0;attempt<3;attempt++){
        if(disposed)return;
        try{if(version>0||deletingId){const result=await request(`/ai-booking/event-draft?version=${version}${deletingId?`&draftId=${encodeURIComponent(deletingId)}`:''}`,{method:'DELETE',confirmedDelete:true});if(result.removed!==true||(deletingId&&result.conversationRemoved!==true))throw Error('Draft and conversation deletion was not confirmed.');}version=0;loadedDraftId=null;blocked=false;return;}
        catch(error){if(error.status!==409||attempt===2)throw error;await refresh();}
      }
    },{deletion:true}),
    // After a conflict: forget the block, read the server's current version and draft id, so the caller can save its own copy again under them.
    async recover(){blocked=false;const {item}=await request('/ai-booking/event-draft');version=item?.version||0;loadedDraftId=item?.draftId||null;return item;},
    block(){blocked=true;notify('conflict');},
    dispose(){disposed=true;},
  };
}
