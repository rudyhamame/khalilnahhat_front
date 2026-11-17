import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
after(()=>server.close());
const {default:EchoChatMessage}=await server.ssrLoadModule('/src/echo/EchoChatMessage.jsx');
const render=content=>renderToStaticMarkup(createElement(EchoChatMessage,{message:{role:'assistant',content}}));
test('equipment and quantities in a markdown table render as a real table, with the question after it',()=>{
 const html=render('Your draft is updated.\n\n| Item | Qty |\n| --- | --- |\n| Lectern | 1 |\n| Uplights | 8 |\n\nWhat is the setup time?');
 assert.match(html,/<table class="echo-message-table"><thead><tr><th scope="col">Item<\/th><th scope="col">Qty<\/th>/);
 assert.equal((html.match(/<tr>/g)||[]).length,3);assert.match(html,/<td>Uplights<\/td><td>8<\/td>/);
 assert.ok(html.indexOf('Your draft is updated')<html.indexOf('<table')&&html.indexOf('<table')<html.indexOf('What is the setup time?'));
 assert.doesNotMatch(html,/---/);
});
test('plain replies and bullet lists are unchanged',()=>{
 assert.match(render('Hello there.'),/<p dir="auto">Hello there\.<\/p>/);
 assert.match(render('- one\n- two'),/<ul class="echo-message-list"><li>one<\/li><li>two<\/li><\/ul>/);
});
test('an attached file is shown by its name as a link; only https links are linked',()=>{
 const html=render('Added to your Inspiration photos: [stage.jpg](https://res.cloudinary.com/x/stage.jpg)');
 assert.match(html,/<a href="https:\/\/res\.cloudinary\.com\/x\/stage\.jpg" target="_blank" rel="noopener noreferrer">stage\.jpg<\/a>/);
 assert.doesNotMatch(render('[evil](javascript:alert(1))'),/<a /);
});
