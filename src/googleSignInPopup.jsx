import React from 'react';
import {createRoot} from 'react-dom/client';
import GoogleSignIn from './components/GoogleSignIn';
import {GOOGLE_SIGN_IN_ORIGIN,readGoogleBridgeRequest} from './lib/googleSignInBridge.mjs';
import './components/loginPage.css';
import './googleSignInPopup.css';

const request=readGoogleBridgeRequest(window.location.hash);
window.history.replaceState(null,'',window.location.pathname);
const valid=request&&window.location.origin===GOOGLE_SIGN_IN_ORIGIN&&window.opener;
document.documentElement.dir=request?.ar?'rtl':'ltr';
document.documentElement.lang=request?.ar?'ar':'en';
createRoot(document.getElementById('root')).render(valid?<GoogleSignIn ar={request.ar} challenge={request} onSignIn={payload=>{
 // The opener can be gone by now (the popup went through Google's own pages): say so instead of throwing.
 if(!window.opener){document.getElementById('root').textContent='The studio window was closed or lost. Close this window and start Google sign-in again.';return;}
 window.opener.postMessage({type:'echo:google-credential',state:request.state,...payload},request.origin);
}}/>:<p role="alert">Open Google sign-in from your Echo preview to continue.</p>);
