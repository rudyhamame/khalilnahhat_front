import {createLucideIcon} from 'lucide-react';

// The Echo Smart Cart icon: a cart with a sparkle. Used by the header menu and the floating button.
const SmartCartIcon=createLucideIcon('SmartCart',[
 ['path',{d:'M2 3h2l3 13h12l2-6H7',key:'cart'}],
 ['circle',{cx:'9',cy:'21',r:'1',key:'left-wheel'}],
 ['circle',{cx:'18',cy:'21',r:'1',key:'right-wheel'}],
 ['path',{d:'m16 1 1.1 3.9L21 6l-3.9 1.1L16 11l-1.1-3.9L11 6l3.9-1.1L16 1Z',key:'smart'}],
]);
export default SmartCartIcon;
