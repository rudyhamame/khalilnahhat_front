// "How should we reach you?": what can be chosen depends on what the client entered in Personal info.
export const PHONE_CONTACTS=['whatsapp-text','whatsapp-call','sms','call'];
export function contactChoices({email,phone}){
 const hasEmail=Boolean(String(email||'').trim()),hasPhone=Boolean(String(phone||'').trim());
 // Nothing entered: nothing can be chosen yet. Email only: "Email only". Phone only: "Phone only". Both: Any (email or phone), Email only or Phone only.
 const enabled=hasEmail&&hasPhone?['any','email','phone']:hasEmail?['email']:hasPhone?['phone']:[];
 return {hasEmail,hasPhone,enabled,only:enabled.length===1?enabled[0]:null};
}
