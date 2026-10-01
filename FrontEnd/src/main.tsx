import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { env } from '@/config/env';
import { queryClient } from '@/config/queryClient';
import { apiClient } from '@/lib/apiClient';

// Phase 1 smoke test — remove after confirming
console.log('env:', env);
console.log('queryClient:', queryClient);
console.log('apiClient:', apiClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);