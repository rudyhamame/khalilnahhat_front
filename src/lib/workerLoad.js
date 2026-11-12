import {apiRequest} from './api';

// Asked before a process that runs on the OVH worker starts. When the server is busy (or not answering) the process is not started
// and the admin is told to try again later.
export async function ensureWorkerReady(token){
 let load;
 try{load=await apiRequest('/admin/music-archive/worker-load',{token});}
 catch{load={busy:true,reason:'The OVH server could not be reached.'};}
 if(load.busy)throw Object.assign(Error(`${load.reason||'The OVH server is busy.'} Please try again in a few minutes.`),{serverBusy:true});
}
