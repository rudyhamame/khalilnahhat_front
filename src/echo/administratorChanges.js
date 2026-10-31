import {administratorDestination} from './administratorActivity';
export const administratorDataChanged='echo:administrator-data-changed';
const seen=new Set();
export function notifyAdministratorChanges(task,{historical=false}={}){
 const changes=[];
 for(const action of task?.actions||[]){
  if(action.state!=='VERIFIED'||!action.id||!/(?:_save|_update|_create|_note)$/.test(action.name||''))continue;
  const key=task._id+':'+action.id;if(seen.has(key))continue;
  seen.add(key);if(!historical)changes.push({id:action.id,name:action.name,destination:administratorDestination(action.name)?.url||null});
 }
 if(seen.size>2000){for(const key of [...seen].slice(0,seen.size-1000))seen.delete(key);}
 if(changes.length)window.dispatchEvent(new CustomEvent(administratorDataChanged,{detail:{changes}}));
}
