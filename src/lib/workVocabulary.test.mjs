import test from 'node:test';
import assert from 'node:assert/strict';
import {withLanguage,withDialect,languagesOf,dialectsOf} from './languagePairs.mjs';

test('a language is chosen first, then its dialects; the first language stays the main one',()=>{
 let pairs=withLanguage([],'Arabic',true);
 pairs=withLanguage(pairs,'English',true);
 assert.deepEqual(languagesOf(pairs),['Arabic','English']);
 pairs=withDialect(pairs,'Arabic','Syrian');pairs=withDialect(pairs,'Arabic','Lebanese');
 assert.deepEqual(dialectsOf(pairs,'Arabic'),['Syrian','Lebanese']);
 assert.deepEqual(languagesOf(pairs),['Arabic','English']);
 pairs=withDialect(withDialect(pairs,'Arabic','Syrian'),'Arabic','Lebanese'); // un-picking every dialect leaves the language itself
 assert.deepEqual(pairs.filter(pair=>pair.language==='Arabic'),[{language:'Arabic',dialect:''}]);
 assert.deepEqual(withLanguage(pairs,'Arabic',false).map(pair=>pair.language),['English']);
});

import {makeMain} from './languagePairs.mjs';
test('making a language the main one moves it first and keeps the others in order',()=>{
 const pairs=[{language:'Arabic',dialect:'Syrian'},{language:'English',dialect:''},{language:'French',dialect:''},{language:'English',dialect:'Canadian'}];
 assert.deepEqual(makeMain(pairs,'English').map(pair=>pair.language),['English','English','Arabic','French']);
 assert.deepEqual(languagesOf(makeMain(pairs,'French')),['French','Arabic','English']);
});
