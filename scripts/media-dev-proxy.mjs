export function mediaDevProxy(){
 return {
  target:'https://vps-ba7fb4cb.vps.ovh.ca',changeOrigin:true,
  configure(proxy){proxy.on('proxyReq',(outgoing,request)=>{
   const origin=request.headers.origin;
   if(origin===`http://${request.headers.host}`||origin===`https://${request.headers.host}`)outgoing.removeHeader('origin');
  });},
 };
}
