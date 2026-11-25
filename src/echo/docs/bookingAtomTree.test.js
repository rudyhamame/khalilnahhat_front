import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ATOM_KEYS,fieldCode} from '../../lib/bookingAtoms.mjs';
import {fields} from '../../lib/eventOrderCore.mjs';
import {bookingAtomTree,filterAtomTree,supportingAtoms} from './bookingAtomTree.js';

test('tree has every numbered atom once in contract order, plus every supporting field and equipment',()=>{
 const atoms=bookingAtomTree.flatMap(step=>step.sections.flatMap(section=>section.atoms));
 assert.deepEqual(atoms.map(atom=>atom.key),ATOM_KEYS);
 for(const atom of atoms){assert.equal(atom.code,fieldCode(atom.key));assert.ok(atom.name);}
 assert.deepEqual(new Set([...atoms,...supportingAtoms].map(atom=>atom.key)),new Set([...fields.map(field=>field.key),'equipment']));
 assert.ok(supportingAtoms.every(atom=>!atom.code));
});
test('search finds atom keys, codes, parents and options while retaining ancestors',()=>{
 const voucher=filterAtomTree('voucherCode');assert.equal(voucher.steps[0].id,'additional');assert.equal(voucher.steps[0].sections[0].atoms[0].key,'additional.voucherCode');
 assert.equal(filterAtomTree('02.04').steps[0].sections[0].atoms.length,7);
 assert.ok(filterAtomTree('wedding').steps[0].sections[0].atoms.some(atom=>atom.key==='event.type'));
 assert.equal(filterAtomTree('latitude').support[0].key,'event.venue.latitude');
 assert.equal(filterAtomTree('equipment').support.at(-1).key,'equipment');
 assert.deepEqual(filterAtomTree('no-match-at-all'),{steps:[],support:[]});
});
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});after(()=>server.close());
const {default:Tree}=await server.ssrLoadModule('/src/echo/BookingAtomTree.jsx');
const {default:Admin}=await server.ssrLoadModule('/src/echo/EchoAdmin.jsx');
test('new Echo Docs tab renders the contract tree behind the existing admin gate',()=>{
 const props={search:'?tab=data-atom-tree',isSessionReady:true};
 assert.match(renderToStaticMarkup(createElement(Admin,props)),/Admin sign-in required/);
 assert.equal(renderToStaticMarkup(createElement(Admin,{...props,user:{isAdmin:true},isSessionReady:false})), '');
 const html=renderToStaticMarkup(createElement(Admin,{...props,user:{isAdmin:true,email:'admin@example.test'}}));
 assert.match(html,/data-area="data-atom-tree"/);assert.match(html,/Data Atoms Booking Tree/);
 for(const key of [...ATOM_KEYS,...supportingAtoms.map(atom=>atom.key)])assert.ok(html.includes(`>${key}</code>`),key);
 const standalone=renderToStaticMarkup(createElement(Tree));assert.match(standalone,/Expand all/);assert.match(standalone,/Collapse all/);assert.match(standalone,/type="search"/);assert.match(standalone,/music.djRequested = true/);
});
