import {Children,cloneElement,isValidElement} from 'react';
import ViewportFit from './ViewportFit';

export function fitViewport(section) {
  return cloneElement(section,{className:`${section.props.className||''} viewport-fit-section`},<ViewportFit>{section.props.children}</ViewportFit>);
}
export function fitHomepageViewports(tree) {
  return Children.map(tree.props.children,child=>isValidElement(child)&&child.type==='section'?fitViewport(child):child);
}
