import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:AdminLiveComments}=await server.ssrLoadModule('/src/components/AdminLiveComments.jsx');
test('comments panel renders offline and loading states without crashing',()=>{
 const offline=renderToStaticMarkup(createElement(AdminLiveComments,{token:'t',session:'',enabled:true}));
 assert.match(offline,/Comments appear when you go live/);assert.match(offline,/Offline/);assert.match(offline,/disabled/);
 const loading=renderToStaticMarkup(createElement(AdminLiveComments,{token:'t',session:'room-1',enabled:true}));
 assert.match(loading,/Loading comments/);assert.match(loading,/Write a comment to the room/);
});
