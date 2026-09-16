import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'boxicons/css/boxicons.min.css';
import './styles/reset.css';
import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';
import './styles/responsive.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
