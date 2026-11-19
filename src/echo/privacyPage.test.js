import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
after(()=>server.close());
const {default:PrivacyPage}=await server.ssrLoadModule('/src/echo/PrivacyPage.jsx');

test('the privacy policy covers Instagram and data deletion, in English and Arabic',()=>{
 const en=renderToStaticMarkup(createElement(PrivacyPage,{lang:{lang:'en'}}));
 for(const text of ['Privacy Policy','Instagram and Meta','Data deletion instructions','id="data-deletion"','mailto:'])assert.ok(en.includes(text),text);
 const ar=renderToStaticMarkup(createElement(PrivacyPage,{lang:{lang:'ar'}}));
 assert.ok(ar.includes('سياسة الخصوصية')&&ar.includes('dir="rtl"')&&ar.includes('id="data-deletion"'));
});
