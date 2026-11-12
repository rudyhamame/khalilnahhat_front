import {createRoot} from 'react-dom/client';
import './styles/global.css';
import './components/adminWorkspace.css';
import AdminLiveStudio from './components/AdminLiveStudio';
const data=()=>({items:[],item:null,comments:[],requests:[],config:{}});
window.fetch=url=>Promise.resolve({ok:true,status:200,headers:new Headers({'content-type':'application/json'}),json:async()=>data(url),text:async()=>'{}'});
createRoot(document.getElementById('root')).render(<div className="admin-workspace" data-theme="dark" data-area="live-stream" style={{background:'#111',height:'100vh',display:'block'}}><div className="aw-content" style={{height:'100%',display:'flex'}}><div className="admin-grid" style={{display:'flex',flex:1,minHeight:0}}><AdminLiveStudio token="x" enabled liveStream={{isLive:true,title:'Billie Eilish',goal:'broadcast',broadcastSource:'browser',webrtcRoomName:'room1',pausePhoto:null}} onLiveStreamChange={()=>{}} onReviewLiveRequest={()=>{}}/></div></div></div>);
setTimeout(()=>{
 const out=[];
 for(const el of document.querySelectorAll('#admin-live-stream *')){
  const r=el.getBoundingClientRect(),c=getComputedStyle(el);
  if(r.width<180||r.height<60)continue;
  const radius=parseFloat(c.borderTopLeftRadius)||0,gap=parseFloat(c.rowGap)||0,bw=parseFloat(c.borderTopWidth)||0;
  if(radius>0||gap>0||bw>0||c.display==='grid'||c.display==='flex')out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0,2).join('.')} [${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}] r${radius} b${bw} g${gap} ${c.display} m${c.margin==='0px'?0:'x'} p${c.padding==='0px'?0:'x'}`);
 }
 document.title='STRUCT\n'+out.slice(0,60).join('\n');
},6000);
