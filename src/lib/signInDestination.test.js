import test from 'node:test';
import assert from 'node:assert/strict';
import {signInDestination} from './signInDestination.mjs';

test('after sign-in clients and admins land on the main page unless they asked for a local page',()=>{
 assert.equal(signInDestination({isAdmin:false},null),'/');
 assert.equal(signInDestination({isAdmin:true},null),'/');
 assert.equal(signInDestination({isAdmin:false},'/dashboard'),'/');
 assert.equal(signInDestination({isAdmin:true},'/admin/prices'),'/admin/prices');
 assert.equal(signInDestination({isAdmin:false},'/#availability'),'/#availability');
 assert.equal(signInDestination({isAdmin:true},'//evil.example'),'/');
});
