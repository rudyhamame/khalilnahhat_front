// Serialized writes + optimistic versions prevent stale tabs overwriting a draft.
export function accountEventDraft(request,onState=()=>{}){
  let version=null,blocked=false,disposed=false,chain=Promise.resolve();
  const notify=value=>{if(!disposed)onState(value);};
  const enqueue=operation=>{
    const result=chain.then(async()=>{
      if(disposed||blocked||version===null)return false;
      notify('saving');
      try{await operation();notify('account-saved');return true;}
      catch(error){if(error.status===409)blocked=true;notify(error.status===409?'conflict':'account-failed');return false;}
    });
    chain=result.catch(()=>{});return result;
  };
  return {
    async load(){const {item}=await request('/ai-booking/event-draft');version=item?.version||0;return item;},
    save:order=>enqueue(async()=>{const {item}=await request('/ai-booking/event-draft',{method:'PUT',body:{version,order}});version=item.version;}),
    remove:()=>enqueue(async()=>{if(version>0)await request(`/ai-booking/event-draft?version=${version}`,{method:'DELETE'});version=0;}),
    block(){blocked=true;notify('conflict');},
    dispose(){disposed=true;},
  };
}
