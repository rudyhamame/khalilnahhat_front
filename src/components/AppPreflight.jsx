import {useEffect} from 'react';
import {finishPreflight} from '../lib/preflightReadiness';

// The language choice is the entry screen; content is available immediately.
export default function AppPreflight({children}) {
 useEffect(()=>{finishPreflight();},[]);
 return children;
}
