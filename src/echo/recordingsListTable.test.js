import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:RecordingsListTable,RecordingDetails}=await server.ssrLoadModule('/src/echo/RecordingsListTable.jsx');

test('the grid lists recordings and the aside shows its own details (artist, collections, duration, release date, atoms)',()=>{
 const vocabulary=[{id:'v1',kind:'artist',name:'Najwa Karam'},{id:'g1',kind:'genre',name:'House'},{id:'l1',kind:'language',name:'Arabic'},{id:'d1',kind:'dialect',name:'Lebanese'}];
 const recording={id:'r1',name:'Lshhad Hobak',workType:'REMIX',status:'DRAFT',releaseDate:'2026-11-06',durationSeconds:263,
  atoms:[{id:'a1',name:'Atom',lyrics:{languages:[{languageId:'l1',dialectIds:['d1']}],vocalistCredits:[{artistId:'v1'}]},sound:{musicianCredits:[],bpms:[124],keys:['A minor'],genreIds:['g1'],rhythmIds:[]}}]};
 const collections=[{id:'c1',title:'Summer mixes',workTypeId:'REMIX',recordingIds:['r1']},{id:'c2',title:'Other',workTypeId:'REMIX',recordingIds:[]}];
 const grid=renderToStaticMarkup(createElement(RecordingsListTable,{recordings:[recording],selectedId:'r1',onSelect(){},loading:false}));
 assert.ok(grid.includes('Lshhad Hobak')&&grid.includes('Draft')&&grid.includes('4:23'));
 const html=renderToStaticMarkup(createElement(RecordingDetails,{recording,vocabulary,collections}));
 for(const text of ['4:23','Atom','Nov 6, 2026','Description','Work type','Stems','Recording atoms'])assert.ok(html.includes(text),`missing ${text}`);
 for(const text of ['Artist','Najwa Karam','Genre','Language','BPM','Key','124','A minor'])assert.ok(!html.includes(text),`should not show ${text}`);
 assert.ok(html.includes('Collections')&&html.includes('Summer mixes')&&!html.includes('Other'));
 // nothing saved yet: honest placeholders, not invented values
 const empty=renderToStaticMarkup(createElement(RecordingDetails,{recording:{id:'r2',name:'Empty',status:'DRAFT'},vocabulary}));
 assert.ok(empty.includes('Not specified'));
 assert.ok(renderToStaticMarkup(createElement(RecordingDetails,{recording:null})).includes('Select a recording'));
});
