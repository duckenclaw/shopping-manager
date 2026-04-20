import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { init, miniApp } from '@telegram-apps/sdk';
import App from './App';
import './styles.css';

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

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

bootstrap();
