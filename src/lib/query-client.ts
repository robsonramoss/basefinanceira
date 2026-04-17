import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 segundos - suficiente pra cache rápido mas permite refresh
      gcTime: 1000 * 60 * 10, // 10 minutos
      refetchOnWindowFocus: false, // Voltando para a aba não precisa recarregar tudo
      refetchOnReconnect: false, 
      retry: 1, 
      retryDelay: 1000, 
      networkMode: 'offlineFirst', 
      structuralSharing: true,
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});
