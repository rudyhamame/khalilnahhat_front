import {createRoot} from 'react-dom/client';
import './components/adminWorkspace.css';
import LiveArchiveAdmin from './echo/LiveArchiveAdmin';
const mock=await (await fetch('/__archive_mock.json')).json();
const realFetch=window.fetch.bind(window);
const json=body=>Promise.resolve(new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}}));
window.fetch=(input,init)=>{
  const url=String(input?.url||input);
  if(url.includes('/admin/live-recordings')){
    const m=url.match(/live-recordings\/([^/?]+)\/(preview|comments)/);
    if(!m)return json({items:mock.items});
    if(m[2]==='comments')return json({items:[],approximate:false});
    return json({url:mock.urls[m[1]],expiresIn:3600});
  }
  return realFetch(input,init);
};
createRoot(document.getElementById('root')).render(<div className="admin-workspace" style={{display:'block',height:'auto',padding:16,maxWidth:1250}}><LiveArchiveAdmin token="test-token"/></div>);
