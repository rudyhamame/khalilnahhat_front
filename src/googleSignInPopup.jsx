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
 window.opener.postMessage({type:'echo:google-credential',state:request.state,...payload},request.origin);
}}/>:<p role="alert">Open Google sign-in from your Echo preview to continue.</p>);
