import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({root:process.cwd(),cacheDir:'/tmp/khalil-genre-language-cache',server:{middlewareMode:true},appType:'custom'});
const {loadWorkVocabulary}=await server.ssrLoadModule('/src/lib/workVocabulary.js');
await server.close();

test('genre choices ignore legacy language links while dialect and vocalist links remain',async t=>{
 const originalFetch=globalThis.fetch;t.after(()=>{globalThis.fetch=originalFetch;});
 globalThis.fetch=async input=>{
  const url=new URL(String(input),'http://localhost');
  const items=url.searchParams.get('kind')==='genre'?[{id:'pop',name:'Pop',description:'Any language',languageIds:['en']}]:url.searchParams.get('kind')==='language'?[{id:'en',name:'English'}]:url.searchParams.get('kind')==='dialect'?[{id:'us',name:'American',parentId:'en',languageIds:['en']}]:url.searchParams.get('kind')==='artist'?[{id:'singer',name:'Singer',languageIds:['en'],dialectIds:['us']}]:[];
  return new Response(JSON.stringify({items}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const lists=await loadWorkVocabulary(true);
 assert.deepEqual(lists.genreCards,[{id:'pop',name:'Pop',description:'Any language'}]);
 assert.deepEqual(lists.genres,['Pop']);
 assert.ok(lists.dialects[0].languageIds.includes('en'));
 assert.deepEqual(lists.vocalists[0].languages,['English']);
 assert.deepEqual(lists.vocalists[0].dialects,['American']);
});
