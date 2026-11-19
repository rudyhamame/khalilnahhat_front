import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SmartCartLauncher from './echo/SmartCartLauncher';
import {prepareHeroHeadphoneFrames} from './echo/heroHeadphoneFrames';
import AdministratorWorkView from './echo/AdministratorWorkView';
import ArchiveFooter from './components/ArchiveFooter';
import SeasonalPlayerHost from './echo/SeasonalPlayerHost';
import {autoDirection} from './lib/autoDirection';
import {debugLayout} from './lib/debugLayout';
import 'boxicons/css/boxicons.min.css';
import './styles/reset.css';
import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';
import './styles/responsive.css';
import './components/adminWorkspace.css';
import './echo/navigation.css';
import { installSmoothResize } from './lib/smoothResize';
import { installNoAutofill } from './lib/noAutofill';
import { apiBaseUrl } from './lib/api';

// iPadOS can identify as a Mac when desktop browsing is enabled.
document.documentElement.classList.toggle('echo-ipad',
  /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

installSmoothResize();
installNoAutofill();

// One visit ping per browser session: recorded in Visit History (client if signed in, otherwise guest) and sent to admins as an optional phone alert.
try{if(!sessionStorage.getItem('echo-visit')){sessionStorage.setItem('echo-visit','1');let token='';try{token=JSON.parse(localStorage.getItem('khalil-auth-token')||'""')||'';}catch{}
fetch(`${apiBaseUrl}/visit`,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({path:location.pathname.slice(0,200),referrer:document.referrer.slice(0,300),lang:(navigator.language||'').slice(0,20)})}).catch(()=>{});}}catch{}

// A visitor with no saved sign-in (a guest) goes straight to the login page, before anything of the home page is built.
try{if(window.location.pathname==='/'&&!sessionStorage.getItem('echo-guest')&&!JSON.parse(localStorage.getItem('khalil-auth-token')||'null'))window.history.replaceState({},'','/login'+window.location.search+window.location.hash);}catch{}

// Start the complete intro sequence before mounting the homepage UI.
if(window.location.pathname==='/')void prepareHeroHeadphoneFrames();

autoDirection();
debugLayout();
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SeasonalPlayerHost>
    <div className="echo-page-surface" id="echo-page-surface"><App /></div>
    <SmartCartLauncher />
    <AdministratorWorkView />
    <ArchiveFooter />
    </SeasonalPlayerHost>
  </React.StrictMode>,
);
