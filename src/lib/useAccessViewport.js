import {useLayoutEffect} from 'react';
import {installAccessViewport} from './accessViewport.js';

export function useAccessViewport(enabled=true){
 useLayoutEffect(()=>enabled?installAccessViewport():undefined,[enabled]);
}
