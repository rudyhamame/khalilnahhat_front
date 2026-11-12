import {createRoot} from 'react-dom/client';
import './components/adminWorkspace.css';
import OntologyArchiveAdmin from './echo/OntologyArchiveAdmin';
localStorage.setItem('khalil-auth-token','x');
const json=(body)=>Promise.resolve({ok:true,status:200,headers:new Headers({'content-type':'application/json'}),json:async()=>body,text:async()=>JSON.stringify(body),blob:async()=>new Blob()});
window.fetch=(url)=>json(String(url).includes('ontology')||String(url).includes('music-archive')?{recordings:[],items:[],vocabulary:[],workTypes:[],collections:[],songs:[],elements:[],presets:[]}:{});
createRoot(document.getElementById('root')).render(<div className="admin-workspace" data-theme="dark" style={{background:'#111',height:'100vh'}}><OntologyArchiveAdmin token="x"/></div>);
setTimeout(()=>{
 document.querySelector('.ontology-new-recording')?.click();
 setTimeout(()=>{
  const hits=[...document.querySelectorAll('*')].map(el=>{const r=el.getBoundingClientRect();return {el,r};}).filter(({r})=>r.top<6&&r.top>-6&&r.height<=6&&r.height>0&&r.width>100);
  document.title='HITS:'+hits.map(({el,r})=>`${el.tagName}.${String(el.className).slice(0,60)}[${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}]`).join(' | ')+' || editor:'+Boolean(document.querySelector('.ontology-editor-page'))+' bar:'+Boolean(document.querySelector('.ontology-page-bar'));
  const root=document.getElementById('root');root.dataset.done='1';
 },2500);
},2500);
