import { useEffect, useState } from 'react';

const KEY = 'echo-quote-cart';

export function readCart() {
  try { return JSON.parse(window.localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

function write(cart) {
  try { window.localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event('echo-cart'));
}

export const setCartItem = (item, quantity) => {
  const cart = readCart();
  if (quantity > 0) cart[item.id] = { id: item.id, name: item.name, category: item.category, quantity, minQuantity: item.minQuantity || 1 };
  else delete cart[item.id];
  write(cart);
};
export const clearCart = () => write({});
export const restoreOrderCart = items => write(Object.fromEntries(items.map(item=>[item.id,{...item,minQuantity:1}])));

export function useCart() {
  const [cart, setCart] = useState(readCart);
  useEffect(() => {
    const sync = () => setCart(readCart());
    window.addEventListener('echo-cart', sync);
    return () => window.removeEventListener('echo-cart', sync);
  }, []);
  return cart;
}
