import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoucherOfferGate} from './bookingVoucher.js';
test('clearing an automatically offered voucher never adds it back',()=>{
 const gate=createVoucherOfferGate(),state={ready:true,token:'test',code:'',optOut:false};
 assert.equal(gate(state),true);assert.equal(gate({...state,code:'OFFER'}),false);assert.equal(gate(state),false);
});
test('an existing voucher, delayed account load and explicit opt-out are respected',()=>{
 const gate=createVoucherOfferGate(),state={ready:true,token:'test',code:'',optOut:false};
 assert.equal(gate({...state,ready:false}),false);assert.equal(gate({...state,optOut:true}),false);
 assert.equal(gate({...state,code:'EXISTING'}),false);assert.equal(gate(state),false);
});
