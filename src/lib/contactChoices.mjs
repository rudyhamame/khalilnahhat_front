import {fields} from './eventOrderCore.mjs';
export const CONTACT_METHODS=Object.freeze([...fields.find(field=>field.key==='customer.contactMethod').options]);
// "How should we reach you?": what can be chosen depends on what the client entered in Personal info.
export const PHONE_CONTACTS=['whatsapp-text','whatsapp-call','sms','call'];
export function contactChoices({email,phone}){
 const hasEmail=Boolean(String(email||'').trim()),hasPhone=Boolean(String(phone||'').trim());
 // Email and phone choices require their contact details; Meet Echo is also available once either is entered.
 const enabled=CONTACT_METHODS.filter(option=>option==='any'?hasEmail&&hasPhone:option==='email'?hasEmail:option==='phone'?hasPhone:option==='meet-echo'?hasEmail||hasPhone:false);
 return {hasEmail,hasPhone,enabled,only:enabled.length===1?enabled[0]:null};
}
