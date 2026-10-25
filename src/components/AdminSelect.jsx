import { memo, useCallback, useLayoutEffect, useRef } from 'react';

// React re-applies selected=true to controlled native options on every render.
// Leave the live picker alone when only background data/callbacks have changed.
function sameTree(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((child, index) => sameTree(child, right[index]));
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    if (left.$$typeof || right.$$typeof) return left.type === right.type && left.key === right.key && sameTree(left.props, right.props);
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && sameTree(left[key], right[key]));
  }
  return false;
}
const NativeSelect = memo(function NativeSelect(props) {
  return <select {...props} />;
}, sameTree);

export default function AdminSelect({ onChange, ...props }) {
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const change = useCallback(event => onChangeRef.current?.(event), []);
  return <NativeSelect {...props} onChange={onChange ? change : undefined} />;
}
