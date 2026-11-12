import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:RecordingsListTable}=await server.ssrLoadModule('/src/echo/RecordingsListTable.jsx');

test('the table shows what the add / edit form saved (credits, language, tempo, key, genre, duration)',()=>{
 const vocabulary=[{id:'v1',kind:'artist',name:'Najwa Karam'},{id:'g1',kind:'genre',name:'House'},{id:'l1',kind:'language',name:'Arabic'},{id:'d1',kind:'dialect',name:'Lebanese'}];
 const recording={id:'r1',title:'Lshhad Hobak',recordingType:'REMIX',publicationStatus:'DRAFT',archivalStatus:'ACTIVE',releaseDate:'2026-11-06',durationSeconds:263,
  recordingCredits:{vocalists:[{artistId:'v1'}],musicians:[]},languages:{languageIds:['l1'],dialectIds:['d1']},musical:{bpms:[124],keys:['A minor'],genreIds:['g1'],rhythmIds:[]}};
 const html=renderToStaticMarkup(createElement(RecordingsListTable,{recordings:[recording],vocabulary,selectedId:null,onSelect(){},loading:false}));
 for(const text of ['Najwa Karam','House','Arabic','Lebanese','124','A minor','4:23'])assert.ok(html.includes(text),`missing ${text}`);
 assert.ok(!html.includes('Archive'));
 // several values go on separate lines
 const many=renderToStaticMarkup(createElement(RecordingsListTable,{recordings:[{...recording,id:'r3',musical:{bpms:[124,128],keys:['A minor','C major'],genreIds:['g1'],rhythmIds:[]}}],vocabulary,selectedId:null,onSelect(){},loading:false}));
 assert.ok(many.includes('<li>124</li><li>128</li>')&&many.includes('<li>A minor</li><li>C major</li>'));
 // nothing saved yet: honest placeholders, not invented values
 const empty=renderToStaticMarkup(createElement(RecordingsListTable,{recordings:[{id:'r2',title:'Empty',publicationStatus:'DRAFT',archivalStatus:'ACTIVE'}],vocabulary,selectedId:null,onSelect(){},loading:false}));
 assert.ok(empty.includes('Not specified'));assert.ok(!empty.includes('Najwa'));
});
