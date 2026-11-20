import {useState} from 'react';
import './skipLoginOption.css';

// "Next time, take me straight to the content": remembers (on this device) to skip the login page for a visitor who is not signed in.
export const SKIP_LOGIN_KEY='echo-skip-login';
export default function SkipLoginOption({tr}){
 const [on,setOn]=useState(()=>{try{return localStorage.getItem(SKIP_LOGIN_KEY)==='1';}catch{return false;}});
 const change=event=>{const next=event.target.checked;setOn(next);try{if(next)localStorage.setItem(SKIP_LOGIN_KEY,'1');else localStorage.removeItem(SKIP_LOGIN_KEY);}catch{/* storage unavailable: the choice just won't be remembered */}};
 return <label className="skip-login-option"><input type="checkbox" checked={on} onChange={change}/><span className="skip-login-box" aria-hidden="true"/><span>{tr('Next time, skip the login and take me straight to the content.','في المرة القادمة، تخطَّ تسجيل الدخول وخذني مباشرة إلى المحتوى.')}</span></label>;
}
