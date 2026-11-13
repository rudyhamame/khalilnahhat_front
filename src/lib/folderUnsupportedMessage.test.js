import test from 'node:test';import assert from 'node:assert/strict';
import {folderUnsupportedMessage} from './diskRecordingStore.js';
test('the missing folder picker is explained for Brave, insecure pages and other browsers',()=>{
  assert.match(folderUnsupportedMessage({brave:{}},true),/brave:\/\/flags\/#file-system-access-api/);
  assert.match(folderUnsupportedMessage({},false),/https/);
  assert.match(folderUnsupportedMessage({},true),/Chrome or Edge/);
});
