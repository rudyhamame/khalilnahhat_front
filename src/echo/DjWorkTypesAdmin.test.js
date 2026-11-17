import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
after(()=>server.close());
const {WorkTypeLibrary,WorkTypeEditor}=await server.ssrLoadModule('/src/echo/DjWorkTypesAdmin.jsx');
const row={id:'LIVE',name:'Stage moments',nameArabic:'لحظات المسرح',details:'A description from the administrator',detailsArabic:'وصف من الإدارة',artworkUrl:'',amount:'INDIVIDUAL',revision:1};
test('the library has searchable, keyboard-accessible work type buttons with language coverage',()=>{
 const html=renderToStaticMarkup(createElement(WorkTypeLibrary,{rows:[row],selectedId:row.id,loading:false,busy:false}));
 assert.match(html,/aria-label="Search work types"/);
 assert.match(html,/aria-current="true"/);
 assert.ok(html.includes(row.name));assert.ok(html.includes(row.nameArabic));
 assert.match(html,/English \+ Arabic/);assert.doesNotMatch(html,/<table/);
});
test('editor previews the selected language and stages artwork until saving',()=>{
 for(const language of ['en','ar']){
  const html=renderToStaticMarkup(createElement(WorkTypeEditor,{editor:{id:row.id,value:row},language,dirty:true,busy:false}));
  assert.match(html,/Music page preview/);
  assert.match(html,/Choose image/);assert.match(html,/Save work type/);
  assert.ok(html.includes(language==='ar'?row.detailsArabic:row.details));
  assert.match(html,new RegExp(`dir="${language==='ar'?'rtl':'ltr'}"`));
 }
});
test('unchanged editor disables saving and provides an explicit close action',()=>{
 const html=renderToStaticMarkup(createElement(WorkTypeEditor,{editor:{id:row.id,value:row},language:'en',dirty:false,busy:false}));
 assert.match(html,/<button type="submit" class="dwt-primary" disabled=""/);
 assert.match(html,/aria-label="Close work type editor"/);
 assert.match(html,/All changes saved/);
});
