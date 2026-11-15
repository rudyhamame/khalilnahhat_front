import test from 'node:test';
import assert from 'node:assert/strict';
import {apiErrorMessage} from './apiErrorMessage.js';

test('signup validation shows the rejected field requirements', () => {
  assert.equal(apiErrorMessage({message:'Sign up payload failed validation.',errors:{password:['Choose a password of at least 12 characters.'],phoneNumber:['Phone number is required.']}},'Request failed.'),
    'Choose a password of at least 12 characters. Phone number is required.');
});

test('preserves account and rate-limit errors', () => {
  assert.equal(apiErrorMessage({message:'That email address is already registered.'},'Request failed.'),'That email address is already registered.');
  assert.equal(apiErrorMessage({message:'Too many requests. Please wait before trying again.'},'Request failed.'),'Too many requests. Please wait before trying again.');
});

test('ignores empty or malformed field errors and uses the fallback', () => {
  for(const payload of [null,{}, {errors:[]}, {errors:{email:[null,''],phone:42}}]) {
    assert.equal(apiErrorMessage(payload,'Request failed.'),'Request failed.');
  }
});
