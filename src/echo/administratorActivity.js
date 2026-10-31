// The worker calls authenticated API adapters. This view visualizes those real actions;
// it never dispatches synthetic clicks or pretends the worker operates the browser.
const type='echo:administrator-activity';
export const administratorWorkViewClosed='echo:administrator-work-view-closed';
let viewer=null,latest=null,timer=null;
export const isAdministratorViewer=()=>new URLSearchParams(window.location.search).has('echoWorkView')||sessionStorage.getItem('echo-admin-work-view')==='1';
export const isAdministratorWorkViewOpen=()=>Boolean(viewer&&!viewer.closed);
export function openAdministratorWorkView(){
 if(isAdministratorViewer())return false;
 if(!viewer||viewer.closed)viewer=window.open('/admin/echo?tab=music-archive&echoWorkView=1','echo-administrator-work');
 else {
  // Closing live view restores the sidebar; explicitly opening it again resumes follow mode.
  try{if(viewer.sessionStorage.getItem('echo-admin-work-view')!=='1'){
   const url=new URL(viewer.location.href);url.searchParams.set('echoWorkView','1');viewer.location.assign(url.href);
  }}catch{}
  viewer.focus();
 }
 if(!viewer)return false;
 if(!timer)timer=setInterval(()=>{if(!viewer||viewer.closed){clearInterval(timer);timer=null;viewer=null;return;}if(latest)viewer.postMessage({type,payload:latest},window.location.origin);},600);
 return true;
}
export function publishAdministratorActivity(task){
 latest=task?{id:task._id,state:task.state,actions:(task.actions||[]).map(({id,name,state})=>({id,name,state})),updatedAt:task.updatedAt}:null;
 if(viewer&&!viewer.closed)viewer.postMessage({type,payload:latest},window.location.origin);
}
const archive={url:'/admin/echo?tab=music-archive',label:'Recordings'};
const elements={url:'/admin/echo?tab=work-elements',label:'Work Elements'};
export function administratorDestination(name=''){
 if(name.startsWith('music_vocabulary'))return elements;
 if(name.startsWith('music_collection'))return {...archive,label:'Collections'};
 if(name.startsWith('music_')||name.startsWith('player_playlist'))return archive;
 const routes=[[/^(customers?|customer_)/,'/admin/clients','Registered clients'],[/^(bookings?|booking_|confirmed_bookings)/,'/admin/services','Booking requests'],[/^transactions_/,'/admin/transactions','Transactions'],[/^(prices?_|equipment_|catalog_)/,'/admin/prices','Events, Services & Equipment'],[/^testimonial/,'/admin/echo?tab=testimonials','Testimonials'],[/^media_/,'/admin/echo?tab=gallery','Gallery'],[/^meetings_/,'/admin/echo?tab=meetings','Meetings'],[/^theme_/,'/admin/echo?tab=seasonal-theme','Seasonal theme'],[/^ai_configuration_/,'/admin/echo?tab=ai-configuration','AI configuration'],[/^live_archive_/,'/admin/echo?tab=live-archive','Live archive'],[/^events_/,'/admin/live-stream','Live stream']];
 const found=routes.find(([pattern])=>pattern.test(name));
 return found?{url:found[1],label:found[2]}:null;
}
export {type as administratorActivityType};
