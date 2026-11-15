import test from 'node:test';
import assert from 'node:assert/strict';
import {apiErrorMessage,retryAfterSeconds} from './apiErrorMessage.js';

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

test('Retry-After accepts seconds and HTTP dates without negative or invalid waits', () => {
  const now = Date.parse('2026-11-15T08:00:00Z');
  assert.equal(retryAfterSeconds('2859', now), 2859);
  assert.equal(retryAfterSeconds('Sun, 15 Nov 2026 09:00:00 GMT', now), 3600);
  for (const value of [null, '', 'invalid', '-5', 'Sun, 15 Nov 2026 07:00:00 GMT']) assert.equal(retryAfterSeconds(value, now), 0);
});
