import './styles/global.css';import './echo/echo.css';import './echo/eventOrder.css';import './echo/orderAsideUI.css';import './echo/compactBooking.css';
const aside=document.createElement('aside');aside.className='event-order-aside';aside.style.cssText='position:static;width:420px;height:auto';
aside.innerHTML='<div class="ai-booking-split"><div class="ai-booking-panel"><div class="ai-booking-surface"><header class="ai-booking-heading"><div class="ai-booking-side is-start"><button class="ai-booking-mode">Chat</button></div><div><span class="ai-booking-brand">Echo AI</span></div><div class="ai-booking-side is-end"><button class="ai-booking-mode">Voice</button></div></header></div></div></div>';
document.body.appendChild(aside);
