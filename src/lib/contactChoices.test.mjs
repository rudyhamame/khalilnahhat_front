import test from 'node:test';
import assert from 'node:assert/strict';
import {contactChoices,PHONE_CONTACTS} from './contactChoices.mjs';
test('contact methods follow what was entered in Personal info',()=>{
 assert.deepEqual(contactChoices({email:'',phone:''}).enabled,[]);
 assert.deepEqual(contactChoices({email:'a@b.co',phone:''}),{hasEmail:true,hasPhone:false,enabled:['email','meet-echo'],only:null});
 assert.deepEqual(contactChoices({email:'',phone:'4165550123'}).enabled,['phone','meet-echo']);
 assert.deepEqual(contactChoices({email:'a@b.co',phone:' 4165550123'}).enabled,['any','email','phone','meet-echo']);
 assert.equal(contactChoices({email:'a@b.co',phone:'1'}).only,null);
 assert.deepEqual(PHONE_CONTACTS,['whatsapp-text','whatsapp-call','sms','call']);
});
