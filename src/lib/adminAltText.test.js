import assert from 'node:assert';import {test} from 'node:test';
import {altForLabel,iconAltFor,norm,ALT} from './adminAltText.js';
test('admin alt text: known labels get a description in both languages, unknown ones none, icons get a label',()=>{
 assert.match(altForLabel('  Publish to Customer ',false),/quote to the client/i);
 assert.match(altForLabel('Publish to Customer',true),/[؀-ۿ]/);
 assert.equal(altForLabel('Totally unknown label'),'');
 assert.equal(iconAltFor('aw-icon-button ae-close-button'),'Close');
 assert.equal(iconAltFor('x-delete-icon',true),'حذف');
 assert.equal(iconAltFor('plain'),'');
 for(const [key,[en,ar]] of ALT)assert.ok(key===norm(key)&&en.length>10&&/[؀-ۿ]/.test(ar),`entry ${key} must be normalized, with English and Arabic text`);
});
