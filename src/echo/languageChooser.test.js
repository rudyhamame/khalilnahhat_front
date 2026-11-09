import {test} from 'node:test';
import assert from 'node:assert/strict';
import {keepLanguageChooserOpen} from './languageChooser.js';

function setup(hidden=false){
 const doc=Object.assign(new EventTarget(),{visibilityState:hidden?'hidden':'visible',defaultView:new EventTarget()});
 const dialog=Object.assign(new EventTarget(),{ownerDocument:doc,isConnected:true,open:false,opens:0,showModal(){this.open=true;this.opens++;},close(){this.open=false;this.dispatchEvent(new Event('close'));}});
 let observer;
 class Observer{constructor(callback){this.callback=callback;observer=this;}observe(){}disconnect(){this.disconnected=true;}}
 const dispose=keepLanguageChooserOpen(dialog,Observer);
 return{dialog,doc,observer,dispose};
}
test('entry chooser opens immediately and survives an unexpected close',()=>{
 const {dialog,dispose}=setup();assert.equal(dialog.open,true);
 dialog.close();assert.equal(dialog.open,true);assert.equal(dialog.opens,2);dispose();
});
test('removing the open attribute does not hide an unanswered chooser',()=>{
 const {dialog,observer,dispose}=setup();dialog.open=false;observer.callback();assert.equal(dialog.open,true);dispose();
});
test('Escape cannot dismiss the language choice',()=>{
 const {dialog,dispose}=setup();const event=new Event('cancel',{cancelable:true});dialog.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(dialog.open,true);dispose();
});
test('a background tab shows the chooser when the visitor returns',()=>{
 const {dialog,doc,dispose}=setup(true);assert.equal(dialog.open,false);
 doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(dialog.open,true);dispose();
});
test('choosing a language disposes the guard and leaves the dialog closed',()=>{
 const {dialog,doc,observer,dispose}=setup();dispose();assert.equal(dialog.open,false);assert.equal(observer.disconnected,true);
 dialog.dispatchEvent(new Event('close'));doc.defaultView.dispatchEvent(new Event('pageshow'));observer.callback();assert.equal(dialog.open,false);
});
