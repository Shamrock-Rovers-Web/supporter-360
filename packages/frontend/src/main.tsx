import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default
      gcTime: 1000 * 60 * 10, // 10 minutes cache time
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        const err = error as { response?: { status: number } };
        if (err.response?.status && err.response.status >= 400 && err.response.status < 500) {
          return false;
        }
        // Retry up to 2 times for 5xx errors and network issues
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      refetchOnMount: false, // Don't refetch if data is fresh
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
