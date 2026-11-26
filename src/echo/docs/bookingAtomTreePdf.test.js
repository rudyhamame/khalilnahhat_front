import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingAtomTreeHtml} from './bookingAtomTreePdf.js';
import {ATOM_KEYS} from '../../lib/bookingAtoms.mjs';
test('the atom tree PDF lists every booking atom code and is black and white only',()=>{
 const html=bookingAtomTreeHtml();
 assert.ok(ATOM_KEYS.every(key=>html.includes(`<code>${key}</code>`)));
 assert.ok(!/#[0-9a-f]{3,6}\b(?<!#000)(?<!#fff)/i.test(html.replace(/#000|#fff/gi,'')));
});
