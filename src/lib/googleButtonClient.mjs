// GIS is a page-wide client. Share one challenge and initialization across React
// mounts, and route each button's response by Google's returned button state.
export function createGoogleButtonClient({loadConfig,loadGoogle,now=Date.now,createState=()=>crypto.randomUUID()}){
 let preparing=null,used=false;
 const listeners=new Map();
 const restart=()=>new Error('Please reload this page to restart Google sign-in.');
 return {
  async prepare(challenge){
   if(!preparing){
    preparing=(async()=>{
     const startedAt=now(),config=await loadConfig();
     if(!config.configured)return null;
     if(challenge&&config.clientId!==challenge.clientId)throw new Error('Google sign-in configuration does not match.');
     const nonce=challenge?.nonce||config.nonce,google=await loadGoogle(),expiresAt=startedAt+240000;
     google.initialize({client_id:config.clientId,nonce,auto_select:false,ux_mode:'popup',callback:result=>{
      const listener=listeners.get(result.state);
      if(used||now()>=expiresAt||!listener||!listener.enabled()||typeof result.credential!=='string'||!result.credential)return;
      used=true;
      return listener.receive({credential:result.credential,nonce});
     }});
     // The backend challenge lasts five minutes; stop displaying the button early.
     return {google,nonce,clientId:config.clientId,expiresAt};
    })().catch(error=>{preparing=null;throw error;});
   }
   const session=await preparing;
   if(session&&(used||now()>=session.expiresAt))throw restart();
   if(session&&challenge&&(challenge.nonce!==session.nonce||challenge.clientId!==session.clientId))throw restart();
   return session;
  },
  subscribe(receive,enabled=()=>true){
   const state=createState();listeners.set(state,{receive,enabled});
   return {state,unsubscribe:()=>listeners.delete(state)};
  },
 };
}
