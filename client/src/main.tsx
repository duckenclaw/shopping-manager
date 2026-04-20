import React from 'react';
import ReactDOM from 'react-dom/client';
import { init, miniApp } from '@telegram-apps/sdk';
import App from './App';
import './App.css';

async function bootstrap() {
  try {
    init();
    if (miniApp.mount.isAvailable()) {
      await miniApp.mount();
      if (miniApp.ready.isAvailable()) miniApp.ready();
    }
  } catch (err) {
    console.warn('[sdk] init/mount failed — running outside Telegram?', err);
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
