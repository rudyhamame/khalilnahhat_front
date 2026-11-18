import {test} from 'node:test';
import assert from 'node:assert/strict';
import {atomLanguageOptions,selectedAtomLanguages} from './atomLanguages.js';
const vocabulary=[{id:'ar',name:'Arabic',kind:'language'},{id:'en',name:'English',kind:'language'},{id:'eg',name:'Egyptian',kind:'dialect',parentId:'ar'},{id:'levant',name:'Levantine',kind:'dialect',parentId:'ar'},{id:'us',name:'American',kind:'dialect',parentId:'en'},{id:'orphan',name:'Unassigned',kind:'dialect'}];
test('combined choices save dialects under their own languages',()=>{
 const {rows}=atomLanguageOptions([],vocabulary);
 const ids=['Arabic · Egyptian','English · American','Arabic · Levantine'].map(name=>rows.find(row=>row.name===name).id);
 assert.deepEqual(selectedAtomLanguages(ids,rows),[{languageId:'ar',dialectIds:['eg','levant']},{languageId:'en',dialectIds:['us']}]);
 assert.equal(rows.some(row=>row.dialectId==='orphan'),false);
});
test('language without a dialect and removing a pair preserve the schema',()=>{
 const {rows,selected}=atomLanguageOptions([{languageId:'ar',dialectIds:['eg']},{languageId:'en',dialectIds:[]}],vocabulary);
 assert.deepEqual(selectedAtomLanguages(selected.slice(1),rows),[{languageId:'en',dialectIds:[]}]);
 assert.deepEqual(selectedAtomLanguages([],rows),[]);
});
test('existing unavailable vocabulary round trips without reassigning dialects',()=>{
 const input=[{languageId:'old-language',dialectIds:['missing-dialect']}];
 const {rows,selected}=atomLanguageOptions(input,vocabulary);
 assert.deepEqual(selectedAtomLanguages(selected,rows),input);
});
test('language and its dialect produce a single language entry',()=>{
 const {rows}=atomLanguageOptions([],vocabulary);
 assert.deepEqual(selectedAtomLanguages(rows.filter(row=>row.languageId==='ar'&&row.dialectId!=='levant').map(row=>row.id),rows),[{languageId:'ar',dialectIds:['eg']}]);
});
