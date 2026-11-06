// Offer the public voucher once per draft. Clearing it through AI or the form
// must not cause an announcement effect to silently add it again.
export function createVoucherOfferGate(){
 let checked=false;
 return ({ready,token,code,optOut})=>{
  if(!ready||!token||optOut)return false;
  if(code){checked=true;return false;}
  if(checked)return false;
  checked=true;return true;
 };
}
