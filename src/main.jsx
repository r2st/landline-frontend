import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { queryClient } from './api/client';
import { AuthProvider } from './context/AuthContext';
import { ViewAsProvider } from './context/ViewAsContext';
import { PlatformProvider } from './context/PlatformContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PlatformProvider>
              <ViewAsProvider>
                <App />
                <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
              </ViewAsProvider>
            </PlatformProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
