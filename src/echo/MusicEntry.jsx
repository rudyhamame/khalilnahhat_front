import './echo.css';
import {useEffect,useState} from 'react';
import {fetchCurrentUser} from '../lib/api';
import EchoShell from './EchoShell';
import {useLang} from './i18n';
import PublicSectionPage from './PublicSectionPage';

function readToken(){
  try{return JSON.parse(localStorage.getItem('khalil-auth-token')||'null')||'';}
  catch{return '';}
}

export default function MusicEntry(){
  const lang=useLang();
  const [user,setUser]=useState(null);
  const [ready,setReady]=useState(false);
  const token=readToken();
  useEffect(()=>{
    let active=true;
    if(!token){setReady(true);return()=>{active=false;};}
    fetchCurrentUser(token).then(result=>{
      if(active)setUser(result?.user||null);
    }).catch(()=>{}).finally(()=>{
      if(active)setReady(true);
    });
    return()=>{active=false;};
  },[token]);
  const logout=()=>{
    try{localStorage.removeItem('khalil-auth-token');}catch{/* Storage may be disabled. */}
    window.location.assign('/login');
  };
  return <EchoShell lang={lang} user={user} onLogout={logout}>
    <PublicSectionPage
      section="work"
      lang={lang}
      user={user}
      token={token}
      isSessionReady={ready}
      auth={{}}
    />
  </EchoShell>;
}
