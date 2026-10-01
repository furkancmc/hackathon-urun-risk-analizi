import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import trTR from 'antd/locale/tr_TR';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfigProvider locale={trTR}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);