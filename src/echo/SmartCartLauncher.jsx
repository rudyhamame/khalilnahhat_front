import {PUBLIC_PAGE_PATHS,publicPageSection} from '../lib/publicPages';
import SmartCartIcon from './SmartCartIcon';
import './smartCartLauncher.css';

// A round floating button that opens the Echo Smart Cart from every page (bottom left in English, bottom right in Arabic, like the production chat button).
export default function SmartCartLauncher({ar=false,path}){
 if(['assistant','room','simulation'].includes(publicPageSection(path)))return null; // already there, or the 3D room, which needs its corner
 const label=ar?'عربة إيكو الذكية':'Echo Smart Cart';
 return <a className="echo-cart-launch" dir={ar?'rtl':'ltr'} href={PUBLIC_PAGE_PATHS.assistant} aria-label={label} title={label}><SmartCartIcon size={22} strokeWidth={1.8} aria-hidden="true"/></a>;
}
