export function bookingsServiceStatus(mailbox,error){
 if(error||!mailbox)return {state:'unknown',label:'Unavailable',detail:'Could not check bookings email configuration.'};
 const sending=mailbox.sendingConfigured??mailbox.configured;
 const receiving=mailbox.receivingConfigured??mailbox.configured;
 return {state:sending&&receiving?'ready':sending||receiving?'partial':'setup',label:sending&&receiving?'Configured':sending?'Sending only':receiving?'Receiving only':'Needs setup',detail:`Sending ${sending?'configured':'not configured'} · Inbox ${receiving?'configured':'not configured'}`};
}
export function noreplyServiceStatus(provider,error){
 if(error||!provider)return {state:'unknown',label:'Unavailable',detail:'Could not check notification email configuration.'};
 if(!provider.configured)return {state:'setup',label:'Needs setup',detail:'Notification email sending is not configured.'};
 if(provider.senderEmail?.trim().toLowerCase()!=='noreply@djkhalilnahhat.ca')return {state:'partial',label:'Different sender',detail:`Notifications currently send from ${provider.senderEmail||'an unspecified address'}.`};
 return {state:'ready',label:'Configured',detail:'Notification email sending is configured.'};
}
